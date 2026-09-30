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
  const { error } = await supabase
    .from("analyses")
    .update({ status: "completed" })
    .eq("id", analysisId)
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
  latitude?: number | null
  longitude?: number | null
  notes?: string | null
  // ข้อมูลเกษตรกร/พื้นที่ปลูก (migration 014) — ใช้ในหน้าพิมพ์รายงาน
  farmer_name?: string | null
  farmer_phone?: string | null
  address?: string | null
  plot_name?: string | null
  fert_mode?: string | null
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
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    notes: input.notes ?? null,
    farmer_name: input.farmer_name ?? null,
    farmer_phone: input.farmer_phone ?? null,
    address: input.address ?? null,
    plot_name: input.plot_name ?? null,
    fert_mode: input.fert_mode ?? null,
  } as Omit<AnalysisInsert, "user_id">)
}

/**
 * เก็บผลคำนวณทั้งชุด (ธาตุอาหาร + แผนปุ๋ยรายระยะ + ข้อมูลเกษตรกร) ไว้ใน analysis_results.fertilizer_plan
 * เพื่อให้หน้าพิมพ์รายงาน / admin เปิดดูย้อนหลังได้ตรงกับที่ผู้ใช้เห็นตอนคำนวณ
 */
export async function saveReportData(input: {
  analysis_id: string
  recommended_n: number | null
  recommended_p2o5: number | null
  recommended_k2o: number | null
  unit: string
  report: unknown
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("analysis_results")
    .upsert(
      {
        analysis_id: input.analysis_id,
        recommended_n: input.recommended_n,
        recommended_p2o5: input.recommended_p2o5,
        recommended_k2o: input.recommended_k2o,
        unit: input.unit,
        fertilizer_plan: input.report,
      },
      { onConflict: "analysis_id" }
    )
  if (error) throw new Error(`saveReportData: ${error.message}`)
  revalidatePath("/history")
}

/**
 * Fetch a single analysis (with images) — only the owner can read it (RLS).
 */
export async function getAnalysis(analysisId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("analyses")
    .select("*, analysis_images(*), analysis_results(*)")
    .eq("id", analysisId)
    .single()
  if (error) throw new Error(`getAnalysis: ${error.message}`)
  return data
}

/**
 * List the current user's recent analyses.
 */
export async function listMyAnalyses(limit = 20) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("analyses")
    .select("*, analysis_images(nutrient_code, public_url)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listMyAnalyses: ${error.message}`)
  return data
}
