"use server"

import { listCrops, calculateFertilizer } from "@/lib/supabase/fertilizer"
import {
  getFertilizerPlan,
  getCropStageSplit,
  getCropNote,
  type UseType,
  type FertilizerPlan,
} from "@/lib/supabase/fertilizerPlan"
import { chooseChemicalPlan, missingGradesNote, PLAN_TABS, type PlanTab } from "@/lib/fertilizer/chemicalPlan"
import { listFertilizerFormulas } from "@/lib/supabase/fertilizerFormulas"
import { blendFertilizer, type Formula } from "@/lib/fertilizer/blend"

// =============================================================================
// ข้อมูลของรายงานผลวิเคราะห์ดิน (หน้า /analyze/result/print) — คำนวณจากค่าที่ส่งมา อ่านแค่ข้อมูลอ้างอิง
//   ผลที่บันทึกแล้ว: หน้ารายงาน (server) ส่งแถวจาก analyses มา
//   ผู้ที่ไม่ได้ล็อกอิน: GuestReport (client) ส่งค่าจาก sessionStorage มา — ไม่มีอะไรถูกบันทึก
// =============================================================================

/** คอลัมน์ของ analyses ที่รายงานใช้ */
export interface ReportInput {
  crop_id: string | null
  om_value: number | null
  p_value: number | null
  k_value: number | null
  ph_value: number | null
  province: string | null
  amphur: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
  blend_formula_ids: string[] | null
  created_at: string
}

/** แปลงหน่วยของ target ("g/tree/year", "kg/rai") เป็นคำไทย — เกณฑ์เดียวกับ BlendResultCard */
function unitParts(unit: string) {
  const mass = unit.toLowerCase().startsWith("kg") ? "กก." : "กรัม"
  const basis = /rai|ไร่/i.test(unit) ? "ต่อไร่" : /tree|ต้น/i.test(unit) ? "ต่อต้น" : ""
  return { mass, basis }
}

// คอลัมน์ numeric บางคอลัมน์อาจมาเป็นข้อความ — รับทั้งตัวเลขและข้อความที่เป็นตัวเลข
const numOrNull = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}
const strOrNull = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null)

export async function buildSoilReport(raw: ReportInput, selectedTab: PlanTab | null) {
  // ฝั่งผู้ที่ไม่ได้ล็อกอินส่งค่าจากเบราว์เซอร์มาตรง ๆ — คัดเฉพาะชนิดที่ถูกต้อง
  const record: ReportInput = {
    crop_id: strOrNull(raw.crop_id),
    om_value: numOrNull(raw.om_value),
    p_value: numOrNull(raw.p_value),
    k_value: numOrNull(raw.k_value),
    ph_value: numOrNull(raw.ph_value),
    province: strOrNull(raw.province),
    amphur: strOrNull(raw.amphur),
    district: strOrNull(raw.district),
    latitude: numOrNull(raw.latitude),
    longitude: numOrNull(raw.longitude),
    blend_formula_ids: (Array.isArray(raw.blend_formula_ids) ? raw.blend_formula_ids : [])
      .filter((x): x is string => typeof x === "string" && !!x)
      .slice(0, 3),
    created_at: typeof raw.created_at === "string" && !isNaN(Date.parse(raw.created_at))
      ? raw.created_at
      : new Date().toISOString(),
  }

  const cropId = record.crop_id
  const [crops, calculation, note, formulas] = await Promise.all([
    listCrops().catch(() => []),
    cropId
      ? calculateFertilizer({
          crop_id: cropId,
          om_value: record.om_value,
          p_value: record.p_value,
          k_value: record.k_value,
        }).catch(() => null)
      : Promise.resolve(null),
    cropId ? getCropNote(cropId).catch(() => null) : Promise.resolve(null),
    listFertilizerFormulas().catch(() => []),
  ])
  const splitRows = cropId ? await getCropStageSplit(cropId).catch(() => []) : []

  // ปุ๋ยที่ผู้ใช้เลือกไว้ + ปริมาณที่ต้องใช้ (ต้องคำนวณก่อน เพราะแถบ "ปุ๋ยเคมี"
  // ใช้สูตรที่เลือกตัดสินว่าจะยึดตารางไหน และไม้ผลอาจต้องแบ่งจากค่านี้ตามระยะ)
  const picked: Formula[] = (record.blend_formula_ids ?? [])
    .map((fid) => formulas.find((f) => f.id === fid))
    .filter((f): f is (typeof formulas)[number] => !!f)
    .map((f) => ({
      id: f.id, name: f.name, grade: f.grade,
      n: f.n_percent, p2o5: f.p2o5_percent, k2o: f.k2o_percent,
    }))
  const target = {
    n: calculation?.target_n ?? 0,
    p2o5: calculation?.target_p2o5 ?? 0,
    k2o: calculation?.target_k2o ?? 0,
  }
  const blend =
    picked.length > 0 && (target.n > 0 || target.p2o5 > 0 || target.k2o > 0)
      ? blendFertilizer(target, picked)
      : null

  const { mass, basis } = unitParts(calculation?.unit ?? "")

  // ตารางตายตัวตามค่าดินทั้ง 3 ชนิด แล้วเลือกแบบเดียวกับหน้าจอ (chooseChemicalPlan)
  const getPlan = (use_type: UseType) =>
    cropId
      ? getFertilizerPlan({
          crop_id: cropId,
          om: record.om_value,
          p: record.p_value,
          k: record.k_value,
          use_type,
        }).catch(() => null)
      : Promise.resolve(null)
  const [straightPlan, compoundPlan, organicPlan] = await Promise.all([
    getPlan("straight"),
    getPlan("compound"),
    getPlan("organic70"),
  ])
  const chemical = chooseChemicalPlan({
    straight: straightPlan,
    compound: compoundPlan,
    splitRows,
    blend,
    pickedGrades: picked.map((f) => f.grade ?? ""),
    massUnit: mass,
  })

  // พิมพ์เฉพาะแถบที่เลือกมา และเฉพาะที่มีข้อมูลจริง
  // (ไม่พิมพ์ตารางเปล่าที่เต็มไปด้วย "-" เหมือนรายงานแบบเดิม)
  const tabPlan: Record<PlanTab, FertilizerPlan | null> = {
    chemical: chemical?.plan ?? null,
    organic70: organicPlan && organicPlan.stages.length > 0 ? organicPlan : null,
  }
  const wanted = PLAN_TABS.filter((t) => (!selectedTab || t === selectedTab) && tabPlan[t])
  const plans = (wanted.length > 0 ? wanted : PLAN_TABS.filter((t) => tabPlan[t])).map(
    (t) => ({
      tab: t,
      ...(tabPlan[t] as FertilizerPlan),
      note:
        t === "chemical" && chemical && chemical.missingGrades.length > 0
          ? missingGradesNote(chemical.missingGrades)
          : null,
    })
  )

  return {
    record,
    cropName: crops.find((c) => c.id === cropId)?.name ?? "ไม่ระบุ",
    calculation,
    note,
    plans,
    blend,
    mass,
    basis,
  }
}

export type SoilReportData = Awaited<ReturnType<typeof buildSoilReport>>
