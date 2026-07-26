// stageSplit.ts — แบ่งผล blend (ปริมาณปุ๋ยแต่ละสูตร) ออกเป็น "ปริมาณต่อระยะ"
//
// โหมด "ปุ๋ยผสม 100%" ของไม้ผล: ต่างจากตารางตายตัว (crop_fertilizer_plan)
//   เอาผล blend จากปุ๋ยที่ผู้ใช้เลือก (P มาก่อน — ดู blend.ts) มาคูณ "สัดส่วนการแบ่ง" ต่อระยะ
//   แต่ละสูตรใช้สัดส่วนของธาตุที่มันเป็น "แหล่งหลัก":
//     ปุ๋ย N (เช่น 46-0-0) -> n_frac, ปุ๋ย P (18-46-0) -> p_frac, ปุ๋ย K (0-0-60) -> k_frac
//   ตรงกับเครื่องคิดเลขในไฟล์กรมฯ (ชีต "การคำนวนใส่ปุ๋ยผสม 100%")
//
// สัดส่วนผูกกับ "พืช" ไม่ใช่สูตรปุ๋ย จึงใช้ได้กับปุ๋ยสูตรใดก็ตามที่ผู้ใช้เลือก

import { compareGrade, type BlendResult, type Formula } from "./blend"

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
}

export interface StageSplitResult {
  stage_name: string
  stage_desc: string | null
  order: number
  items: StageSplitItem[]
}

// ธาตุหลักของปุ๋ย = ธาตุที่มี % สูงสุด (เสมอกัน/ไม่มีธาตุ -> ไล่ N > P > K)
function primaryNutrient(f: Pick<Formula, "n" | "p2o5" | "k2o">): "n" | "p" | "k" {
  if (f.n >= f.p2o5 && f.n >= f.k2o && f.n > 0) return "n"
  if (f.p2o5 >= f.k2o && f.p2o5 > 0) return "p"
  if (f.k2o > 0) return "k"
  return "n"
}

/**
 * แบ่งผล blend ออกตามระยะ ตามสัดส่วนของพืช
 * @param blend ผลจาก blendFertilizer (ปุ๋ยแต่ละสูตร + กก. — หน่วยเดียวกับ target เช่น กรัม/ต้น)
 * @param rows สัดส่วนการแบ่งของพืช (จาก crop_stage_split)
 * คืนเฉพาะระยะที่มีปุ๋ยต้องใส่ (> 0)
 */
export function splitBlendByStage(
  blend: BlendResult,
  rows: StageSplitRow[]
): StageSplitResult[] {
  const sorted = [...rows].sort((a, b) => a.stage_order - b.stage_order)
  return sorted
    .map((r) => {
      const items: StageSplitItem[] = blend.items
        .map((it) => {
          const nut = primaryNutrient(it.formula)
          const frac = nut === "n" ? r.n_frac : nut === "p" ? r.p_frac : r.k_frac
          return {
            grade: it.formula.grade ?? it.formula.name,
            name: it.formula.name,
            amount: it.kg * frac,
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
