"use server"

import { createClient } from "@/lib/supabase/server"

// =============================================================================
// แผนการใส่ปุ๋ยตายตัวตามค่าวิเคราะห์ดิน (crop_fertilizer_plan)
//   ดินอยู่ช่วงไหน -> ดึงปริมาณปุ๋ยแต่ละสูตร แยกตามระยะ (ตามตารางกรมฯ)
//   ไม่ผ่าน solver — เป็น lookup ตรง ๆ
//
// การจับคู่ช่วง: ใช้ [min, max) — min รวม, max ไม่รวม — ให้ค่าดินตกลงช่องเดียวเสมอ
//   เช่น เกณฑ์ <2 / 2-3 / >3 : ค่า 2.0 -> "2-3", ค่า 3.0 -> ">3"
// =============================================================================

export type UseType = "straight" | "compound" | "organic70"

interface PlanDbRow {
  use_type: UseType
  om_min: number | null; om_max: number | null
  p_min: number | null;  p_max: number | null
  k_min: number | null;  k_max: number | null
  stage: string
  stage_order: number
  grade: string
  amount: number
  unit: string
}

export interface PlanStage {
  stage: string
  order: number
  items: { grade: string; amount: number; unit: string }[]
}

export interface FertilizerPlan {
  use_type: UseType
  unit: string
  stages: PlanStage[]
}

function inRange(v: number, min: number | null, max: number | null): boolean {
  if (min !== null && v < min) return false
  if (max !== null && v >= max) return false
  return true
}

export interface NutrientRange {
  min: number | null
  max: number | null
}

/**
 * ช่วงค่าดินที่ตารางของพืชนี้ใช้แบ่งระดับ (เช่น OM <2 / 2-3 / >3)
 * ใช้แสดงตาราง "ค่ามาตรฐานธาตุอาหาร" และจัดระดับ ต่ำ/ปานกลาง/สูง ให้ตรงกับตารางคำแนะนำ
 */
export async function getCropRanges(
  cropId: string
): Promise<{ om: NutrientRange[]; p: NutrientRange[]; k: NutrientRange[]; unit: string } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("crop_fertilizer_plan")
    .select("om_min, om_max, p_min, p_max, k_min, k_max, unit")
    .eq("crop_id", cropId)
  if (!data || data.length === 0) return null
  const rows = data as Pick<PlanDbRow, "om_min" | "om_max" | "p_min" | "p_max" | "k_min" | "k_max" | "unit">[]

  const uniq = (key: "om" | "p" | "k") => {
    const seen = new Map<string, NutrientRange>()
    for (const r of rows) {
      const min = r[`${key}_min`]
      const max = r[`${key}_max`]
      if (min === null && max === null) continue
      // ตารางต้นทางบางชีตเขียนช่วงเดียวกันต่างกันเล็กน้อย (เช่น K "50-100" กับ "51-100")
      // -> รวมช่วงที่มี max เดียวกัน เก็บ min ที่ต่ำกว่า
      const maxKey = String(max)
      const next = { min: min === null ? null : Number(min), max: max === null ? null : Number(max) }
      const prev = seen.get(maxKey)
      if (!prev || (next.min ?? -Infinity) < (prev.min ?? -Infinity)) seen.set(maxKey, next)
    }
    return [...seen.values()].sort((a, b) => (a.min ?? -Infinity) - (b.min ?? -Infinity))
  }
  return { om: uniq("om"), p: uniq("p"), k: uniq("k"), unit: rows[0].unit }
}

/** สูตรปุ๋ยทั้งหมดที่ตารางโหมดนั้นของพืชใช้ เช่น compound ของอ้อย -> ["16-16-8", "46-0-0", "0-0-60"] */
export async function getCropPlanGrades(cropId: string, useType: UseType): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("crop_fertilizer_plan")
    .select("grade")
    .eq("crop_id", cropId)
    .eq("use_type", useType)
  const set = new Set<string>()
  for (const r of data ?? []) {
    const g = (r as { grade: string }).grade
    if (/^\d+(\.\d+)?-\d+(\.\d+)?-\d+(\.\d+)?$/.test(g.trim())) set.add(g.trim())
  }
  return [...set]
}

/** โหมดที่พืชนี้มีตาราง (straight / compound) — ไว้ตัดสินใจว่าจะโชว์ปุ่มสลับโหมดไหม */
export async function getCropPlanUseTypes(cropId: string): Promise<UseType[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("crop_fertilizer_plan")
    .select("use_type")
    .eq("crop_id", cropId)
  const set = new Set<UseType>()
  for (const r of data ?? []) set.add((r as { use_type: UseType }).use_type)
  return (["straight", "compound", "organic70"] as const).filter((t) => set.has(t))
}

/**
 * ดึงแผนใส่ปุ๋ยของพืชตามค่าดิน (om/p/k) + โหมด
 * คืน null ถ้าพืชนี้ไม่มีตาราง; stages ว่างถ้าค่าดินไม่ครบ/ไม่ตรงช่วงใด
 */
export async function getFertilizerPlan(input: {
  crop_id: string
  om: number | null
  p: number | null
  k: number | null
  use_type?: UseType
}): Promise<FertilizerPlan | null> {
  const supabase = await createClient()
  const useType: UseType = input.use_type ?? "straight"

  const { data, error } = await supabase
    .from("crop_fertilizer_plan")
    .select(
      "use_type, om_min, om_max, p_min, p_max, k_min, k_max, stage, stage_order, grade, amount, unit"
    )
    .eq("crop_id", input.crop_id)
    .eq("use_type", useType)
    .order("stage_order", { ascending: true })
  if (error) throw new Error(`getFertilizerPlan: ${error.message}`)
  if (!data || data.length === 0) return null

  const rows = data as PlanDbRow[]
  const unit = rows[0].unit

  // ต้องมีค่าดินครบทั้ง 3 ถึงจะจับช่วงได้ (ตารางแยกช่องด้วย OM×P×K)
  if (input.om === null || input.p === null || input.k === null) {
    return { use_type: useType, unit, stages: [] }
  }

  const matched = rows.filter(
    (r) =>
      inRange(input.om!, r.om_min, r.om_max) &&
      inRange(input.p!, r.p_min, r.p_max) &&
      inRange(input.k!, r.k_min, r.k_max)
  )

  // จัดกลุ่มตามระยะ เรียงตาม stage_order
  const byStage = new Map<string, PlanStage>()
  for (const r of matched) {
    let s = byStage.get(r.stage)
    if (!s) {
      s = { stage: r.stage, order: r.stage_order, items: [] }
      byStage.set(r.stage, s)
    }
    s.items.push({ grade: r.grade, amount: r.amount, unit: r.unit })
  }
  const stages = [...byStage.values()].sort((a, b) => a.order - b.order)

  return { use_type: useType, unit, stages }
}
