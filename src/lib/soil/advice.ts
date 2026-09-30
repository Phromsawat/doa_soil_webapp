// advice.ts — จัดระดับค่าดินตามช่วงของตารางคำแนะนำ + คำแนะนำค่า pH

export interface Range {
  min: number | null
  max: number | null
}

// จำนวนช่วง -> ชื่อระดับ (ช่วงแรก = ต่ำสุด)
const LEVEL_NAMES: Record<number, string[]> = {
  1: ["—"],
  2: ["ต่ำ", "สูง"],
  3: ["ต่ำ", "ปานกลาง", "สูง"],
  4: ["ต่ำ", "ปานกลาง", "สูง", "สูงมาก"],
  5: ["ต่ำมาก", "ต่ำ", "ปานกลาง", "สูง", "สูงมาก"],
}

export function levelNames(n: number): string[] {
  return LEVEL_NAMES[n] ?? Array.from({ length: n }, (_, i) => `ระดับ ${i + 1}`)
}

/** ช่วงแบบ [min, max) ตรงกับการจับคู่ใน fertilizerPlan.ts */
export function inRange(v: number, r: Range) {
  if (r.min !== null && v < r.min) return false
  if (r.max !== null && v >= r.max) return false
  return true
}

export function rangeLabel(r: Range): string {
  const f = (v: number) => v.toLocaleString("th-TH", { maximumFractionDigits: 2 })
  if (r.min === null && r.max !== null) return `< ${f(r.max)}`
  if (r.max === null && r.min !== null) return `≥ ${f(r.min)}`
  if (r.min !== null && r.max !== null) return `${f(r.min)} – ${f(r.max)}`
  return "ทุกค่า"
}

/** ระดับของค่าดินตามช่วงของพืช เช่น "ต่ำ" | "ปานกลาง" | "สูง" (null = ไม่มีค่า/ไม่มีช่วง) */
export function levelByRanges(v: number | null, ranges: Range[]): { index: number; label: string } | null {
  if (v == null || !Number.isFinite(v) || ranges.length === 0) return null
  const i = ranges.findIndex((r) => inRange(v, r))
  if (i < 0) return null
  return { index: i, label: levelNames(ranges.length)[i] }
}

// เกณฑ์ทั่วไป (กรมพัฒนาที่ดิน) ใช้ก่อนเลือกพืช — ตรงกับ THRESHOLDS ใน lib/soil/grid.ts
export const GENERAL_RANGES: Record<"om" | "p" | "k", Range[]> = {
  om: [{ min: null, max: 1.5 }, { min: 1.5, max: 3.5 }, { min: 3.5, max: null }],
  p: [{ min: null, max: 10 }, { min: 10, max: 25 }, { min: 25, max: null }],
  k: [{ min: null, max: 60 }, { min: 60, max: 90 }, { min: 90, max: null }],
}

// ---------------------------------------------------------------- pH
export interface PhAdvice {
  label: string // ระดับความเป็นกรด-ด่าง
  advice: string // คำแนะนำ
  tone: "bad" | "warn" | "good"
}

/** คำแนะนำตามค่า pH ของดิน (เกณฑ์ทั่วไปของกรมวิชาการเกษตร/กรมพัฒนาที่ดิน) */
export function phAdvice(ph: number | null): PhAdvice | null {
  if (ph == null || !Number.isFinite(ph)) return null
  if (ph < 4.5)
    return {
      label: "กรดจัดมาก",
      advice: "ควรปรับปรุงดินด้วยปูนโดโลไมท์หรือปูนมาร์ล ตามผลวิเคราะห์ความต้องการปูน ก่อนใส่ปุ๋ยอย่างน้อย 2-4 สัปดาห์ และเพิ่มอินทรียวัตถุ",
      tone: "bad",
    }
  if (ph < 5.5)
    return {
      label: "กรดจัด",
      advice: "ควรใส่ปูนโดโลไมท์ตามผลวิเคราะห์ความต้องการปูน เพื่อยกระดับ pH ให้ธาตุอาหารละลายออกมาเป็นประโยชน์มากขึ้น",
      tone: "warn",
    }
  if (ph < 6.5)
    return {
      label: "กรดเล็กน้อย",
      advice: "เหมาะสมสำหรับพืชส่วนใหญ่ ไม่จำเป็นต้องปรับ pH ใส่ปุ๋ยตามคำแนะนำได้เลย",
      tone: "good",
    }
  if (ph <= 7.5)
    return {
      label: "เป็นกลาง",
      advice: "เหมาะสม ธาตุอาหารส่วนใหญ่เป็นประโยชน์ต่อพืชได้ดี",
      tone: "good",
    }
  if (ph <= 8.5)
    return {
      label: "ด่างเล็กน้อย",
      advice: "ธาตุเหล็ก สังกะสี แมงกานีส อาจขาดได้ ควรเพิ่มอินทรียวัตถุ (ปุ๋ยหมัก/ปุ๋ยคอก) และหลีกเลี่ยงการใส่ปูน",
      tone: "warn",
    }
  return {
    label: "ด่างจัด",
    advice: "ควรใส่กำมะถันผงหรือยิปซัมร่วมกับอินทรียวัตถุเพื่อลด pH และหลีกเลี่ยงการใส่ปูนทุกชนิด",
    tone: "bad",
  }
}
