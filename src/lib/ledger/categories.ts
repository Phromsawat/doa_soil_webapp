// categories.ts — หมวดหมู่ตายตัวของสมุดบัญชี
//
// หมวดพวกนี้ไม่ได้เก็บใน DB ตั้งใจให้เป็นค่าตายตัวในโค้ด ผู้ใช้ทุกคนเห็นเหมือนกัน
// ส่วนหมวดที่ผู้ใช้เพิ่มเองอยู่ในตาราง farm_categories แล้วเอามาต่อท้ายรายการนี้

export type EntryKind = "income" | "expense"

export const KIND_LABEL: Record<EntryKind, string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
}

export const BUILTIN_CATEGORIES: Record<EntryKind, string[]> = {
  income: [
    "ผลผลิตทางการเกษตรหลัก",
    "ผลผลิตทางการเกษตรรอง",
    "รับจ้าง/ให้บริการทางการเกษตร",
    "เงินสนับสนุนจากภาครัฐ",
    "รายรับอื่น ๆ",
  ],
  expense: [
    "ค่าเตรียมแปลงเพาะปลูก",
    "ค่าเมล็ดพันธุ์/ต้นพันธุ์",
    "ค่าปุ๋ยและการบำรุงดิน",
    "ค่ายาปราบศัตรูพืชและวัชพืช",
    "ค่าจ้างแรงงาน",
    "ค่าน้ำ ค่าไฟ ค่าน้ำมัน",
    "ค่าขนส่งผลผลิต",
    "ค่าใช้จ่ายอื่น ๆ",
  ],
}

/** จำนวนเงินแบบไทย: 1234.5 -> "1,234.50" (ตัด .00 ทิ้งให้อ่านง่าย) */
export function formatBaht(n: number): string {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded)
    ? rounded.toLocaleString("th-TH")
    : rounded.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** วันที่แบบสั้น: "2026-08-23" -> "23 ส.ค. 69" */
export function formatDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
}

/** ชื่อรอบเริ่มต้นให้ผู้ใช้ไม่ต้องคิดเอง เช่น "รอบเพาะปลูก 2/2569" */
export function defaultSeasonName(existingCount: number): string {
  const buddhistYear = new Date().getFullYear() + 543
  return `รอบเพาะปลูก ${existingCount + 1}/${buddhistYear}`
}
