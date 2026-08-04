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

/**
 * Upload a soil-plate image to Storage and record metadata in analysis_images.
 * Path convention: {user_id}/{analysis_id}/{nutrient_code}.{ext}
 *
 * @param analysisId  the analysis row id
 * @param nutrientCode "OM" | "P" | "K"
 * @param file         the image file (passed as FormData from client)
 */
export async function uploadAnalysisImage(
  analysisId: string,
  nutrientCode: NutrientCode,
  formData: FormData
): Promise<AnalysisImage> {
  const file = formData.get("file") as File | null
  if (!file) throw new Error("uploadAnalysisImage: no file in formData")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Build path: {user_id}/{analysis_id}/{nutrient_code}.{ext}
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const storagePath = `${user.id}/${analysisId}/${nutrientCode}.${ext}`

  // Upload (upsert overwrites if user re-uploads)
  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    })
  if (uploadErr) throw new Error(`upload: ${uploadErr.message}`)

  // Get signed URL (private bucket — valid 1 year)
  const { data: signed, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365)
  if (signErr) console.warn(`signedUrl: ${signErr.message}`)

  // Insert/upsert metadata row
  const { data, error } = await supabase
    .from("analysis_images")
    .upsert(
      {
        analysis_id: analysisId,
        nutrient_code: nutrientCode,
        storage_path: storagePath,
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
 * Mark analysis as completed (call after all uploads / predictions done).
 */
export async function completeAnalysis(analysisId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("analyses")
    .update({ status: "completed" })
    .eq("id", analysisId)
    .eq("user_id", user.id)     // จำกัดเฉพาะของตัวเอง (RLS เปิดให้ admin แก้ได้ทุกแถว)
  if (error) throw new Error(`completeAnalysis: ${error.message}`)
  revalidatePath("/history")
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
  notes?: string | null
  blend_formula_ids?: string[]      // สูตรปุ๋ยที่เลือกไว้ตอนกรอกฟอร์ม (สูงสุด 3)
}) {
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
    latitude: null,
    longitude: null,
    notes: input.notes ?? null,
    blend_formula_ids: (input.blend_formula_ids ?? []).filter(Boolean).slice(0, 3),
  })
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
