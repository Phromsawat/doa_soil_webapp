// ledgerXlsx.ts — แผ่นงาน Excel "สรุปสมุดบัญชีรายรอบเพาะปลูก" (แถวละ 1 ผู้ใช้ × 1 รอบ)
//
// แยกเป็นฟังก์ชันล้วน (ไม่แตะ DOM/ไลบรารีเขียนไฟล์) หน้าแอดมินเอาไปเขียนไฟล์ต่อ
// วันที่เก็บเป็นชนิดวันที่จริงของ Excel (กรอง/เรียงได้) ตัวเลขเงินเป็นตัวเลข ไม่ใช่ข้อความ

import type { Cell, CellObject, SheetData } from "write-excel-file/browser"
import type { LedgerSummaryRow } from "@/lib/supabase/adminLedger"

const MONEY = "#,##0.00"
const KG = "#,##0.00" // "#,##0.##" จะแสดงจุดค้างท้ายจำนวนเต็ม เช่น "1,250."
const DATE = "dd/mm/yyyy"

/** "2026-09-30" -> Date เที่ยงคืน UTC (ไม่ให้เขตเวลาเลื่อนวันที่) */
function toDate(iso: string | null): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : null
}

const HEADERS = [
  "ลำดับ", "ชื่อผู้ใช้", "อีเมล", "รอบเพาะปลูก", "พืช", "วันที่เริ่ม", "วันที่สิ้นสุด",
  "ผลผลิต (กก.)", "จำนวนรายการ", "รายรับรวม (บาท)", "รายจ่ายรวม (บาท)", "กำไรสุทธิ (บาท)",
]
export const LEDGER_XLSX_COLUMNS = [6, 22, 28, 22, 16, 12, 12, 13, 12, 17, 17, 17].map((width) => ({ width }))
/** แถวหัวตาราง (ลำดับที่ 4) — ตรึงไว้ตอนเลื่อน */
export const LEDGER_XLSX_STICKY_ROWS = 4

export function buildLedgerSheet(
  rows: LedgerSummaryRow[],
  meta: { filterText: string; exportedAt: string }
): SheetData {
  const head = (v: string): Cell => ({
    value: v, fontWeight: "bold", backgroundColor: "#E1F0E5", align: "center", wrap: true,
    borderStyle: "thin", borderColor: "#BFD8C6",
  })
  const cell = (c: CellObject): Cell => ({ borderStyle: "thin", borderColor: "#E5E7EB", ...c })

  const data: SheetData = [
    [{ value: "สรุปสมุดบัญชีรายรอบเพาะปลูก — DOA-Soil Test Kit", fontWeight: "bold", columnSpan: HEADERS.length }],
    [{ value: `เงื่อนไข: ${meta.filterText} · ส่งออกเมื่อ ${meta.exportedAt}`, textColor: "#6B7280", columnSpan: HEADERS.length }],
    [],
    HEADERS.map(head),
  ]

  rows.forEach((r, i) => {
    const date = (iso: string | null): Cell => {
      const d = toDate(iso)
      return d ? cell({ value: d, type: Date, format: DATE, align: "center" }) : cell({ value: "–", align: "center" })
    }
    data.push([
      cell({ value: i + 1, type: Number, align: "center" }),
      cell({ value: r.owner_name ?? "ไม่ระบุ" }),
      cell({ value: r.owner_email ?? "" }),
      cell({ value: r.name }),
      cell({ value: r.crop_name ?? "ไม่ระบุ" }),
      date(r.started_on),
      date(r.ended_on),
      r.yield_kg != null ? cell({ value: r.yield_kg, type: Number, format: KG }) : cell({ value: "–", align: "right" }),
      cell({ value: r.entry_count, type: Number, align: "center" }),
      cell({ value: r.income, type: Number, format: MONEY }),
      cell({ value: r.expense, type: Number, format: MONEY }),
      cell({ value: r.net, type: Number, format: MONEY, textColor: r.net < 0 ? "#DC2626" : "#15803D", fontWeight: "bold" }),
    ])
  })

  // แถวรวมท้ายตาราง
  const sum = (k: "income" | "expense" | "net" | "entry_count") => rows.reduce((s, r) => s + r[k], 0)
  const total = (c: CellObject): Cell => cell({ fontWeight: "bold", backgroundColor: "#F3F4F6", ...c })
  const net = sum("net")
  data.push([
    total({ value: `รวม ${rows.length} รอบ`, columnSpan: 8 }),
    null, null, null, null, null, null, null,
    total({ value: sum("entry_count"), type: Number, align: "center" }),
    total({ value: sum("income"), type: Number, format: MONEY }),
    total({ value: sum("expense"), type: Number, format: MONEY }),
    total({ value: net, type: Number, format: MONEY, textColor: net < 0 ? "#DC2626" : "#15803D" }),
  ])
  return data
}
