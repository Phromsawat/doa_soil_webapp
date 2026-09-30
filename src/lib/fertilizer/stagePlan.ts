// stagePlan.ts — คำนวณปริมาณปุ๋ย "รายระยะ" จากเป้าหมายธาตุอาหาร + สูตรปุ๋ยที่ผู้ใช้เลือก
//
// สูตรตามไฟล์ Excel "ตารางคำนวณปุ๋ยสำหรับ KM ไม้ผล" (กรมพัฒนาที่ดิน):
//   18-46-0 = P2O5 x 100/46
//   46-0-0  = (N - 18-46-0 x 0.18) x 100/46
//   0-0-60  = K2O x 100/60
//   แล้วแบ่งแต่ละระยะตามสัดส่วน (แถว "สัดส่วนของธาตุอาหาร N:P:K" ใน Excel)
//
// ขั้นตอน:
//   1) เป้าหมายธาตุอาหารทั้งปี/ฤดู (N, P2O5, K2O) จากตาราง fertilizer_recommendations
//   2) สัดส่วนแต่ละระยะ = ธาตุอาหารในระยะนั้นตามตารางกรมฯ / ธาตุอาหารรวมของตาราง
//   3) แต่ละระยะคำนวณปริมาณปุ๋ยจากสูตรที่เลือกด้วย blendFertilizer (P ก่อน -> หัก N ที่พ่วง -> N, K)
//   => ไม่ว่าจะเป็นแม่ปุ๋ย หรือคำนวณ 100% หรือสูตรที่ผู้ใช้เลือก ถ้าสูตรเดียวกันผลจะเท่ากันเสมอ
//   4) โหมด "ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์": ปุ๋ยอินทรีย์รับ N 30% ตาม %N ของปุ๋ยอินทรีย์ที่เลือก/กรอก
//      ปุ๋ยเคมีรับ N 70% + P2O5/K2O ที่เหลือหลังหักส่วนที่ได้จากปุ๋ยอินทรีย์

import { blendFertilizer, type Formula, type Nutrients } from "./blend"

export type FertMode = "chemical" | "organic"

export const FERT_MODE_LABEL: Record<FertMode, string> = {
  chemical: "ปุ๋ยเคมี",
  organic: "ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์",
}

/** สัดส่วน N ที่ให้ปุ๋ยอินทรีย์รับแทน (ตามตาราง 70% ปุ๋ยเคมี + ปุ๋ยอินทรีย์) */
export const ORGANIC_N_SHARE = 0.3

export interface TableStage {
  stage: string
  order: number
  items: { grade: string; amount: number; unit: string }[]
}

export interface OrganicInput {
  name: string
  n: number // %N
  p2o5: number // %P2O5
  k2o: number // %K2O
}

export interface PlanItem {
  grade: string
  name: string
  amount: number
}

export interface StageResult {
  stage: string
  order: number
  need: Nutrients // ธาตุอาหารที่ต้องการในระยะนี้ (หน่วยเดียวกับปุ๋ย เช่น กรัม)
  items: PlanItem[] // ปุ๋ยเคมี
  organicKg: number | null // ปุ๋ยอินทรีย์ (กก.) — เฉพาะโหมดอินทรีย์
  short: Nutrients // ส่วนที่ขาด (ค่าติดลบ) ถ้าสูตรที่เลือกให้ธาตุไม่ครบ
  notes: string[] // ข้อความจากตารางที่ไม่ใช่สูตรปุ๋ย เช่น ปุ๋ยชีวภาพ
}

export interface StagePlanResult {
  mode: FertMode
  unit: string // หน่วยของปุ๋ยเคมี เช่น "กรัม/ต้น" | "กก./ไร่"
  massUnit: "กรัม" | "กก."
  stages: StageResult[]
  total: PlanItem[]
  organicTotalKg: number | null
  need: Nutrients // ธาตุอาหารรวม (100%)
  organic: OrganicInput | null
  formulas: { name: string; grade: string | null }[] // สูตรที่ใช้คำนวณ
}

/** "46-0-0" -> {n:46,p2o5:0,k2o:0}; ไม่ใช่สูตรปุ๋ย -> null */
export function parseGrade(grade: string): Nutrients | null {
  const m = grade.trim().match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/)
  if (!m) return null
  return { n: +m[1], p2o5: +m[2], k2o: +m[3] }
}

const ZERO: Nutrients = { n: 0, p2o5: 0, k2o: 0 }
const add = (a: Nutrients, b: Nutrients): Nutrients => ({
  n: a.n + b.n,
  p2o5: a.p2o5 + b.p2o5,
  k2o: a.k2o + b.k2o,
})

/** ธาตุอาหารที่ได้จากปุ๋ยในตาราง (ต่อระยะ) */
export function stageNutrients(stage: TableStage): Nutrients {
  return stage.items.reduce<Nutrients>((acc, it) => {
    const g = parseGrade(it.grade)
    if (!g || !(it.amount > 0)) return acc
    return add(acc, {
      n: (g.n / 100) * it.amount,
      p2o5: (g.p2o5 / 100) * it.amount,
      k2o: (g.k2o / 100) * it.amount,
    })
  }, ZERO)
}

/** แม่ปุ๋ยมาตรฐาน 3 สูตรตามไฟล์ Excel — ค่าเริ่มต้นเมื่อผู้ใช้ไม่เลือกสูตรเอง */
export const DEFAULT_FORMULAS: Formula[] = [
  { id: "grade:46-0-0", name: "ยูเรีย", grade: "46-0-0", n: 46, p2o5: 0, k2o: 0 },
  { id: "grade:18-46-0", name: "ไดแอมโมเนียมฟอสเฟต (DAP)", grade: "18-46-0", n: 18, p2o5: 46, k2o: 0 },
  { id: "grade:0-0-60", name: "โพแทสเซียมคลอไรด์ (MOP)", grade: "0-0-60", n: 0, p2o5: 0, k2o: 60 },
]

/** สูตรปุ๋ยที่ใช้ในตาราง (เช่น สับปะรดใช้ 21-0-0 / 0-0-50) */
export function tableFormulas(stages: TableStage[]): Formula[] {
  const seen = new Map<string, Formula>()
  for (const s of stages)
    for (const it of s.items) {
      const g = parseGrade(it.grade)
      if (g && !seen.has(it.grade)) {
        const known = DEFAULT_FORMULAS.find((f) => f.grade === it.grade)
        seen.set(it.grade, { id: `grade:${it.grade}`, name: known?.name ?? it.grade, grade: it.grade, ...g })
      }
    }
  return [...seen.values()]
}

/** ปัดเศษให้อ่านง่าย: กรัม -> หลักสิบ, กก. -> ทศนิยม 1 ตำแหน่ง */
export function roundAmount(v: number, massUnit: "กรัม" | "กก."): number {
  if (massUnit === "กรัม") return Math.round(v / 10) * 10
  return Math.round(v * 10) / 10
}

/**
 * แบ่งเป้าหมายทั้งปีลงแต่ละระยะตามสัดส่วนธาตุอาหารในตารางกรมฯ
 * target = null -> ใช้ธาตุอาหารตามตารางตรง ๆ
 */
export function stageNeeds(stages: TableStage[], target: Nutrients | null): Nutrients[] {
  const per = stages.map(stageNutrients)
  if (!target) return per
  const sum = per.reduce(add, ZERO)
  const share = (key: keyof Nutrients, i: number) => {
    if (sum[key] > 0) return per[i][key] / sum[key]
    return i === 0 ? 1 : 0 // ตารางไม่มีธาตุนี้เลย -> ใส่ทั้งหมดในระยะแรก
  }
  return per.map((_, i) => ({
    n: target.n * share("n", i),
    p2o5: target.p2o5 * share("p2o5", i),
    k2o: target.k2o * share("k2o", i),
  }))
}

export function computeStagePlan(input: {
  stages: TableStage[] // ตาราง 100% ของกรมฯ (ใช้เป็นสัดส่วนแบ่งระยะ)
  target: Nutrients | null // เป้าหมายธาตุอาหารทั้งปี/ฤดู (null = ใช้ตามตาราง)
  formulas?: Formula[] // สูตรที่ผู้ใช้เลือก (ว่าง = สูตรตามตาราง/แม่ปุ๋ย 3 สูตร)
  mode: FertMode
  organic?: OrganicInput | null
}): StagePlanResult {
  const stages = [...input.stages].sort((a, b) => a.order - b.order)
  const allItems = stages.flatMap((s) => s.items)
  const unit = allItems.find((i) => parseGrade(i.grade))?.unit ?? allItems[0]?.unit ?? "กก./ไร่"
  const massUnit: "กรัม" | "กก." = unit.startsWith("กรัม") ? "กรัม" : "กก."
  const fromTable = tableFormulas(stages)
  const formulas =
    input.formulas && input.formulas.length > 0
      ? input.formulas
      : fromTable.length > 0
        ? fromTable
        : DEFAULT_FORMULAS
  const organic = input.mode === "organic" ? input.organic ?? null : null
  const needs = stageNeeds(stages, input.target)

  const totals = new Map<string, PlanItem>()
  let organicTotal = 0
  let needTotal = ZERO

  const results: StageResult[] = stages.map((s, idx) => {
    const need = needs[idx]
    needTotal = add(needTotal, need)
    const notes = s.items.filter((i) => i.grade && !parseGrade(i.grade)).map((i) => i.grade)

    // ---- ปุ๋ยอินทรีย์รับ N 30% ของระยะนี้
    let organicKg: number | null = null
    let chemNeed = need
    if (organic && organic.n > 0) {
      const orgN = need.n * ORGANIC_N_SHARE
      const orgMass = orgN / (organic.n / 100) // หน่วยเดียวกับปุ๋ยเคมี (กรัม หรือ กก.)
      organicKg = massUnit === "กรัม" ? orgMass / 1000 : orgMass
      chemNeed = {
        n: need.n - orgN,
        p2o5: Math.max(0, need.p2o5 - orgMass * (organic.p2o5 / 100)),
        k2o: Math.max(0, need.k2o - orgMass * (organic.k2o / 100)),
      }
      organicTotal += organicKg
    }

    const r = blendFertilizer(chemNeed, formulas)
    const items = r.items
      .map((it) => ({
        grade: it.formula.grade ?? it.formula.name,
        name: it.formula.name,
        amount: roundAmount(it.kg, massUnit),
      }))
      .filter((it) => it.amount > 0)
    for (const it of items) {
      const t = totals.get(it.grade) ?? { grade: it.grade, name: it.name, amount: 0 }
      t.amount = roundAmount(t.amount + it.amount, massUnit)
      totals.set(it.grade, t)
    }
    return {
      stage: s.stage,
      order: s.order,
      need,
      items,
      organicKg: organicKg == null ? null : Math.round(organicKg * 10) / 10,
      short: {
        n: Math.min(0, r.diff.n),
        p2o5: Math.min(0, r.diff.p2o5),
        k2o: Math.min(0, r.diff.k2o),
      },
      notes,
    }
  })

  return {
    mode: input.mode,
    unit,
    massUnit,
    stages: results,
    total: [...totals.values()],
    organicTotalKg: organic ? Math.round(organicTotal * 10) / 10 : null,
    need: needTotal,
    organic,
    formulas: formulas.map((f) => ({ name: f.name, grade: f.grade ?? null })),
  }
}

/** พืชที่ไม่มีตารางรายระยะ -> 1 ระยะ ("ตลอดฤดูปลูก") ใช้กับ computeStagePlan ได้เลย */
export function singleStage(unit: string): TableStage[] {
  return [{ stage: "ปริมาณปุ๋ยที่ต้องใช้ตลอดฤดูปลูก", order: 1, items: [{ grade: "", amount: 0, unit }] }]
}

/** แปลงหน่วยเป้าหมาย (จากฐานข้อมูล) เป็นภาษาไทย */
export function unitTh(unit: string): string {
  const u = unit.toLowerCase()
  if (u === "g/tree/year") return "กรัม/ต้น/ปี"
  if (u === "kg/rai") return "กก./ไร่"
  return unit
}

/** หน่วยปุ๋ยต่อพื้นที่จากหน่วยเป้าหมาย: "g/tree/year" -> "กรัม/ต้น", "kg/rai" -> "กก./ไร่" */
export function planUnitFromTarget(unit: string): string {
  return unit.toLowerCase().startsWith("g") ? "กรัม/ต้น" : "กก./ไร่"
}
