// chemicalPlan.ts — เลือกว่าแถบ "ปุ๋ยเคมี" ของแผนใส่ปุ๋ยตามระยะจะแสดงตารางไหน
//
// หน้าจอแสดง 2 แถบ: ปุ๋ยเคมี / ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์ (organic70 = ตารางตายตัวตรง ๆ)
// แถบ "ปุ๋ยเคมี" รวมข้อมูล 3 แหล่ง เลือกตามปุ๋ยที่ผู้ใช้เลือกไว้:
//   1. ทุกสูตรที่เลือกมีในตารางแม่ปุ๋ยของกรมฯ (หรือยังไม่ได้เลือก) → ตารางแม่ปุ๋ยตรง ๆ
//      ไม่คำนวณใหม่ เพราะผลคำนวณ (solver + สัดส่วนแบ่งระยะ) ปัดไม่ตรงกับตัวเลขในตารางกรมฯ
//      ทำให้ปุ๋ยสูตรเดียวกันได้ปริมาณไม่เท่ากัน
//   2. ทุกสูตรที่เลือกมีในตารางปุ๋ยผสมของกรมฯ (พืชไร่ เช่น 16-16-8) → ตารางปุ๋ยผสมตรง ๆ
//   3. มีสูตรที่ตารางกรมฯ ไม่มี (เช่น 40-0-0) → คำนวณจากปุ๋ยที่เลือก แล้วแบ่งตามระยะ
//      ไม้ผล: สัดส่วนของพืช (crop_stage_split) · พืชอื่น: จังหวะการใส่ในตารางกรมฯ (splitRowsFromPlan)
//   4. คำนวณไม่ได้ (ยังไม่มีผลคำนวณ / ตารางแบบทางเลือก เช่นถั่ว) → ตารางกรมฯ
//      ซึ่งอาจไม่มีบางสูตรที่ผู้ใช้เลือก → missingGrades ไว้ให้หน้าจอแจ้งผู้ใช้
// ใช้ร่วมกันทั้งหน้าจอ (FertilizerPlanTable) และรายงาน PDF ให้ได้ผลเดียวกันเสมอ

import type { FertilizerPlan, PlanStage } from "@/lib/supabase/fertilizerPlan"
import { blendFertilizer, type BlendResult } from "./blend"
import {
  isFixedStage,
  splitBlendByStage,
  splitRowsFromPlan,
  type StageSplitItem,
  type StageSplitResult,
  type StageSplitRow,
} from "./stageSplit"

export type PlanTab = "chemical" | "organic70"

export const PLAN_TABS: PlanTab[] = ["chemical", "organic70"]

export const PLAN_TAB_LABEL: Record<PlanTab, string> = {
  chemical: "ปุ๋ยเคมี",
  organic70: "ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์",
}

/** แปลงค่าจาก URL — รองรับลิงก์เก่าที่ยังส่ง straight/compound มา */
export function parsePlanTab(v: string | null | undefined): PlanTab | null {
  if (v === "organic70") return "organic70"
  if (v === "chemical" || v === "straight" || v === "compound") return "chemical"
  return null
}

export type ChemicalSource = "straight" | "compound" | "computed"

export interface ChemicalPlanChoice {
  source: ChemicalSource
  plan: FertilizerPlan
  /** สูตรที่ผู้ใช้เลือกแต่ไม่มีในตารางกรมฯ ที่แสดงอยู่ (ว่าง = ตารางตรงกับที่เลือก) */
  missingGrades: string[]
}

/** ข้อความแจ้งเมื่อตารางกรมฯ ไม่มีบางสูตรที่ผู้ใช้เลือก — ใช้ทั้งหน้าจอและรายงาน */
export function missingGradesNote(missing: string[]): string {
  return (
    `ตารางคำแนะนำของกรมฯ สำหรับพืชนี้ไม่มีสูตร ${missing.join(", ")} ที่เลือกไว้ ` +
    `จึงแสดงสูตรที่กรมฯ แนะนำแทน — ปริมาณของปุ๋ยที่เลือกดูได้ในหัวข้อ “ปริมาณปุ๋ยที่ต้องใช้”`
  )
}

/**
 * แผนปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์ที่ไม่มีปุ๋ยอินทรีย์ในทุกระยะ (เช่น ส้ม OM >3 กับ P <15)
 * ตารางของกรมฯ ใช้ปุ๋ยอินทรีย์แทนเฉพาะ 46-0-0 ส่วนที่ลดลง 30% — ช่วงดินที่คำแนะนำเต็มอัตราไม่ใช้ 46-0-0
 * จึงไม่มีอะไรให้แทน แจ้งไว้ไม่ให้ผู้ใช้สงสัยว่าทำไมแถบนี้ไม่มีปุ๋ยอินทรีย์ — ใช้ทั้งหน้าจอและรายงาน
 */
export function organicAbsentNote(plan: FertilizerPlan | null): string | null {
  if (!plan || plan.use_type !== "organic70" || plan.stages.length === 0) return null
  const hasOrganic = plan.stages.some((s) => s.items.some((it) => it.grade.includes("อินทรีย์")))
  return hasOrganic
    ? null
    : "ดินช่วงนี้ไม่ต้องใช้ปุ๋ยอินทรีย์ เพราะคำแนะนำเต็มอัตราไม่มีปุ๋ยยูเรีย (46-0-0) ส่วนที่ต้องลดแล้วใช้ปุ๋ยอินทรีย์แทน"
}

const hasStages = (p: FertilizerPlan | null): p is FertilizerPlan => !!p && p.stages.length > 0
const gradesOf = (p: FertilizerPlan) => new Set(p.stages.flatMap((s) => s.items.map((it) => it.grade)))

// สูตรที่เลือกและได้ใช้จริง (ปริมาณ > 0) — สูตรที่ดินช่วงนี้ไม่ต้องใช้ (เช่น 0-0-60 เมื่อ K สูง)
// ตารางย่อมไม่มี ไม่ควรทำให้หลุดไปคำนวณเอง
const used = (picked: string[], blend: BlendResult | null) =>
  blend ? picked.filter((g) => blend.items.some((it) => (it.formula.grade ?? it.formula.name) === g)) : picked

// ปริมาณที่คำนวณได้ ปัดเป็นจำนวนเต็มแบบ Excel (ปัดครึ่งขึ้น) เหมือนการ์ด "ปริมาณปุ๋ยที่ต้องใช้"
// และตารางในไฟล์คำนวณปุ๋ย — บวก 1e-9 กันเศษทศนิยมจากการคูณ (25.4999999 ต้องได้ 26 แบบ Excel)
const roundAmount = (x: number) => Math.round(x + 1e-9)

export function chooseChemicalPlan(input: {
  straight: FertilizerPlan | null
  compound: FertilizerPlan | null
  splitRows: StageSplitRow[]
  blend: BlendResult | null
  /** สูตรของปุ๋ยที่ผู้ใช้เลือก เช่น ["46-0-0", "18-46-0"] */
  pickedGrades: string[]
  /** หน่วยมวลของผลคำนวณ เช่น "กรัม" / "กก." */
  massUnit: string
}): ChemicalPlanChoice | null {
  const { straight, compound, splitRows, blend, massUnit } = input
  const picked = input.pickedGrades.filter(Boolean)

  // ตารางตายตัวที่จะแสดง + สูตรที่เลือกแต่ตารางไม่มี
  const staticChoice = (source: "straight" | "compound", plan: FertilizerPlan): ChemicalPlanChoice => {
    const grades = gradesOf(plan)
    return { source, plan, missingGrades: picked.filter((g) => !grades.has(g)) }
  }

  if (hasStages(straight)) {
    const straightGrades = gradesOf(straight)
    if (used(picked, blend).every((g) => straightGrades.has(g))) return staticChoice("straight", straight)
  }

  if (hasStages(compound)) {
    const compoundGrades = gradesOf(compound)
    if (used(picked, blend).every((g) => compoundGrades.has(g))) return staticChoice("compound", compound)
  }

  // มีสูตรที่ตารางกรมฯ ไม่มี -> คำนวณจากปุ๋ยที่เลือก แบ่งตามระยะ
  const split = blend ? splitForPicks({ blend, straight, compound, splitRows }) : null
  if (split) {
    const stages = [
      ...split.split
        .map((s) => ({
          stage: stageLabel(s),
          order: s.order,
          items: s.items
            .map((it) => ({ grade: it.grade, amount: roundAmount(it.amount), unit: massUnit }))
            .filter((it) => it.amount > 0),
        }))
        .filter((s) => s.items.length > 0),
      ...split.fixed,
    ]
    if (stages.length > 0) {
      return { source: "computed", missingGrades: [], plan: { use_type: "compound", unit: massUnit, stages } }
    }
  }

  if (hasStages(compound)) return staticChoice("compound", compound)
  if (hasStages(straight)) return staticChoice("straight", straight)
  return null
}

// stage_desc เก็บวงเล็บมาในตัวแล้ว เช่น "(ก่อนออกดอก 1-2 เดือน)"
const stageLabel = (s: StageSplitResult) => (s.stage_desc ? `${s.stage_name} ${s.stage_desc}` : s.stage_name)

/**
 * แบ่งผลคำนวณจากปุ๋ยที่เลือกออกตามระยะ — ใช้ทั้งแถบปุ๋ยเคมีและแถบปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์
 * ไม้ผล: สัดส่วนของพืช (crop_stage_split) · พืชอื่น: จังหวะการใส่ในตาราง (splitRowsFromPlan)
 * คืนระยะปริมาณคงที่ของตาราง (fixed, เช่นหน่อไม้ฝรั่งระยะเก็บเกี่ยว/พักต้น) แยกไว้ให้ต่อท้าย
 * null = แบ่งไม่ได้ (ไม่มีตารางให้อ่านจังหวะ / ตารางแบบทางเลือก เช่นถั่ว)
 */
function splitForPlan(
  blend: BlendResult,
  rows: StageSplitRow[],
  fromPlan: boolean,
  fixedFrom: FertilizerPlan | null
): { split: StageSplitResult[]; fixed: PlanStage[] } | null {
  if (rows.length === 0) return null
  const split = splitBlendByStage(blend, rows, { preferP: fromPlan })
  const fixed = fromPlan && fixedFrom ? fixedFrom.stages.filter((s) => isFixedStage(s.stage)) : []
  return { split, fixed }
}

function splitRowsFor(input: {
  straight: FertilizerPlan | null
  compound: FertilizerPlan | null
  splitRows: StageSplitRow[]
}): { rows: StageSplitRow[]; fromPlan: boolean; base: FertilizerPlan | null } {
  const base = hasStages(input.straight) ? input.straight : hasStages(input.compound) ? input.compound : null
  if (input.splitRows.length > 0) return { rows: input.splitRows, fromPlan: false, base }
  return { rows: base ? splitRowsFromPlan(base) : [], fromPlan: true, base }
}

function splitForPicks(input: {
  blend: BlendResult
  straight: FertilizerPlan | null
  compound: FertilizerPlan | null
  splitRows: StageSplitRow[]
}) {
  const { rows, fromPlan, base } = splitRowsFor(input)
  return splitForPlan(input.blend, rows, fromPlan, base)
}

// %N ของปุ๋ยอินทรีย์ที่ใช้คำนวณปริมาณทดแทน — ตามไฟล์คำนวณปุ๋ย (ช่อง "กรอก %N ที่ได้จากปุ๋ยอินทรีย์" = 0.2)
// ยูเรียที่ลดลง 1 กก. (N 0.46 กก.) จึงแทนด้วยปุ๋ยอินทรีย์ 0.46 / 0.002 = 230 กก. ตรงกับตารางเดิม
const ORGANIC_N_FRACTION = 0.002
const ORGANIC_GRADE = "ปุ๋ยอินทรีย์"

export interface OrganicPlanChoice {
  source: "table" | "computed"
  plan: FertilizerPlan
  /** สูตรที่เลือกแต่ตารางที่แสดงไม่มี (คำนวณไม่ได้ เช่นถั่ว) — แจ้งผู้ใช้แบบแถบปุ๋ยเคมี */
  missingGrades: string[]
}

/**
 * แถบ "ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์"
 *   - ทุกสูตรที่เลือกมีในตาราง (หรือยังไม่ได้เลือก) → ตารางตรง ๆ
 *   - มีสูตรอื่น → คำนวณจากปุ๋ยที่เลือกด้วยวิธีเดียวกับไฟล์คำนวณปุ๋ย (ส่วน 70% + ปุ๋ยอินทรีย์ 30%):
 *       ไนโตรเจนเหลือ 70% (หัก N ที่ได้จากปุ๋ย P ก่อน) ฟอสฟอรัส/โพแทสเซียมเต็มอัตรา
 *       แบ่งตามระยะแบบเดียวกับแถบปุ๋ยเคมี
 *       ปุ๋ยอินทรีย์ในแต่ละระยะ = N ที่ลดลงในระยะนั้น ÷ %N ของปุ๋ยอินทรีย์ (0.2%)
 *       ผลที่หน่วยเป็นกรัม (ไม้ผล) แปลงปุ๋ยอินทรีย์เป็น กก. แบบตารางเดิม
 *     ระยะปริมาณคงที่ (หน่อไม้ฝรั่ง) ใช้ตามตาราง
 */
export function chooseOrganicPlan(input: {
  organic: FertilizerPlan | null
  straight: FertilizerPlan | null
  compound: FertilizerPlan | null
  splitRows: StageSplitRow[]
  blend: BlendResult | null
  pickedGrades: string[]
  massUnit: string
}): OrganicPlanChoice | null {
  const { organic, blend, massUnit } = input
  const picked = input.pickedGrades.filter(Boolean)
  const table = hasStages(organic) ? organic : null

  if (table && used(picked, blend).every((g) => gradesOf(table).has(g))) {
    return { source: "table", plan: table, missingGrades: [] }
  }

  if (blend) {
    const { rows, fromPlan, base } = splitRowsFor(input)
    const t = blend.target
    const blend70 = blendFertilizer(
      { n: t.n * 0.7, p2o5: t.p2o5, k2o: t.k2o },
      blend.items.map((it) => it.formula)
    )
    const full = splitForPlan(blend, rows, fromPlan, table ?? base)
    const cut = splitForPlan(blend70, rows, fromPlan, table ?? base)
    if (full && cut) {
      const grams = massUnit === "กรัม"
      const nOf = (items: StageSplitItem[]) => items.reduce((s, it) => s + (it.amount * it.n_pct) / 100, 0)
      const stages: PlanStage[] = full.split.map((s) => {
        const c = cut.split.find((x) => x.order === s.order)
        const items = (c?.items ?? [])
          .map((it) => ({ grade: it.grade, amount: roundAmount(it.amount), unit: massUnit }))
          .filter((it) => it.amount > 0)
        const organicMass = Math.max(0, nOf(s.items) - nOf(c?.items ?? [])) / ORGANIC_N_FRACTION
        const organicAmount = roundAmount(grams ? organicMass / 1000 : organicMass)
        if (organicAmount > 0) items.push({ grade: ORGANIC_GRADE, amount: organicAmount, unit: "กก." })
        return { stage: stageLabel(s), order: s.order, items }
      })
      const all = [...stages.filter((s) => s.items.length > 0), ...full.fixed]
      if (all.length > 0) {
        return {
          source: "computed",
          plan: { use_type: "organic70", unit: massUnit, stages: all },
          missingGrades: [],
        }
      }
    }
  }

  if (!table) return null
  const grades = gradesOf(table)
  return { source: "table", plan: table, missingGrades: picked.filter((g) => !grades.has(g)) }
}
