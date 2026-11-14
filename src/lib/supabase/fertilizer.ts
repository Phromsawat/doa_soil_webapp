"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { bandIndex, bandLevel, bandsFromRows, type BandNutrient, type CropBands } from "@/lib/fertilizer/soilBands"
import type { SoilLevel } from "@/lib/soil/grid"

// =============================================================================
// FERTILIZER CALCULATION
// =============================================================================

export interface FertilizerResult {
  target_n: number | null
  target_p2o5: number | null
  target_k2o: number | null
  unit: string
  matched: {
    om: boolean
    p: boolean
    k: boolean
  }
  /** ระดับดินตามช่วงของพืชนี้ (null = ไม่มีค่า หรือพืชไม่มีช่วงให้เทียบ ใช้เกณฑ์ทั่วไปแทน) */
  levels: Record<BandNutrient, SoilLevel | null>
  notes: string[]
}

/**
 * ช่วงค่าดินของพืช (จากตารางการใช้ปุ๋ยตามค่าวิเคราะห์ดิน) — หน้ากรอกค่าใช้บอกระดับ ต่ำ/ปานกลาง/สูง
 * ตามเกณฑ์ของพืชที่เลือก ตั้งแต่ก่อนกดคำนวณ
 */
export async function getCropBands(cropId: string): Promise<CropBands | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fertilizer_recommendations")
    .select("om_min, om_max, p_min, p_max, k_min, k_max")
    .eq("crop_id", cropId)
    .eq("mode", "100%")
  if (error || !data?.length) return null
  return bandsFromRows(data)
}

export interface CropOption {
  id: string
  name: string
  crop_type_name: string
  /** รูปที่แอดมินอัปโหลด (null = ใช้ไอคอนเดิม) */
  image_url?: string | null
  crop_type_image_url?: string | null
}

/**
 * List all active crops, grouped by crop_type for UI dropdowns.
 */
export async function listCrops(): Promise<CropOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("crops")
    .select("id, name, image_url, crop_types(name, image_url)")
    .eq("is_active", true)
    .order("name")
  if (error) throw new Error(`listCrops: ${error.message}`)

  type CropTypeRef = { name: string; image_url: string | null }
  return (data ?? []).map((c: { id: string; name: string; image_url: string | null; crop_types: CropTypeRef | CropTypeRef[] | null }) => {
    const ct = Array.isArray(c.crop_types) ? c.crop_types[0] : c.crop_types
    return {
      id: c.id,
      name: c.name,
      crop_type_name: ct?.name ?? "",
      image_url: c.image_url,
      crop_type_image_url: ct?.image_url ?? null,
    }
  })
}

/**
 * Calculate fertilizer recommendation for given crop + nutrient values.
 *
 * Algorithm (per nutrient):
 *   1. For nutrient X (OM | P | K), query all recommendations of this crop where x_min/x_max not null
 *   2. Find the row whose range holds the value (bandIndex — ขอบตามเอกสาร ไม่มีช่องว่างระหว่างช่วง)
 *      → use its target N/P2O5/K2O
 *   3. Sum the matched targets across all 3 nutrients
 */
export async function calculateFertilizer(input: {
  crop_id: string
  om_value: number | null
  p_value: number | null
  k_value: number | null
  mode?: "100%" | "70%"
}): Promise<FertilizerResult> {
  const supabase = await createClient()
  const mode = input.mode ?? "100%"

  const { data: recs, error } = await supabase
    .from("fertilizer_recommendations")
    .select("*")
    .eq("crop_id", input.crop_id)
    .eq("mode", mode)
  if (error) throw new Error(`calculateFertilizer: ${error.message}`)
  if (!recs || recs.length === 0) {
    return {
      target_n: null,
      target_p2o5: null,
      target_k2o: null,
      unit: "g/tree/year",
      matched: { om: false, p: false, k: false },
      levels: { om: null, p: null, k: null },
      notes: ["ไม่พบข้อมูลคำแนะนำสำหรับพืชนี้"],
    }
  }

  type Rec = typeof recs[number]
  const bands = bandsFromRows(recs)
  const result: FertilizerResult = {
    target_n: null,
    target_p2o5: null,
    target_k2o: null,
    unit: recs[0].target_unit,
    matched: { om: false, p: false, k: false },
    levels: {
      om: bandLevel(bands.om, input.om_value),
      p: bandLevel(bands.p, input.p_value),
      k: bandLevel(bands.k, input.k_value),
    },
    notes: [],
  }

  // แถวคำแนะนำของช่วงที่ค่าดินตกอยู่ (ช่วงเดียวกับที่แผนใส่ปุ๋ยตามระยะใช้)
  const rowFor = (n: BandNutrient, value: number): Rec | undefined => {
    const i = bandIndex(bands[n], value)
    if (i === null) return undefined
    const b = bands[n][i]
    return recs.find((r: Rec) => toNum(r[`${n}_min`]) === b.min && toNum(r[`${n}_max`]) === b.max)
  }

  // OM lookup → contributes target_n
  if (input.om_value !== null) {
    const omRow = rowFor("om", input.om_value)
    if (omRow?.target_n !== undefined && omRow.target_n !== null) {
      result.target_n = (result.target_n ?? 0) + Number(omRow.target_n)
      result.matched.om = true
    } else {
      result.notes.push(`ไม่พบช่วงค่า OM=${input.om_value} ในตารางแนะนำ`)
    }
  }

  // P lookup → contributes target_p2o5
  if (input.p_value !== null) {
    const pRow = rowFor("p", input.p_value)
    if (pRow?.target_p2o5 !== undefined && pRow.target_p2o5 !== null) {
      result.target_p2o5 = (result.target_p2o5 ?? 0) + Number(pRow.target_p2o5)
      result.matched.p = true
    } else {
      result.notes.push(`ไม่พบช่วงค่า P=${input.p_value} ในตารางแนะนำ`)
    }
  }

  // K lookup → contributes target_k2o
  if (input.k_value !== null) {
    const kRow = rowFor("k", input.k_value)
    if (kRow?.target_k2o !== undefined && kRow.target_k2o !== null) {
      result.target_k2o = (result.target_k2o ?? 0) + Number(kRow.target_k2o)
      result.matched.k = true
    } else {
      result.notes.push(`ไม่พบช่วงค่า K=${input.k_value} ในตารางแนะนำ`)
    }
  }

  return result
}

const toNum = (v: number | string | null) => (v === null ? null : Number(v))

/**
 * Persist the computed recommendation to analysis_results.
 * Upserts (one result per analysis).
 */
export async function saveAnalysisResult(
  analysisId: string,
  recommendation: FertilizerResult,
  recommendationRowId?: string | null
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("analysis_results")
    .upsert(
      {
        analysis_id: analysisId,
        recommendation_id: recommendationRowId ?? null,
        recommended_n: recommendation.target_n,
        recommended_p2o5: recommendation.target_p2o5,
        recommended_k2o: recommendation.target_k2o,
        unit: recommendation.unit,
        fertilizer_plan: null,
      },
      { onConflict: "analysis_id" }
    )
  if (error) throw new Error(`saveAnalysisResult: ${error.message}`)
  revalidatePath("/history")
}

/**
 * Convenience: run calculation + save in one call (used after a manual-form analysis).
 */
export async function calculateAndSave(input: {
  analysis_id: string
  crop_id: string
  om_value: number | null
  p_value: number | null
  k_value: number | null
  mode?: "100%" | "70%"
}): Promise<FertilizerResult> {
  const rec = await calculateFertilizer({
    crop_id: input.crop_id,
    om_value: input.om_value,
    p_value: input.p_value,
    k_value: input.k_value,
    mode: input.mode,
  })
  await saveAnalysisResult(input.analysis_id, rec)
  return rec
}
