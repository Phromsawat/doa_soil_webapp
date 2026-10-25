"use server"

import { randomUUID } from "node:crypto"
import { createServiceClient } from "@/lib/supabase/service"
import { predictSoil, type ModelElement } from "@/lib/soilModel/client"
import type { PredictResult } from "@/lib/supabase/prediction"
import type { NutrientCode } from "@/types/database"

// =============================================================================
// ทำนายค่า OM/P/K จากภาพให้ผู้ที่ไม่ได้ล็อกอิน — ไม่สร้างบัญชี ไม่สร้างรายการวิเคราะห์ ไม่เก็บรูป
//   1. prepareGuestImageUpload: ออก signed upload URL ไปที่ guest/<key>/ (service role — ผู้ใช้ไม่มี session)
//      เบราว์เซอร์ส่งต้นฉบับตรงเข้า Storage เพราะ Vercel รับ body ได้แค่ 4.5 MB ต่อคำขอ
//   2. predictGuest: อ่านรูปเข้าหน่วยความจำ ลบไฟล์ทิ้งทันที แล้วจึงส่งให้แบบจำลอง
// ค่าที่ได้คืนให้เบราว์เซอร์อย่างเดียว (หน้าเว็บเก็บต่อใน sessionStorage — lib/analysis/guestSession.ts)
// ผู้ที่ล็อกอินใช้ predictAnalysis (prediction.ts) ซึ่งบันทึกผลลงประวัติ
// =============================================================================

const BUCKET = "soil-images"
const GUEST_ROOT = "guest"
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
const MAX_BYTES = 12 * 1024 * 1024
const NUTRIENTS: NutrientCode[] = ["OM", "P", "K"]
// ไฟล์ที่ค้าง (ปิดหน้าระหว่างอัปโหลด / เรียกทำนายไม่ถึง) — ลบทิ้งเมื่อเก่ากว่านี้
const STALE_MS = 60 * 60 * 1000

// key = <เวลาสร้างฐาน 36>-<uuid> — ใช้เวลาหาโฟลเดอร์ที่ค้างโดยไม่ต้องอ่าน metadata ทีละไฟล์
const KEY_RE = /^([a-z0-9]+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function storage() {
  return createServiceClient().storage.from(BUCKET)
}

const fail = (message: string): PredictResult => ({ ok: false, kind: "error", message })

/** ลบโฟลเดอร์ guest ที่ค้างเกิน STALE_MS (ไม่สำเร็จก็ไม่เป็นไร รอบหน้าลองใหม่) */
async function sweepStale(bucket: ReturnType<typeof storage>) {
  const { data: folders } = await bucket.list(GUEST_ROOT, { limit: 100 })
  const now = Date.now()
  const stale = (folders ?? []).filter((f) => {
    const m = f.name.match(KEY_RE)
    return m && now - parseInt(m[1], 36) > STALE_MS
  })
  for (const f of stale) {
    const { data: files } = await bucket.list(`${GUEST_ROOT}/${f.name}`)
    if (files?.length) await bucket.remove(files.map((x) => `${GUEST_ROOT}/${f.name}/${x.name}`))
  }
}

export async function prepareGuestImageUpload(files: Array<{ code: NutrientCode; type: string; size: number }>) {
  const codes = new Set(files.map((f) => f.code))
  if (files.length === 0 || codes.size !== files.length || ![...codes].every((c) => NUTRIENTS.includes(c))) {
    throw new Error("ชนิดรูปไม่ถูกต้อง")
  }
  for (const f of files) {
    if (!TYPES[f.type]) throw new Error("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP")
    if (!(f.size > 0) || f.size > MAX_BYTES) throw new Error("รูปต้องไม่เกิน 12 MB")
  }

  const bucket = storage()
  await sweepStale(bucket).catch((e) => console.error("guest: sweep", e))

  const key = `${Date.now().toString(36)}-${randomUUID()}`
  const uploads = await Promise.all(
    files.map(async (f) => {
      const path = `${GUEST_ROOT}/${key}/${f.code}.${TYPES[f.type]}`
      const { data, error } = await bucket.createSignedUploadUrl(path)
      if (error) throw new Error(`เตรียมอัปโหลดไม่สำเร็จ: ${error.message}`)
      return { code: f.code, path, token: data.token }
    })
  )
  return { key, uploads }
}

export async function predictGuest(key: string, paths: string[]): Promise<PredictResult> {
  if (!KEY_RE.test(key)) return fail("ไม่พบรูปที่อัปโหลด กรุณาลองใหม่")
  // รับเฉพาะ path ที่ prepareGuestImageUpload ออกให้ — guest/<key>/OM.jpg
  const pathRe = new RegExp(`^${GUEST_ROOT}/${key}/(OM|P|K)\\.(jpg|png|webp)$`)
  const bucket = storage()

  const images: Partial<Record<ModelElement, Blob>> = {}
  try {
    for (const path of paths) {
      const el = path.match(pathRe)?.[1] as ModelElement | undefined
      if (!el || images[el]) return fail("ไม่พบรูปที่อัปโหลด กรุณาลองใหม่")
      const { data: blob, error } = await bucket.download(path)
      if (error || !blob) {
        console.error("predictGuest: download", path, error?.message)
        return fail(`อ่านรูป ${el} ไม่สำเร็จ กรุณาลองใหม่`)
      }
      images[el] = blob
    }
  } finally {
    // อ่านเข้าหน่วยความจำแล้ว ไม่ต้องเก็บไฟล์ไว้อีก — ลบก่อนเรียกแบบจำลอง (ทำนายไม่ผ่านก็อัปโหลดใหม่)
    const valid = paths.filter((p) => pathRe.test(p))
    if (valid.length) {
      const { error } = await bucket.remove(valid)
      if (error) console.error("predictGuest: remove", error.message)
    }
  }
  if (Object.keys(images).length === 0) return fail("กรุณาเลือกรูปอย่างน้อย 1 รูป")

  // sample_id = key แบบสุ่ม (ไม่มีข้อมูลส่วนบุคคล) ใช้ไล่ log ร่วมกับทีม AI
  const outcome = await predictSoil(images, `guest-${key}`)
  if (!outcome.ok) {
    return {
      ok: false,
      kind: outcome.kind,
      element: outcome.kind === "rejected" ? outcome.element : undefined,
      message: outcome.message,
    }
  }
  const p = outcome.prediction
  return { ok: true, om_value: p.om_value, p_value: p.p_value, k_value: p.k_value, model_version: p.model_version }
}
