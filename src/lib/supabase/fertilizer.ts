"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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
  notes: string[]
}

export interface CropOption {
  id: string
  name: string
  crop_type_name: string
}

/**
 * List all active crops, grouped by crop_type for UI dropdowns.
 */
export async function listCrops(): Promise<CropOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("crops")
    .select("id, name, crop_types(name)")
    .eq("is_active", true)
    .order("name")
  if (error) throw new Error(`listCrops: ${error.message}`)

  return (data ?? []).map((c: { id: string; name: string; crop_types: { name: string } | { name: string }[] | null }) => ({
    id: c.id,
    name: c.name,
    crop_type_name: Array.isArray(c.crop_types) ? c.crop_types[0]?.name ?? "" : c.crop_types?.name ?? "",
  }))
}

/**
 * Calculate fertilizer recommendation for given crop + nutrient values.
 *
 * Algorithm (per nutrient):
 *   1. For nutrient X (OM | P | K), query all recommendations of this crop where x_min/x_max not null
 *   2. Find the row where x_min <= value <= x_max → use its target N/P2O5/K2O
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
      notes: ["ไม่พบข้อมูลคำแนะนำสำหรับพืชนี้"],
    }
  }

  type Rec = typeof recs[number]
  const result: FertilizerResult = {
    target_n: null,
    target_p2o5: null,
    target_k2o: null,
    unit: recs[0].target_unit,
    matched: { om: false, p: false, k: false },
    notes: [],
  }

  // OM lookup → contributes target_n
  if (input.om_value !== null) {
    const omRow = recs.find((r: Rec) => r.om_min !== null && r.om_max !== null && r.om_min <= input.om_value! && input.om_value! <= r.om_max)
    if (omRow?.target_n !== undefined && omRow.target_n !== null) {
      result.target_n = (result.target_n ?? 0) + Number(omRow.target_n)
      result.matched.om = true
    } else {
      result.notes.push(`ไม่พบช่วงค่า OM=${input.om_value} ในตารางแนะนำ`)
    }
  }

  // P lookup → contributes target_p2o5
  if (input.p_value !== null) {
    const pRow = recs.find((r: Rec) => r.p_min !== null && r.p_max !== null && r.p_min <= input.p_value! && input.p_value! <= r.p_max)
    if (pRow?.target_p2o5 !== undefined && pRow.target_p2o5 !== null) {
      result.target_p2o5 = (result.target_p2o5 ?? 0) + Number(pRow.target_p2o5)
      result.matched.p = true
    } else {
      result.notes.push(`ไม่พบช่วงค่า P=${input.p_value} ในตารางแนะนำ`)
    }
  }

  // K lookup → contributes target_k2o
  if (input.k_value !== null) {
    const kRow = recs.find((r: Rec) => r.k_min !== null && r.k_max !== null && r.k_min <= input.k_value! && input.k_value! <= r.k_max)
    if (kRow?.target_k2o !== undefined && kRow.target_k2o !== null) {
      result.target_k2o = (result.target_k2o ?? 0) + Number(kRow.target_k2o)
      result.matched.k = true
    } else {
      result.notes.push(`ไม่พบช่วงค่า K=${input.k_value} ในตารางแนะนำ`)
    }
  }

  return result
}

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
