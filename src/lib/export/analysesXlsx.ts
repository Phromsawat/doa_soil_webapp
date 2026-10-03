// analysesXlsx.ts — แผ่นงาน Excel "ประวัติการวิเคราะห์" (แถวละ 1 ผลวิเคราะห์) สำหรับแอดมิน
//
// ฟังก์ชันล้วน หน้าแอดมินเอาไปเขียนไฟล์ด้วย write-excel-file
// ค่าดิน/พิกัด/ค่าแนะนำเป็นตัวเลขจริง วันที่เป็นวันเวลาของ Excel (เวลาไทย) กรอง/เรียงได้

import type { Cell, CellObject, SheetData } from "write-excel-file/browser"
import type { AnalysisExportRow } from "@/lib/supabase/admin"
import { classify, LEVEL_LABEL_TH, type Nutrient } from "@/lib/soil/grid"
import { unitTh } from "@/lib/fertilizer/unit"

const MODE_TH: Record<string, string> = {
  image_upload: "วิเคราะห์ด้วย AI",
  manual_form: "บันทึกผลด้วยตนเอง",
  map_pin: "ปักหมุดแผนที่",
}
const STATUS_TH: Record<string, string> = {
  completed: "เสร็จสิ้น",
  pending: "รอดำเนินการ",
  failed: "ล้มเหลว",
}

const HEADERS = [
  "ลำดับ", "วันที่บันทึก", "ชื่อผู้ใช้", "อีเมล", "ประเภท", "สถานะ", "พืช", "ประเภทพืช",
  "OM (%)", "ระดับ OM", "P (มก./กก.)", "ระดับ P", "K (มก./กก.)", "ระดับ K", "pH",
  "ตำบล", "อำเภอ", "จังหวัด", "ละติจูด", "ลองจิจูด",
  "N ที่แนะนำ", "P₂O₅ ที่แนะนำ", "K₂O ที่แนะนำ", "หน่วยค่าแนะนำ", "หมายเหตุ",
]
export const ANALYSES_XLSX_COLUMNS = [
  6, 16, 22, 26, 17, 12, 14, 10,
  9, 10, 11, 10, 11, 10, 7,
  14, 14, 14, 11, 11,
  11, 12, 12, 14, 40,
].map((width) => ({ width }))
export const ANALYSES_XLSX_STICKY_ROWS = 4

/** timestamptz -> Date ที่ "ตัวเลข" เท่ากับเวลาไทย (Excel ไม่มีเขตเวลา จะแสดงตามตัวเลขนี้) */
function bangkokDate(iso: string): Date | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(d).map((p) => [p.type, p.value])
  )
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second))
}

export function buildAnalysesSheet(
  rows: AnalysisExportRow[],
  meta: { filterText: string; exportedAt: string }
): SheetData {
  const head = (v: string): Cell => ({
    value: v, fontWeight: "bold", backgroundColor: "#E1F0E5", align: "center", wrap: true,
    borderStyle: "thin", borderColor: "#BFD8C6",
  })
  const cell = (c: CellObject): Cell => ({ borderStyle: "thin", borderColor: "#E5E7EB", ...c })
  const text = (v: string | null | undefined) => cell({ value: v ?? "" })
  // ไม่ใส่ format = General ของ Excel (แสดงทศนิยมเท่าที่มี ไม่มีจุดค้างท้ายจำนวนเต็ม)
  const number = (v: number | null, format?: string) =>
    v == null ? cell({ value: "" }) : cell({ value: v, type: Number, ...(format ? { format } : {}) })
  const level = (n: Nutrient, v: number | null) => {
    const lv = classify(n, v)
    return text(lv ? LEVEL_LABEL_TH[lv] : "")
  }

  const data: SheetData = [
    [{ value: "ประวัติการวิเคราะห์ดิน — DOA-Soil Test Kit", fontWeight: "bold", columnSpan: HEADERS.length }],
    [{ value: `เงื่อนไข: ${meta.filterText} · ทั้งหมด ${rows.length} รายการ · ส่งออกเมื่อ ${meta.exportedAt}`, textColor: "#6B7280", columnSpan: HEADERS.length }],
    [],
    HEADERS.map(head),
  ]

  rows.forEach((r, i) => {
    const when = bangkokDate(r.created_at)
    data.push([
      cell({ value: i + 1, type: Number, align: "center" }),
      when ? cell({ value: when, type: Date, format: "dd/mm/yyyy hh:mm" }) : text(""),
      text(r.owner_name ?? "ไม่ระบุ"),
      text(r.owner_email),
      text(MODE_TH[r.input_mode] ?? r.input_mode),
      text(STATUS_TH[r.status] ?? r.status),
      text(r.crop_name),
      text(r.crop_type),
      number(r.om), level("om", r.om),
      number(r.p), level("p", r.p),
      number(r.k), level("k", r.k),
      number(r.ph),
      text(r.district), text(r.amphur), text(r.province),
      number(r.latitude, "0.000000"), number(r.longitude, "0.000000"),
      number(r.rec_n), number(r.rec_p2o5), number(r.rec_k2o),
      text(r.rec_unit ? unitTh(r.rec_unit) : ""),
      cell({ value: r.notes ?? "", wrap: true }),
    ])
  })
  return data
}
