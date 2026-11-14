// soilBands.ts — ช่วงค่าดินของพืช และการตัดสินว่าค่าดินตกช่วงไหน (ใช้ได้ทั้งฝั่ง server และเบราว์เซอร์)
//
// ช่วงหลักของพืชมาจากตาราง "การใช้ปุ๋ยตามค่าวิเคราะห์ดิน" (fertilizer_recommendations)
// ตารางอื่นของพืชเดียวกัน (แผนใส่ปุ๋ยตามระยะ ทั้งเคมีและเคมีร่วมกับอินทรีย์) จับคู่ด้วย "ลำดับช่วง"
// ไม่ใช่ตัวเลขขอบ — ตัวเลขขอบในแต่ละตารางของต้นฉบับไม่ตรงกันเสมอไป (เช่น K 50-100 กับ 51-100)
// ผลคือ ธาตุอาหารที่พืชต้องการ (ขั้น 6) กับแผนใส่ปุ๋ย (ขั้น 7) ใช้ช่วงเดียวกันเสมอ
//
// การเก็บใน DB: ช่วงเขียนแบบรวมขอบทั้งสองด้าน แล้วขยับขอบที่เอกสารไม่รวม 0.001
//   <2 / 2-3 / >3      -> 0~1.999 / 2~3 / 3.001~1000000
//   <1.5 / ≥1.5 (ผัก)  -> 0~1.499 / 1.5~1000000
// ค่าที่ตกช่องว่าง 0.001 นั้น (เช่น 1.9995) ใช้ขอบที่เป็นเลขกลมกว่า ซึ่งคือขอบที่เอกสารพิมพ์จริง

import type { SoilLevel } from "@/lib/soil/grid"

export type BandNutrient = "om" | "p" | "k"

export interface Band {
  min: number | null
  max: number | null
}

/** ช่วงของแต่ละธาตุ เรียงจากต่ำไปสูง */
export type CropBands = Record<BandNutrient, Band[]>

interface RangeRow {
  om_min: number | string | null; om_max: number | string | null
  p_min: number | string | null;  p_max: number | string | null
  k_min: number | string | null;  k_max: number | string | null
}

const toNum = (v: number | string | null) => (v === null || v === "" ? null : Number(v))

function byLow(a: Band, b: Band) {
  return (a.min ?? -Infinity) - (b.min ?? -Infinity) || (a.max ?? Infinity) - (b.max ?? Infinity)
}

/** ช่วงที่ไม่ซ้ำกันของธาตุหนึ่งในชุดแถว เรียงจากต่ำไปสูง */
export function distinctBands(rows: RangeRow[], n: BandNutrient): Band[] {
  const seen = new Map<string, Band>()
  for (const r of rows) {
    const min = toNum(r[`${n}_min`])
    const max = toNum(r[`${n}_max`])
    if (min === null && max === null) continue
    seen.set(`${min}|${max}`, { min, max })
  }
  return [...seen.values()].sort(byLow)
}

export function bandsFromRows(rows: RangeRow[]): CropBands {
  return { om: distinctBands(rows, "om"), p: distinctBands(rows, "p"), k: distinctBands(rows, "k") }
}

/** จำนวนทศนิยมที่มีความหมาย: 2 -> 0, 1.5 -> 1, 1.999 -> 3 */
function decimals(n: number) {
  const s = String(Number(n.toFixed(6)))
  const dot = s.indexOf(".")
  return dot === -1 ? 0 : s.length - dot - 1
}

/** ลำดับช่วงที่ค่า v ตกอยู่ (0 = ต่ำสุด) — null ถ้าไม่มีช่วงเลย */
export function bandIndex(bands: Band[], v: number): number | null {
  if (bands.length === 0 || !Number.isFinite(v)) return null
  const hit = bands.findIndex((b) => (b.min === null || v >= b.min) && (b.max === null || v <= b.max))
  if (hit !== -1) return hit
  if (bands[0].min !== null && v < bands[0].min) return 0
  const last = bands.length - 1
  if (bands[last].max !== null && v > bands[last].max!) return last
  // ตกช่องว่างระหว่างช่วง i กับ i+1 — ขอบที่เป็นเลขกลมกว่าคือขอบที่เอกสารพิมพ์
  for (let i = 0; i < last; i++) {
    const hi = bands[i].max
    const lo = bands[i + 1].min
    if (hi === null || lo === null || v <= hi || v >= lo) continue
    const dHi = decimals(hi)
    const dLo = decimals(lo)
    if (dLo < dHi) return i // เช่น <2 / 2-3 : 1.9995 ยังน้อยกว่า 2
    if (dHi < dLo) return i + 1 // เช่น 2-3 / >3 : 3.0005 มากกว่า 3 แล้ว
    return v < (hi + lo) / 2 ? i : i + 1
  }
  return null
}

/**
 * ระดับ ต่ำ/ปานกลาง/สูง ตามช่วงของพืช: ช่วงแรก = ต่ำ, ช่วงสุดท้าย = สูง, ช่วงที่เหลือ = ปานกลาง
 *   3 ช่วง (ไม้ผล):          ต่ำ / ปานกลาง / สูง
 *   2 ช่วง (ผัก <1.5 / ≥1.5): ต่ำ / สูง
 *   4 ช่วง (OM อ้อย):         ต่ำ / ปานกลาง / ปานกลาง / สูง — เอกสารไม่ได้ตั้งชื่อระดับเพิ่ม จึงไม่สร้างชื่อใหม่
 * มีช่วงเดียว (ไม่มีอะไรให้เทียบ) คืน null ให้ผู้เรียกใช้เกณฑ์ทั่วไปแทน
 */
export function bandLevel(bands: Band[] | undefined, v: number | null | undefined): SoilLevel | null {
  if (!bands || bands.length < 2 || v === null || v === undefined) return null
  const i = bandIndex(bands, v)
  if (i === null) return null
  return i === 0 ? "low" : i === bands.length - 1 ? "high" : "medium"
}
