// chemicalPlan.ts — เลือกว่าแถบ "ปุ๋ยเคมี" ของแผนใส่ปุ๋ยตามระยะจะแสดงตารางไหน
//
// หน้าจอแสดง 2 แถบ: ปุ๋ยเคมี / ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์ (organic70 = ตารางตายตัวตรง ๆ)
// แถบ "ปุ๋ยเคมี" รวมข้อมูล 3 แหล่ง เลือกตามปุ๋ยที่ผู้ใช้เลือกไว้:
//   1. ปุ๋ยที่เลือกเป็นแม่ปุ๋ยทั้งหมด (หรือยังไม่ได้เลือก) → ตารางแม่ปุ๋ยของกรมฯ ตรง ๆ
//      ไม่คำนวณใหม่ เพราะผลคำนวณ (solver + สัดส่วนแบ่งระยะ) ปัดไม่ตรงกับตัวเลขในตารางกรมฯ
//      ทำให้ปุ๋ยสูตรเดียวกันได้ปริมาณไม่เท่ากัน
//   2. มีสูตรอื่นปน + พืชมีตารางปุ๋ยผสม (พืชไร่ เช่น 16-16-8) → ตารางปุ๋ยผสมของกรมฯ
//   3. ไม้ผลที่มีสัดส่วนแบ่งระยะ → แบ่งผลคำนวณจากปุ๋ยที่เลือกตามระยะ
//   4. ไม่มีทางอื่น → ตารางแม่ปุ๋ย
// กรณี 2 และ 4 ตารางกรมฯ อาจไม่มีบางสูตรที่ผู้ใช้เลือก → missingGrades ไว้ให้หน้าจอแจ้งผู้ใช้
// ใช้ร่วมกันทั้งหน้าจอ (FertilizerPlanTable) และรายงาน PDF ให้ได้ผลเดียวกันเสมอ

import type { FertilizerPlan } from "@/lib/supabase/fertilizerPlan"
import type { BlendResult } from "./blend"
import { splitBlendByStage, type StageSplitRow } from "./stageSplit"

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

const hasStages = (p: FertilizerPlan | null): p is FertilizerPlan => !!p && p.stages.length > 0
const gradesOf = (p: FertilizerPlan) => new Set(p.stages.flatMap((s) => s.items.map((it) => it.grade)))

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
    if (picked.every((g) => straightGrades.has(g))) return staticChoice("straight", straight)
  }

  if (hasStages(compound)) return staticChoice("compound", compound)

  if (blend && splitRows.length > 0) {
    const split = splitBlendByStage(blend, splitRows)
    if (split.length > 0) {
      return {
        source: "computed",
        missingGrades: [],
        plan: {
          use_type: "compound",
          unit: massUnit,
          stages: split.map((s) => ({
            // stage_desc เก็บวงเล็บมาในตัวแล้ว เช่น "(ก่อนออกดอก 1-2 เดือน)"
            stage: s.stage_desc ? `${s.stage_name} ${s.stage_desc}` : s.stage_name,
            order: s.order,
            items: s.items.map((it) => ({ grade: it.grade, amount: Math.round(it.amount), unit: massUnit })),
          })),
        },
      }
    }
  }

  if (hasStages(straight)) return staticChoice("straight", straight)
  return null
}
