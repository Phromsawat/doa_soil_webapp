"use server"

import { createClient } from "@/lib/supabase/server"

// =============================================================================
// ตาราง "การใช้ปุ๋ยตามค่าวิเคราะห์ดิน" (ตารางอ้างอิงของกรมวิชาการเกษตร)
//
// อ่านจาก fertilizer_recommendations ซึ่งเป็น "ตารางเดียวกับที่ใช้คำนวณ" ในขั้นถัดไป
// จึงไม่มีทางที่ตัวเลขที่โชว์กับตัวเลขที่คำนวณจะหลุดจากกัน
//
// ในตารางต้นฉบับ ช่วงค่าเขียนเป็น <2 / 2-3 / >3 แต่ใน DB เก็บเป็นตัวเลขจริง
// โดยใช้กติกา "ขอบเขต - 0.001" (เช่น <2 -> 0 ถึง 1.999, >3 -> 3.001 ถึง 1000000)
// ฟังก์ชัน edgeLow/edgeHigh จึงบวก/ลบ 0.001 กลับ เพื่อพิมพ์ให้ตรงกับเอกสาร
// =============================================================================

export type RecNutrient = "om" | "p" | "k"

export interface RecBand {
  /** ข้อความช่วงค่าแบบในเอกสาร เช่น "<2" "2-3" ">3" */
  range: string
  /** ขอบเขตจริงใน DB — ใช้ไฮไลต์แถวที่ตรงกับค่าดินที่ผู้ใช้กรอก */
  min: number | null
  max: number | null
  /** ปริมาณธาตุอาหารที่แนะนำ (null = ตารางไม่ได้ระบุ) */
  amount: number | null
}

export interface RecSection {
  nutrient: RecNutrient
  bands: RecBand[]
}

export interface SoilRecTable {
  /** หน่วยของ amount — 'g/tree/year' หรือ 'kg/rai' */
  unit: string
  sections: RecSection[]
}

interface RecRow {
  om_min: number | null; om_max: number | null
  p_min: number | null;  p_max: number | null
  k_min: number | null;  k_max: number | null
  target_n: number | null
  target_p2o5: number | null
  target_k2o: number | null
  target_unit: string
}

/** ตัดศูนย์ท้ายทศนิยมทิ้ง: 2.0 -> "2", 1.5 -> "1.5" */
function round3(n: number): number {
  return Number(n.toFixed(3))
}
/** จำนวนทศนิยมที่มีความหมายจริง: 2 -> 0, 1.5 -> 1, 1.499 -> 3 */
function decimals(n: number): number {
  const s = String(round3(n))
  const dot = s.indexOf(".")
  return dot === -1 ? 0 : s.length - dot - 1
}
/** คืนขอบบนของช่วงแรก: 1.999 -> 2, 49.999 -> 50, 0.599 -> 0.6, 1.499 -> 1.5 */
function edgeLow(max: number): number {
  return round3(max + 0.001)
}

/**
 * ขอบล่างของช่วงสุดท้าย + ตัวดำเนินการ
 * ตาราง 2 แบบใน DB เข้ารหัสรอยต่อไม่เหมือนกัน:
 *   ก) ...ถึง X แล้วช่วงถัดไปเริ่ม X+0.001  -> เอกสารเขียน ">X"   (เช่น 2-3 / >3)
 *   ข) ...ถึง X-0.001 แล้วช่วงถัดไปเริ่ม X  -> เอกสารเขียน "≥X"   (เช่น <1.5 / ≥1.5 ของพืชผัก)
 * แยกด้วย "ฝั่งไหนเป็นเลขกลม (ทศนิยมน้อยกว่า)" ฝั่งนั้นคือขอบจริงที่เอกสารพิมพ์
 * ถ้าเสมอกัน (0.999 กับ 1.001) ขอบจริงอยู่ตรงกลาง -> ">X"
 */
function lastEdge(prevMax: number, curMin: number): { value: number; ge: boolean } {
  const dp = decimals(prevMax)
  const dc = decimals(curMin)
  if (dc < dp) return { value: curMin, ge: true }
  if (dp < dc) return { value: prevMax, ge: false }
  return { value: round3(curMin - 0.001), ge: false }
}

function buildBands(
  rows: RecRow[],
  minKey: "om_min" | "p_min" | "k_min",
  maxKey: "om_max" | "p_max" | "k_max",
  targetKey: "target_n" | "target_p2o5" | "target_k2o",
  minDp = 0
): RecBand[] {
  const picked = rows
    .filter((r) => r[minKey] !== null || r[maxKey] !== null)
    .map((r) => ({
      min: r[minKey] === null ? null : Number(r[minKey]),
      max: r[maxKey] === null ? null : Number(r[maxKey]),
      amount: r[targetKey] === null ? null : Number(r[targetKey]),
    }))
    .sort((a, b) => (a.min ?? -Infinity) - (b.min ?? -Infinity))

  const last = picked.length - 1
  const multi = picked.length > 1
  const firstEdge = multi && picked[0].max !== null ? edgeLow(picked[0].max!) : null
  const endEdge =
    multi && picked[last].min !== null && picked[last - 1].max !== null
      ? lastEdge(picked[last - 1].max!, picked[last].min!)
      : null

  // เอกสารพิมพ์ทศนิยมเท่ากันทั้งกลุ่ม (เช่น อ้อย 0.75-1.50 ไม่ใช่ 0.75-1.5)
  // -> ใช้จำนวนทศนิยมของตัวที่ละเอียดที่สุดในกลุ่มเป็นเกณฑ์เดียวกันทุกช่วง
  const shown: number[] = []
  if (firstEdge !== null) shown.push(firstEdge)
  if (endEdge) shown.push(endEdge.value)
  for (let i = multi ? 1 : 0; i <= (multi ? last - 1 : last); i++) {
    if (picked[i].min !== null) shown.push(picked[i].min!)
    if (picked[i].max !== null) shown.push(picked[i].max!)
  }
  // minDp มาจาก client ได้ -> คุมช่วงไว้ ไม่งั้น toFixed โยน RangeError
  const dp = Math.min(6, Math.max(0, shown.reduce((m, v) => Math.max(m, decimals(v)), minDp)))
  const fmt = (n: number) => n.toFixed(dp)

  return picked.map((b, i) => {
    let range: string
    if (multi && i === 0 && firstEdge !== null) {
      range = `<${fmt(firstEdge)}`
    } else if (multi && i === last && endEdge) {
      range = `${endEdge.ge ? "≥" : ">"}${fmt(endEdge.value)}`
    } else if (b.min !== null && b.max !== null) {
      range = `${fmt(b.min)}-${fmt(b.max)}`
    } else if (b.min !== null) {
      range = `>${fmt(b.min)}`
    } else {
      range = `<${fmt(b.max!)}`
    }
    return { range, min: b.min, max: b.max, amount: b.amount }
  })
}

/**
 * ตารางการใช้ปุ๋ยตามค่าวิเคราะห์ดินของพืชหนึ่ง ๆ
 * คืน null ถ้าพืชนี้ยังไม่มีข้อมูลในตาราง
 */
export async function getSoilRecommendationTable(
  cropId: string,
  /** จำนวนทศนิยมขั้นต่ำของช่วงค่าวิเคราะห์ ตามที่ต้นฉบับพิมพ์ (ดู SOIL_REC_META) */
  minDecimals?: Partial<Record<RecNutrient, number>>
): Promise<SoilRecTable | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fertilizer_recommendations")
    .select(
      "om_min, om_max, p_min, p_max, k_min, k_max, target_n, target_p2o5, target_k2o, target_unit"
    )
    .eq("crop_id", cropId)
    .eq("mode", "100%")
  if (error) throw new Error(`getSoilRecommendationTable: ${error.message}`)
  if (!data || data.length === 0) return null

  const rows = data as RecRow[]
  const sections: RecSection[] = (
    [
      ["om", "om_min", "om_max", "target_n"],
      ["p", "p_min", "p_max", "target_p2o5"],
      ["k", "k_min", "k_max", "target_k2o"],
    ] as const
  )
    .map(([nutrient, minKey, maxKey, targetKey]) => ({
      nutrient,
      bands: buildBands(rows, minKey, maxKey, targetKey, minDecimals?.[nutrient] ?? 0),
    }))
    .filter((s) => s.bands.length > 0)

  if (sections.length === 0) return null
  return { unit: rows[0].target_unit, sections }
}
