// stageSplit.ts — แบ่งผล blend (ปริมาณปุ๋ยแต่ละสูตร) ออกเป็น "ปริมาณต่อระยะ"
//
// โหมด "ปุ๋ยผสม 100%" ของไม้ผล: ต่างจากตารางตายตัว (crop_fertilizer_plan)
//   เอาผล blend จากปุ๋ยที่ผู้ใช้เลือก (P มาก่อน — ดู blend.ts) มาคูณ "สัดส่วนการแบ่ง" ต่อระยะ
//   แต่ละสูตรใช้สัดส่วนของธาตุที่มันเป็น "แหล่งหลัก":
//     ปุ๋ย N (เช่น 46-0-0) -> n_frac, ปุ๋ย P (18-46-0) -> p_frac, ปุ๋ย K (0-0-60) -> k_frac
//   ตรงกับเครื่องคิดเลขในไฟล์กรมฯ (ชีต "การคำนวนใส่ปุ๋ยผสม 100%")
//
// สัดส่วนผูกกับ "พืช" ไม่ใช่สูตรปุ๋ย จึงใช้ได้กับปุ๋ยสูตรใดก็ตามที่ผู้ใช้เลือก
// พืชที่ไม่มีสัดส่วนของตัวเอง (พืชไร่ ข้าว ผัก) ใช้สัดส่วนที่อ่านจากตารางกรมฯ แทน (splitRowsFromPlan)

import { compareGrade, type BlendResult, type Formula } from "./blend"
import type { FertilizerPlan } from "@/lib/supabase/fertilizerPlan"

export interface StageSplitRow {
  stage_order: number
  stage_name: string
  stage_desc: string | null
  unit: string | null
  n_frac: number
  p_frac: number
  k_frac: number
}

export interface StageSplitItem {
  grade: string // สูตร (เช่น 46-0-0) ไว้แสดง
  name: string
  amount: number
  /** %N ของปุ๋ยสูตรนี้ — ใช้หา N ที่ลดลงในแต่ละระยะ (แถบปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์) */
  n_pct: number
}

export interface StageSplitResult {
  stage_name: string
  stage_desc: string | null
  order: number
  items: StageSplitItem[]
}

// ธาตุหลักของปุ๋ย = ธาตุที่มี % สูงสุด (เสมอกัน/ไม่มีธาตุ -> ไล่ N > P > K)
// preferP: เสมอกันแล้วให้ P มาก่อน (15-15-15, 16-16-8 -> ปุ๋ย P) — ใช้กับการแบ่งตามตารางกรมฯ ของพืชไร่/ผัก
//   ซึ่งใส่ P รองพื้นครั้งเดียว ปุ๋ยสูตรเสมอจึงควรไปพร้อม P (ตารางปุ๋ยผสมของกรมฯ ใส่ 16-16-8 รองพื้นทั้งหมด)
function primaryNutrient(f: Pick<Formula, "n" | "p2o5" | "k2o">, preferP = false): "n" | "p" | "k" {
  if (preferP && f.p2o5 > 0 && f.p2o5 >= f.n && f.p2o5 >= f.k2o) return "p"
  if (f.n >= f.p2o5 && f.n >= f.k2o && f.n > 0) return "n"
  if (f.p2o5 >= f.k2o && f.p2o5 > 0) return "p"
  if (f.k2o > 0) return "k"
  return "n"
}

const NPK_GRADE = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/

// ตารางที่แต่ละแถวเป็น "ทางเลือก" ไม่ใช่ลำดับการใส่ (ถั่ว: ใช้ / ไม่ใช้ปุ๋ยชีวภาพไรโซเบียม)
const ALTERNATIVE_STAGE = /ไรโซเบียม/

// ระยะที่ใส่ปริมาณคงที่ ไม่ได้คิดจากอัตราแนะนำ (หน่อไม้ฝรั่ง: ระยะเก็บเกี่ยว 15-15-15 30 กก.
// ระยะย้ายพักต้น 46-0-0 25 กก. — ทุกช่วงดินเท่ากัน) ไม่เอามาแบ่งผลคำนวณ แสดงตามตารางเดิม
const FIXED_STAGE = /ระยะเก็บเกี่ยว|พักต้น/
export const isFixedStage = (stage: string) => FIXED_STAGE.test(stage)

/**
 * สัดส่วนแบ่งระยะจากตารางของกรมฯ — สำหรับพืชที่ไม่มี crop_stage_split (พืชไร่ ข้าว ผัก)
 * ใช้เมื่อผู้ใช้เลือกปุ๋ยสูตรที่ตารางกรมฯ ไม่มี: ปุ๋ยที่เลือกจะถูกแบ่งใส่ตามจังหวะเดียวกับตารางกรมฯ
 *   - ธาตุแต่ละตัวในแต่ละระยะ นับจากปุ๋ยในตารางที่มีธาตุนั้นเป็นธาตุหลัก
 *     (ปุ๋ย N ที่เลือกแบ่งตาม 46-0-0 ของกรมฯ, ปุ๋ย P ตาม 18-46-0, ปุ๋ย K ตาม 0-0-60)
 *     N ที่ติดมากับ 18-46-0 ไม่นับเป็นจังหวะของปุ๋ย N เพราะผู้ใช้ได้ N ส่วนนั้นจากปุ๋ย P ที่เลือกอยู่แล้ว
 *   - ปุ๋ยครบสูตร (มีทั้ง N P K เช่น 15-15-15) นับให้ทุกธาตุ
 *   - ธาตุที่ตารางไม่ได้ใส่เลย -> ใส่ทั้งหมดในระยะแรก
 * ตารางแบบทางเลือก (ถั่ว) แบ่งแบบนี้ไม่ได้ -> คืน [] (ใช้ตารางกรมฯ ตามเดิม)
 * ระยะปริมาณคงที่ (isFixedStage) ไม่นับ — ผู้เรียกต่อท้ายจากตารางเอง
 */
export function splitRowsFromPlan(plan: FertilizerPlan): StageSplitRow[] {
  if (plan.stages.length === 0 || plan.stages.some((s) => ALTERNATIVE_STAGE.test(s.stage))) return []
  const stages = plan.stages.filter((s) => !isFixedStage(s.stage))
  if (stages.length === 0) return []

  const perStage = stages.map((s) => {
    const sum = { n: 0, p: 0, k: 0 }
    for (const it of s.items) {
      const m = it.grade.match(NPK_GRADE)
      if (!m) continue // ปุ๋ยอินทรีย์ ฯลฯ
      const f = { n: Number(m[1]), p2o5: Number(m[2]), k2o: Number(m[3]) }
      const complete = f.n > 0 && f.p2o5 > 0 && f.k2o > 0
      const main = primaryNutrient(f)
      if (complete || main === "n") sum.n += (it.amount * f.n) / 100
      if (complete || main === "p") sum.p += (it.amount * f.p2o5) / 100
      if (complete || main === "k") sum.k += (it.amount * f.k2o) / 100
    }
    return sum
  })
  const total = perStage.reduce((t, s) => ({ n: t.n + s.n, p: t.p + s.p, k: t.k + s.k }), { n: 0, p: 0, k: 0 })
  const frac = (key: "n" | "p" | "k", i: number) =>
    total[key] > 0 ? perStage[i][key] / total[key] : i === 0 ? 1 : 0

  return stages.map((s, i) => ({
    stage_order: s.order,
    stage_name: s.stage,
    stage_desc: null,
    unit: plan.unit,
    n_frac: frac("n", i),
    p_frac: frac("p", i),
    k_frac: frac("k", i),
  }))
}

/**
 * แบ่งผล blend ออกตามระยะ ตามสัดส่วนของพืช
 * @param blend ผลจาก blendFertilizer (ปุ๋ยแต่ละสูตร + กก. — หน่วยเดียวกับ target เช่น กรัม/ต้น)
 * @param rows สัดส่วนการแบ่งของพืช (จาก crop_stage_split หรือ splitRowsFromPlan)
 * @param opts.preferP ปุ๋ยสูตรเสมอ (15-15-15) ไปพร้อมปุ๋ย P — ใช้กับสัดส่วนจาก splitRowsFromPlan
 * คืนเฉพาะระยะที่มีปุ๋ยต้องใส่ (> 0)
 */
export function splitBlendByStage(
  blend: BlendResult,
  rows: StageSplitRow[],
  opts: { preferP?: boolean } = {}
): StageSplitResult[] {
  const sorted = [...rows].sort((a, b) => a.stage_order - b.stage_order)
  return sorted
    .map((r) => {
      const items: StageSplitItem[] = blend.items
        .map((it) => {
          const nut = primaryNutrient(it.formula, opts.preferP)
          const frac = nut === "n" ? r.n_frac : nut === "p" ? r.p_frac : r.k_frac
          return {
            grade: it.formula.grade ?? it.formula.name,
            name: it.formula.name,
            amount: it.kg * frac,
            n_pct: it.formula.n,
          }
        })
        .filter((x) => x.amount > 1e-6)
        .sort((a, b) => compareGrade(a.grade, b.grade))
      return {
        stage_name: r.stage_name,
        stage_desc: r.stage_desc,
        order: r.stage_order,
        items,
      }
    })
    .filter((s) => s.items.length > 0)
}
