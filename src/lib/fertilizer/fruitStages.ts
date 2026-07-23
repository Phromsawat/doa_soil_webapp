// fruitStages.ts — ตารางแบ่งใส่ปุ๋ยตามระยะการเจริญเติบโต (ไม้ผล 9 ชนิด)
// ข้อมูลจาก Excel กรมพัฒนาที่ดิน "ตารางคำนวณปุ๋ยสำหรับ KM ไม้ผล"
// สกัดเป็น JSON โดย scripts/extract_fruit_fertilizer.py
//
// ⚠️ สำคัญ — เกณฑ์ที่ใช้เปิดตารางนี้ "คนละชุด" กับเกณฑ์จัดระดับความอุดมสมบูรณ์ของดิน
//    ตาราง Excel นี้แบ่งช่วงเป็น:  OM <2 / 2-3 / >3
//                                  P  <15 / 15-45 / >45   (mg/kg)
//                                  K  <50 / 50-100 / >100 (mg/kg)
//    ส่วนเกณฑ์ใน src/lib/soil/grid.ts (<1.5, <10, <60) ใช้สำหรับ "จัดระดับดิน" ที่แสดงผล
//    ถ้าเอาเกณฑ์ดินมาเปิดตารางนี้จะได้แถวผิด -> ปริมาณปุ๋ยผิด

import FRUIT_DATA from "@/lib/fruit_fertilizer.json"

export type FruitKey =
  | "durian"
  | "mangosteen"
  | "rambutan"
  | "mango"
  | "longan"
  | "lychee"
  | "orange"
  | "coconut"
  | "pineapple"

/** ชื่อพืชภาษาไทย (ตรงกับชื่อในตาราง crops ของ DB) -> key ในไฟล์ JSON */
export const FRUIT_BY_THAI_NAME: Record<string, FruitKey> = {
  ทุเรียน: "durian",
  มังคุด: "mangosteen",
  เงาะ: "rambutan",
  มะม่วง: "mango",
  ลำไย: "longan",
  ลิ้นจี่: "lychee",
  ส้ม: "orange",
  มะพร้าว: "coconut",
  สับปะรด: "pineapple",
}

export type StageKey = "nurture" | "bud" | "fruit" | "quality"

export const STAGE_ORDER: StageKey[] = ["nurture", "bud", "fruit", "quality"]

export const STAGE_LABEL: Record<StageKey, string> = {
  nurture: "ระยะบำรุงต้น",
  bud: "ระยะสร้างตาดอก",
  fruit: "ระยะบำรุงผล",
  quality: "ระยะปรับปรุงคุณภาพ",
}

export interface StageDose {
  urea: number // 46-0-0 (กรัม/ต้น)
  dap: number // 18-46-0
  kcl: number // 0-0-60
}

type FruitEntry = Record<StageKey, StageDose>
type FruitDataset = Record<FruitKey, Record<string, FruitEntry>>

const FRUIT = FRUIT_DATA as unknown as FruitDataset

type ExcelLevel = "low" | "med" | "high"

// เกณฑ์เฉพาะของตาราง Excel (ห้ามเปลี่ยนเป็นเกณฑ์ดิน DOA)
function excelOM(v: number): ExcelLevel {
  if (v < 2) return "low"
  if (v <= 3) return "med"
  return "high"
}
function excelP(v: number): ExcelLevel {
  if (v < 15) return "low"
  if (v <= 45) return "med"
  return "high"
}
function excelK(v: number): ExcelLevel {
  if (v < 50) return "low"
  if (v <= 100) return "med"
  return "high"
}

const LEVEL_TH: Record<ExcelLevel, string> = {
  low: "ต่ำ",
  med: "ปานกลาง",
  high: "สูง",
}

export interface FruitStageResult {
  cropKey: FruitKey
  stages: FruitEntry
  /** ระดับที่ใช้เปิดตาราง (ตามเกณฑ์ Excel) — ไว้แสดงให้ผู้ใช้เห็นที่มา */
  levels: { om: string; p: string; k: string }
  /** รวมทั้งปี (กรัม/ต้น) */
  total: StageDose
}

/** ชื่อพืชนี้มีตารางรายระยะไหม */
export function isFruitWithStages(cropThaiName: string | null | undefined): boolean {
  return !!cropThaiName && cropThaiName.trim() in FRUIT_BY_THAI_NAME
}

/**
 * เปิดตารางปุ๋ยรายระยะของไม้ผล
 * คืน null ถ้าพืชไม่อยู่ใน 9 ชนิด หรือค่าดินไม่ครบ
 */
export function getFruitStages(
  cropThaiName: string | null | undefined,
  om: number | null,
  p: number | null,
  k: number | null
): FruitStageResult | null {
  if (!cropThaiName) return null
  const cropKey = FRUIT_BY_THAI_NAME[cropThaiName.trim()]
  if (!cropKey) return null
  if (om == null || p == null || k == null) return null

  const lo = excelOM(om)
  const lp = excelP(p)
  const lk = excelK(k)
  const stages = FRUIT[cropKey]?.[`${lo}_${lp}_${lk}`]
  if (!stages) return null

  const total = STAGE_ORDER.reduce<StageDose>(
    (acc, s) => ({
      urea: acc.urea + stages[s].urea,
      dap: acc.dap + stages[s].dap,
      kcl: acc.kcl + stages[s].kcl,
    }),
    { urea: 0, dap: 0, kcl: 0 }
  )

  return {
    cropKey,
    stages,
    levels: { om: LEVEL_TH[lo], p: LEVEL_TH[lp], k: LEVEL_TH[lk] },
    total,
  }
}
