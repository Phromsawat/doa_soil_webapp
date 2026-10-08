"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
  AnalysisInsert,
  AnalysisImage,
  NutrientCode,
} from "@/types/database"

// =============================================================================
// SERVER ACTIONS for analyses + images
// All actions require an authenticated user (anonymous counts as authenticated).
// =============================================================================

const STORAGE_BUCKET = "soil-images"

/**
 * Create a new analysis row for the current user.
 * Returns the new analysis id.
 */
export async function createAnalysis(input: Omit<AnalysisInsert, "user_id">) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("analyses")
    .insert({
      ...input,
      user_id: user.id,
    })
    .select("id")
    .single()

  if (error) throw new Error(`createAnalysis: ${error.message}`)
  revalidatePath("/history")
  return data.id as string
}

// รูปต้นฉบับส่งให้แบบจำลองทำนาย (≤ 12 MiB เท่า API) — สำเนาย่อ .jpg เก็บไว้แสดงผล (migration 041)
const ORIGINAL_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024
const NUTRIENTS: NutrientCode[] = ["OM", "P", "K"]

/** ตรวจว่าเป็นเจ้าของรายการ แล้วคืน uid + โฟลเดอร์ของรายการใน Storage */
async function ownAnalysisFolder(analysisId: string, nutrientCode: NutrientCode) {
  if (!NUTRIENTS.includes(nutrientCode)) throw new Error("ชนิดรูปไม่ถูกต้อง")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data: own } = await supabase
    .from("analyses")
    .select("id")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!own) throw new Error("ไม่พบรายการวิเคราะห์นี้")
  return { supabase, uid: user.id, base: `${user.id}/${analysisId}` }
}

/**
 * เตรียมอัปโหลดรูปของธาตุหนึ่ง: server กำหนด path เอง แล้วออก signed upload URL
 * ให้เบราว์เซอร์ส่งไฟล์ตรงเข้า Storage — ไม่ผ่าน Vercel ที่รับ body ได้แค่ 4.5 MB ต่อคำขอ
 *   original = ต้นฉบับสำหรับทำนาย, display = สำเนาย่อที่เก็บถาวร
 *
 * ชื่อไฟล์ใหม่ทุกครั้ง (มีรหัสเวลาต่อท้าย) ไม่เขียนทับ path เดิม: CDN ของ Supabase Storage
 * จำไฟล์เดิมไว้ ถ้าเขียนทับ ตอนทำนายจะดาวน์โหลดได้รูปเก่า (เจอจริงตอนเปลี่ยนรูปที่ไม่ผ่านการตรวจ)
 * ไฟล์ของรอบก่อนถูกลบใน finishAnalysisImageUpload
 */
export async function prepareAnalysisImageUpload(
  analysisId: string,
  nutrientCode: NutrientCode,
  file: { type: string; size: number }
) {
  const ext = ORIGINAL_TYPES[file.type]
  if (!ext) throw new Error("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP")
  if (!(file.size > 0) || file.size > MAX_ORIGINAL_BYTES) throw new Error("รูปต้องไม่เกิน 12 MB")

  const { supabase, base } = await ownAnalysisFolder(analysisId, nutrientCode)
  const version = Date.now().toString(36)
  const originalPath = `${base}/original/${nutrientCode}-${version}.${ext}`
  const displayPath = `${base}/${nutrientCode}-${version}.jpg`
  const bucket = supabase.storage.from(STORAGE_BUCKET)
  const [o, d] = await Promise.all([
    bucket.createSignedUploadUrl(originalPath),
    bucket.createSignedUploadUrl(displayPath),
  ])
  if (o.error || d.error) throw new Error(`เตรียมอัปโหลดไม่สำเร็จ: ${(o.error ?? d.error)!.message}`)
  return {
    original: { path: originalPath, token: o.data.token },
    display: { path: displayPath, token: d.data.token },
  }
}

/**
 * บันทึกรูปที่อัปโหลดเสร็จแล้วลง analysis_images (เรียกหลังเบราว์เซอร์ส่งไฟล์ทั้งสองขึ้น Storage)
 * path ต้องตรงกับที่ prepareAnalysisImageUpload กำหนด — ไม่รับ path อื่นจากเบราว์เซอร์
 */
export async function finishAnalysisImageUpload(
  analysisId: string,
  nutrientCode: NutrientCode,
  file: { originalPath: string; displayPath: string; size: number }
): Promise<AnalysisImage> {
  const { supabase, uid, base } = await ownAnalysisFolder(analysisId, nutrientCode)
  // ต้องเป็นรูปแบบที่ prepareAnalysisImageUpload ออกให้ — {base}/original/OM-<ver>.<ext> และ {base}/OM-<ver>.jpg
  const m = file.originalPath.match(new RegExp(`^${base}/original/${nutrientCode}-([a-z0-9]+)\\.(jpg|png|webp)$`))
  if (!m || file.displayPath !== `${base}/${nutrientCode}-${m[1]}.jpg`) throw new Error("path ของรูปไม่ถูกต้อง")

  // ไฟล์ของรอบก่อน (เปลี่ยนรูป / รายการเก่าก่อน 041) — ลบไฟล์ที่จะไม่ถูกใช้แล้ว
  const { data: prev } = await supabase
    .from("analysis_images")
    .select("storage_path, original_path")
    .eq("analysis_id", analysisId)
    .eq("nutrient_code", nutrientCode)
    .maybeSingle()
  const stale = [prev?.storage_path, prev?.original_path].filter(
    (x): x is string => !!x && x !== file.displayPath && x !== file.originalPath && x.startsWith(`${uid}/`)
  )
  if (stale.length) await supabase.storage.from(STORAGE_BUCKET).remove(stale)

  // Get signed URL (private bucket — valid 1 year)
  const { data: signed, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(file.displayPath, 60 * 60 * 24 * 365)
  if (signErr) console.warn(`signedUrl: ${signErr.message}`)

  const { data, error } = await supabase
    .from("analysis_images")
    .upsert(
      {
        analysis_id: analysisId,
        nutrient_code: nutrientCode,
        storage_path: file.displayPath,
        original_path: file.originalPath,
        public_url: signed?.signedUrl ?? null,
        file_size_bytes: file.size,
      },
      { onConflict: "analysis_id,nutrient_code" }
    )
    .select()
    .single()

  if (error) throw new Error(`insert image row: ${error.message}`)
  return data as AnalysisImage
}

/**
 * ลบรูปของธาตุหนึ่งออกจากรายการ (ผู้ใช้เอารูปออกก่อนกดทำนายใหม่ เช่นหลังรูปไม่ผ่านการตรวจ)
 * ไม่ลบ = รูปเก่ายังค้างอยู่ในรายการและหน้าผล แม้จะไม่ได้ส่งให้แบบจำลองแล้ว
 */
export async function removeAnalysisImage(analysisId: string, nutrientCode: NutrientCode) {
  const { supabase, uid } = await ownAnalysisFolder(analysisId, nutrientCode)

  const { data: img } = await supabase
    .from("analysis_images")
    .select("id, storage_path, original_path")
    .eq("analysis_id", analysisId)
    .eq("nutrient_code", nutrientCode)
    .maybeSingle()
  if (!img) return
  const files = [img.storage_path, img.original_path].filter((x): x is string => !!x && x.startsWith(`${uid}/`))
  if (files.length) await supabase.storage.from(STORAGE_BUCKET).remove(files)
  const { error } = await supabase.from("analysis_images").delete().eq("id", img.id)
  if (error) throw new Error(`removeAnalysisImage: ${error.message}`)
}

/**
 * Save manual-form data (no image upload).
 * Creates analysis row with all NPK + pH + OM values and returns the id.
 */
export async function saveManualAnalysis(input: {
  crop_id?: string | null
  om_value?: number | null
  p_value?: number | null
  k_value?: number | null
  ph_value?: number | null
  province?: string | null
  amphur?: string | null
  district?: string | null
  latitude?: number | null          // จุดที่ปักบนแผนที่ (ถ้าดึงค่าดินจากแผนที่)
  longitude?: number | null
  notes?: string | null
  blend_formula_ids?: string[]      // สูตรปุ๋ยที่เลือกไว้ตอนกรอกฟอร์ม (สูงสุด 3)
  plan_tab?: "chemical" | "organic70" // แถบแผนปุ๋ยที่เลือกอยู่ตอนกดบันทึก
  /** มาจากหน้าอัปโหลดรูป (/analyze/form?from=...) — บันทึกทับรายการนั้นแทนการสร้างรายการใหม่ */
  analysis_id?: string | null
}) {
  if (input.analysis_id) return updateImageAnalysis(input.analysis_id, input)
  return createAnalysis({
    crop_id: input.crop_id ?? null,
    input_mode: "manual_form",
    status: "completed",
    om_value: input.om_value ?? null,
    p_value: input.p_value ?? null,
    k_value: input.k_value ?? null,
    ph_value: input.ph_value ?? null,
    province: input.province ?? null,
    amphur: input.amphur ?? null,
    district: input.district ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    notes: input.notes ?? null,
    blend_formula_ids: (input.blend_formula_ids ?? []).filter(Boolean).slice(0, 3),
    // ส่งเฉพาะเมื่อไม่ใช่ค่าตั้งต้นของคอลัมน์ ('chemical')
    ...(input.plan_tab && input.plan_tab !== "chemical" ? { plan_tab: input.plan_tab } : {}),
  })
}

/**
 * บันทึกผลจากหน้าคำนวณลงรายการอัปโหลดรูปเดิม: พืช ค่าดิน (ผู้ใช้อาจแก้จากค่าที่ AI ทำนาย)
 * ปุ๋ยที่เลือก และหมายเหตุ — คงพื้นที่/พิกัด/รูป/ai_result ของรายการเดิมไว้
 */
async function updateImageAnalysis(
  analysisId: string,
  input: Parameters<typeof saveManualAnalysis>[0]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("analyses")
    .update({
      crop_id: input.crop_id ?? null,
      om_value: input.om_value ?? null,
      p_value: input.p_value ?? null,
      k_value: input.k_value ?? null,
      ph_value: input.ph_value ?? null,
      notes: input.notes ?? null,
      blend_formula_ids: (input.blend_formula_ids ?? []).filter(Boolean).slice(0, 3),
      plan_tab: input.plan_tab ?? "chemical",
      status: "completed",
    })
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .eq("input_mode", "image_upload")
    .select("id")
  if (error) throw new Error(`updateImageAnalysis: ${error.message}`)
  if (!data?.length) throw new Error("ไม่พบรายการวิเคราะห์ที่จะบันทึกทับ")
  revalidatePath("/history")
  return analysisId
}

/**
 * Fetch one of the current user's own analyses (with images).
 *
 * กรอง user_id ตรงนี้ด้วย ไม่พึ่ง RLS อย่างเดียว — policy "analyses: own read"
 * เปิดให้ admin อ่านได้ทุกแถว (auth.uid() = user_id OR is_admin()) ถ้าไม่กรอง
 * บัญชี admin จะเปิดผลของคนอื่นผ่านหน้าผู้ใช้ได้ ฝั่ง admin มี adminGetAnalysis แยกอยู่แล้ว
 */
export async function getAnalysis(analysisId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("analyses")
    .select("*, analysis_images(*), analysis_results(*)")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .single()
  if (error) throw new Error(`getAnalysis: ${error.message}`)
  return data
}

/**
 * List the current user's recent analyses.
 * กรอง user_id เสมอ (ดูเหตุผลใน getAnalysis) — หน้าประวัติต้องเห็นเฉพาะของตัวเอง
 * แม้บัญชีนั้นจะเป็น admin ก็ตาม
 */
export async function listMyAnalyses(limit = 20) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("analyses")
    .select("*, analysis_images(nutrient_code, public_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listMyAnalyses: ${error.message}`)
  return data
}
