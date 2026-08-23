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

// คีย์เรียงสูตรปุ๋ย: สูตรมาตรฐาน "N-P-K" มาก่อน เรียง N มาก→น้อย แล้ว P แล้ว K
// (46-0-0 → 18-46-0 → 0-0-60); สูตรที่ไม่ใช่รูปแบบนี้ (เช่น ปุ๋ยอินทรีย์) อยู่ท้ายสุด
function gradeKey(grade: string): [number, number, number, number] {
  const m = grade.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/)
  if (!m) return [1, 0, 0, 0]
  return [0, -Number(m[1]), -Number(m[2]), -Number(m[3])]
}
function cmpGradeKey(a: [number, number, number, number], b: [number, number, number, number]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}

/**
 * ดึงสัดส่วนการแบ่งใส่ปุ๋ยตามระยะ (crop_stage_split) ของพืช — ใช้กับโหมดปุ๋ยผสม 100% ไม้ผล
 * คืน [] ถ้าพืชนี้ไม่มีข้อมูลสัดส่วน
 */
export async function getCropStageSplit(cropId: string): Promise<
  {
    stage_order: number
    stage_name: string
    stage_desc: string | null
    unit: string | null
    n_frac: number
    p_frac: number
    k_frac: number
  }[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("crop_stage_split")
    .select("stage_order, stage_name, stage_desc, unit, n_frac, p_frac, k_frac")
    .eq("crop_id", cropId)
    .order("stage_order", { ascending: true })
  if (error) return []
  return data ?? []
}

/**
 * ดึงหมายเหตุการใส่ปุ๋ยของพืช (แสดงต่อจากขั้นที่ 8) — คืน null ถ้าไม่มี
 */
export async function getCropNote(
  cropId: string
): Promise<{ note: string; source: string | null } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("crops")
    .select("fertilizer_note, fertilizer_note_source")
    .eq("id", cropId)
    .maybeSingle()
  if (error || !data) return null
  const row = data as { fertilizer_note: string | null; fertilizer_note_source: string | null }
  if (!row.fertilizer_note) return null
  return { note: row.fertilizer_note, source: row.fertilizer_note_source ?? null }
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

  // เรียงสูตรในแต่ละระยะ: 46-0-0, 18-46-0, 0-0-60 (N มากก่อน → P → K) อินทรีย์/สูตรอื่นท้ายสุด
  for (const s of stages) s.items.sort((a, b) => cmpGradeKey(gradeKey(a.grade), gradeKey(b.grade)))

  return { use_type: useType, unit, stages }
}
