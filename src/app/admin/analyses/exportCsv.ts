// exportCsv.ts — แปลงประวัติการวิเคราะห์ทั้งหมดเป็น CSV (UTF-8 + BOM ให้ Excel อ่านภาษาไทยได้)

import type { ReportData } from "@/lib/report"

type ExportRow = Record<string, unknown> & {
  crops?: { name?: string; crop_types?: { name?: string } | null } | null
  analysis_results?: { recommended_n: number | null; recommended_p2o5: number | null; recommended_k2o: number | null; unit: string | null; fertilizer_plan: unknown }[] | null
  user?: { email?: string | null; full_name?: string | null; nickname?: string | null } | null
}

const esc = (v: unknown) => {
  if (v == null) return ""
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const MODE_TH: Record<string, string> = { chemical: "ปุ๋ยเคมี", organic: "ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์" }
const INPUT_TH: Record<string, string> = { image_upload: "วิเคราะห์ด้วย AI", manual_form: "บันทึกด้วยตนเอง" }

export function downloadAnalysesCsv(rows: ExportRow[]) {
  const header = [
    "วันที่", "เลขที่", "ประเภท", "ผู้ใช้", "อีเมลผู้ใช้", "ชื่อเกษตรกร", "โทรศัพท์", "ที่อยู่", "ชื่อแปลง",
    "ตำบล", "อำเภอ", "จังหวัด", "ละติจูด", "ลองจิจูด", "ประเภทพืช", "พืช",
    "OM (%)", "P (มก./กก.)", "K (มก./กก.)", "pH",
    "OM แล็บ", "P แล็บ", "K แล็บ", "pH แล็บ",
    "รูปแบบปุ๋ย", "N ที่ต้องการ", "P2O5 ที่ต้องการ", "K2O ที่ต้องการ", "หน่วย", "ปริมาณปุ๋ยรวม",
  ]
  const lines = rows.map((r) => {
    const res = r.analysis_results?.[0]
    const report = res?.fertilizer_plan as ReportData | null | undefined
    const totals = report?.plan
      ? [
          ...report.plan.total.map((t) => `${t.grade} ${t.amount} ${report.plan.massUnit}`),
          ...(report.plan.organicTotalKg ? [`ปุ๋ยอินทรีย์ ${report.plan.organicTotalKg} กก.`] : []),
        ].join("; ")
      : ""
    return [
      new Date(String(r.created_at)).toLocaleString("th-TH"),
      String(r.id).slice(0, 8).toUpperCase(),
      INPUT_TH[String(r.input_mode)] ?? r.input_mode,
      r.user?.full_name || r.user?.nickname || "",
      r.user?.email ?? "",
      r.farmer_name, r.farmer_phone, r.address, r.plot_name,
      r.district, r.amphur, r.province, r.latitude, r.longitude,
      r.crops?.crop_types?.name ?? "", r.crops?.name ?? "",
      r.om_value, r.p_value, r.k_value, r.ph_value,
      r.lab_om, r.lab_p, r.lab_k, r.lab_ph,
      MODE_TH[String(r.fert_mode)] ?? "",
      res?.recommended_n, res?.recommended_p2o5, res?.recommended_k2o, res?.unit,
      totals,
    ].map(esc).join(",")
  })
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `soil-analyses-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
