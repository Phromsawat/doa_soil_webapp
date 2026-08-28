// soilTemplate.ts — รูปแบบไฟล์นำเข้าผลวิเคราะห์ดิน (ใช้ร่วมกันทั้งฝั่ง client และ server)
//
// เทมเพลตนี้เรากำหนดเอง ผู้ใช้โหลดไปกรอกแล้วอัปโหลดกลับ
// หัวตารางจับแบบยืดหยุ่น: ตัดช่องว่าง/วงเล็บ/เครื่องหมายออกก่อนเทียบ ผู้ใช้จึงพิมพ์
// "OM" "อินทรียวัตถุ" หรือ "อินทรียวัตถุ (OM, %)" ก็ได้เหมือนกันหมด

export type ColumnKey =
  | "crop" | "om" | "p" | "k" | "ph"
  | "fert1" | "fert2" | "fert3"
  | "province" | "amphur" | "district" | "notes"

export interface ColumnSpec {
  key: ColumnKey
  /** หัวตารางที่ใช้ในไฟล์เทมเพลต */
  header: string
  /** ชื่ออื่นที่ยอมรับได้ (normalize แล้ว) */
  aliases: string[]
  required: boolean
}

export const COLUMNS: ColumnSpec[] = [
  { key: "crop",     header: "พืช",                     aliases: ["พืช", "ชนิดพืช", "พืชที่ปลูก", "crop"], required: true },
  { key: "om",       header: "อินทรียวัตถุ (OM, %)",     aliases: ["om", "อินทรียวัตถุ", "อินทรียวัตถุom"], required: true },
  { key: "p",        header: "ฟอสฟอรัส (P, มก./กก.)",    aliases: ["p", "ฟอสฟอรัส", "ฟอสฟอรัสp"], required: true },
  { key: "k",        header: "โพแทสเซียม (K, มก./กก.)",  aliases: ["k", "โพแทสเซียม", "โพแทสเซียมk"], required: true },
  { key: "ph",       header: "ความเป็นกรด-ด่าง (pH)",    aliases: ["ph", "ความเป็นกรดด่าง", "กรดด่าง"], required: false },
  { key: "fert1",    header: "ปุ๋ยสูตรที่ 1",            aliases: ["ปุ๋ยสูตรที่1", "ปุ๋ย1", "ปุ๋ย", "สูตรปุ๋ยที่1"], required: true },
  { key: "fert2",    header: "ปุ๋ยสูตรที่ 2",            aliases: ["ปุ๋ยสูตรที่2", "ปุ๋ย2", "สูตรปุ๋ยที่2"], required: false },
  { key: "fert3",    header: "ปุ๋ยสูตรที่ 3",            aliases: ["ปุ๋ยสูตรที่3", "ปุ๋ย3", "สูตรปุ๋ยที่3"], required: false },
  { key: "province", header: "จังหวัด",                  aliases: ["จังหวัด"], required: false },
  { key: "amphur",   header: "อำเภอ",                    aliases: ["อำเภอ", "เขต"], required: false },
  { key: "district", header: "ตำบล",                     aliases: ["ตำบล", "แขวง"], required: false },
  { key: "notes",    header: "หมายเหตุ",                 aliases: ["หมายเหตุ", "note", "notes"], required: false },
]

/** ตัดช่องว่าง วงเล็บ จุด ลูกน้ำ ขีด ออก แล้วทำเป็นตัวพิมพ์เล็ก เพื่อเทียบหัวตารางแบบหลวม ๆ */
export function normalizeHeader(s: string): string {
  return s
    .replace(/\([^)]*\)/g, "")
    .replace(/[\s.,\-_/%]/g, "")
    .trim()
    .toLowerCase()
}

/** แถวดิบที่อ่านมาจากไฟล์ (ยังไม่ตรวจความถูกต้อง) */
export type RawRow = Partial<Record<ColumnKey, string>> & { rowNumber: number }

/**
 * จับหัวตาราง -> คืน map ว่าคอลัมน์ไหนอยู่ตำแหน่งที่เท่าไร
 * คืน null ถ้าหาคอลัมน์บังคับไม่ครบ
 */
export function mapHeader(headerRow: string[]): { index: Partial<Record<ColumnKey, number>>; missing: string[] } {
  const index: Partial<Record<ColumnKey, number>> = {}
  headerRow.forEach((raw, i) => {
    const h = normalizeHeader(raw ?? "")
    if (!h) return
    const spec = COLUMNS.find((c) => c.aliases.includes(h))
    if (spec && index[spec.key] === undefined) index[spec.key] = i
  })
  const missing = COLUMNS.filter((c) => c.required && index[c.key] === undefined).map((c) => c.header)
  return { index, missing }
}

/** แปลงตารางดิบเป็นรายการแถว (ข้ามแถวที่ว่างทั้งแถว) */
export function toRawRows(rows: string[][], index: Partial<Record<ColumnKey, number>>): RawRow[] {
  const out: RawRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.every((c) => !String(c ?? "").trim())) continue
    const item: RawRow = { rowNumber: r + 1 } // +1 ให้ตรงกับเลขแถวที่ผู้ใช้เห็นใน Excel
    for (const col of COLUMNS) {
      const i = index[col.key]
      if (i === undefined) continue
      const v = String(row[i] ?? "").trim()
      if (v) item[col.key] = v
    }
    out.push(item)
  }
  return out
}

/** "1,234.5" / " 20 " -> 1234.5 ; ว่างหรือไม่ใช่ตัวเลข -> null */
export function toNumber(v: string | undefined): number | null {
  if (v === undefined) return null
  const cleaned = v.replace(/,/g, "").replace(/\s/g, "")
  if (cleaned === "") return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * ครอบเซลล์ด้วยเครื่องหมายคำพูดเมื่อข้างในมีลูกน้ำ/คำพูด/ขึ้นบรรทัด
 * จำเป็นมากเพราะหัวตารางของเราเองมีลูกน้ำอยู่ เช่น "อินทรียวัตถุ (OM, %)"
 * ถ้าไม่ครอบ ไฟล์เทมเพลตที่แจกออกไปจะถูกแยกคอลัมน์ผิดตั้งแต่แถวหัวตาราง
 */
function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/**
 * ไฟล์เทมเพลตเป็น CSV ที่มี BOM นำหน้า — Excel เปิดแล้วภาษาไทยไม่เพี้ยน
 * และผู้ใช้กด Save As เป็น .xlsx ต่อได้ถ้าต้องการ
 */
export function buildTemplateCsv(sampleCrop = "ทุเรียน"): string {
  const header = COLUMNS.map((c) => csvCell(c.header)).join(",")
  const example = [
    sampleCrop, "1.2", "20", "120", "6.5",
    "46-0-0", "18-46-0", "0-0-60",
    "จันทบุรี", "ท่าใหม่", "สองพี่น้อง", "ตัวอย่าง — ลบแถวนี้ก่อนใช้งานจริง",
  ].map(csvCell).join(",")
  return `﻿${header}\n${example}\n`
}
