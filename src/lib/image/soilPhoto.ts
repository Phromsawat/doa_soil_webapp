// อัปโหลดรูปแผ่นทดสอบหนึ่งธาตุ (ใช้ฝั่งเบราว์เซอร์เท่านั้น)
//
// - ต้นฉบับ (≤ 12 MB เท่าขีดจำกัดของ API แบบจำลอง) ส่งให้แบบจำลองทำนายโดยไม่แตะไฟล์
//   เพราะแบบจำลองอ่านค่าจากสี — การย่อ/บีบอัดใหม่ในเบราว์เซอร์แปลงสีได้ ผลจะไม่ตรงกับเว็บทำนายของทีม AI
// - สำเนาย่อ (ด้านยาวสุด 1280 px, JPEG 85%) เก็บถาวรไว้แสดงในประวัติ/หน้าแอดมิน
//   ต้นฉบับถูกลบฝั่ง server เมื่อทำนายสำเร็จ (predictAnalysis)
// ทั้งสองไฟล์ส่งตรงเข้า Storage ด้วย signed upload URL ไม่ผ่าน Vercel (รับได้แค่ 4.5 MB ต่อคำขอ)

import { createClient } from "@/lib/supabase/client"
import { finishAnalysisImageUpload, prepareAnalysisImageUpload } from "@/lib/supabase/analyses"
import type { NutrientCode } from "@/types/database"

export const MAX_PHOTO_BYTES = 12 * 1024 * 1024
const DISPLAY_MAX_SIDE = 1280
const DISPLAY_QUALITY = 0.85
const BUCKET = "soil-images"

const TYPE_BY_EXT: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }

/** ชนิดไฟล์ — บางเบราว์เซอร์มือถือไม่ส่ง file.type มา จึงดูจากนามสกุลแทน */
export function photoType(file: File): string | null {
  const t = file.type || TYPE_BY_EXT[file.name.split(".").pop()?.toLowerCase() ?? ""] || ""
  return Object.values(TYPE_BY_EXT).includes(t) ? t : null
}

/** ข้อความเตือนถ้ารูปใช้ไม่ได้ (null = ใช้ได้) — ตรวจตั้งแต่ตอนเลือกรูป */
export function checkPhoto(file: File): string | null {
  if (!photoType(file)) return "รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP"
  if (file.size > MAX_PHOTO_BYTES) return `รูปนี้ใหญ่ ${(file.size / 1024 / 1024).toFixed(1)} MB — ต้องไม่เกิน 12 MB`
  return null
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("เปิดไฟล์รูปนี้ไม่ได้ — ใช้ไฟล์ JPG, PNG หรือ WebP")) }
    img.src = url
  })
}

/** สำเนาย่อสำหรับเก็บ — ไม่ขยายรูปที่เล็กอยู่แล้ว, PNG โปร่งใสได้พื้นขาว */
export async function makeDisplayCopy(file: File): Promise<Blob> {
  const img = await loadImage(file)
  const scale = Math.min(1, DISPLAY_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", DISPLAY_QUALITY))
  if (!blob) throw new Error("ย่อรูปไม่สำเร็จ")
  return blob
}

export async function uploadSoilPhoto(analysisId: string, code: NutrientCode, file: File): Promise<void> {
  const problem = checkPhoto(file)
  if (problem) throw new Error(problem)
  const type = photoType(file)!

  const display = await makeDisplayCopy(file)
  const t = await prepareAnalysisImageUpload(analysisId, code, { type, size: file.size })

  const bucket = createClient().storage.from(BUCKET)
  const [o, d] = await Promise.all([
    bucket.uploadToSignedUrl(t.original.path, t.original.token, file, { contentType: type }),
    bucket.uploadToSignedUrl(t.display.path, t.display.token, display, { contentType: "image/jpeg" }),
  ])
  const err = o.error ?? d.error
  if (err) throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${err.message}`)

  await finishAnalysisImageUpload(analysisId, code, {
    originalPath: t.original.path,
    displayPath: t.display.path,
    size: file.size,
  })
}
