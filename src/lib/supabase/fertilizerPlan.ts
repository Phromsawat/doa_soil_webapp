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

export type UseType = "straight" | "compound"

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
  items: { grade: string; amount: number }[]
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

/** โหมดที่พืชนี้มีตาราง (straight / compound) — ไว้ตัดสินใจว่าจะโชว์ปุ่มสลับโหมดไหม */
export async function getCropPlanUseTypes(cropId: string): Promise<UseType[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("crop_fertilizer_plan")
    .select("use_type")
    .eq("crop_id", cropId)
  const set = new Set<UseType>()
  for (const r of data ?? []) set.add((r as { use_type: UseType }).use_type)
  return (["straight", "compound"] as const).filter((t) => set.has(t))
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
    s.items.push({ grade: r.grade, amount: r.amount })
  }
  const stages = [...byStage.values()].sort((a, b) => a.order - b.order)

  return { use_type: useType, unit, stages }
}
