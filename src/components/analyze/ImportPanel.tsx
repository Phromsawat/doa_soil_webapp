"use client"

import { useRef, useState } from "react"
import { Download, FileSpreadsheet, Loader2, Upload, X, Check, AlertTriangle } from "lucide-react"
import { readSheetFile } from "@/lib/importer/readSheet"
import {
  buildTemplateCsv,
  mapHeader,
  toRawRows,
  type RawRow,
} from "@/lib/importer/soilTemplate"
import {
  previewBulkAnalyses,
  saveBulkAnalyses,
  type BulkRowResult,
} from "@/lib/supabase/bulkAnalysis"
import type { CropOption } from "@/lib/supabase/fertilizer"
import type { FertilizerFormulaRow } from "@/lib/supabase/fertilizerFormulas"

const norm = (s: string) => s.replace(/[\s.\-_]/g, "").toLowerCase()

export interface FilledRow {
  cropId: string
  om: string
  p: string
  k: string
  ph: string
  formulaIds: string[]
}

/**
 * นำเข้าผลวิเคราะห์ดินจากไฟล์ Excel/CSV
 *  - ไฟล์มีแถวเดียว  -> เติมค่าลงฟอร์มให้ผู้ใช้ตรวจแล้วกดคำนวณเอง
 *  - ไฟล์หลายแถว    -> ตารางพรีวิว + คำนวณและบันทึกทั้งหมดในครั้งเดียว
 */
export default function ImportPanel({
  crops,
  formulas,
  onFillForm,
}: {
  crops: CropOption[]
  formulas: FertilizerFormulaRow[]
  onFillForm: (row: FilledRow) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<null | "reading" | "saving">(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [rows, setRows] = useState<RawRow[] | null>(null)
  const [preview, setPreview] = useState<BulkRowResult[] | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  function reset() {
    setRows(null); setPreview(null); setError(null); setInfo(null); setSavedCount(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function downloadTemplate() {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "เทมเพลตนำเข้าผลวิเคราะห์ดิน.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(file: File) {
    reset()
    setBusy("reading")
    try {
      const sheet = await readSheetFile(file)
      if (sheet.length < 2) throw new Error("ไฟล์ไม่มีข้อมูล (ต้องมีหัวตาราง 1 แถว และข้อมูลอย่างน้อย 1 แถว)")

      const { index, missing } = mapHeader(sheet[0])
      if (missing.length > 0) {
        throw new Error(`หัวตารางไม่ครบ ขาดคอลัมน์: ${missing.join(" · ")} — ลองโหลดเทมเพลตไปใช้ดูครับ`)
      }

      const raw = toRawRows(sheet, index)
      if (raw.length === 0) throw new Error("ไม่พบแถวข้อมูลในไฟล์")

      // แถวเดียว -> เติมลงฟอร์มเลย ไม่ต้องผ่านโหมดตาราง
      if (raw.length === 1) {
        const r = raw[0]
        const crop = crops.find((c) => norm(c.name) === norm(r.crop ?? ""))
        if (!crop) throw new Error(`ไม่รู้จักพืช "${r.crop ?? ""}" — ตรวจชื่อพืชในไฟล์อีกครั้ง`)
        const ids = [r.fert1, r.fert2, r.fert3]
          .filter(Boolean)
          .map((v) => formulas.find((f) => norm(f.grade ?? "") === norm(v!) || norm(f.name) === norm(v!)))
          .filter((f): f is FertilizerFormulaRow => !!f)
          .map((f) => f.id)
        onFillForm({
          cropId: crop.id,
          om: r.om ?? "", p: r.p ?? "", k: r.k ?? "", ph: r.ph ?? "",
          formulaIds: ids,
        })
        setInfo(`เติมค่าจากไฟล์ลงฟอร์มแล้ว (${crop.name}) — ตรวจความถูกต้องแล้วกดคำนวณได้เลย`)
        setBusy(null)
        return
      }

      setRows(raw)
      setPreview((await previewBulkAnalyses(raw)).rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function handleSaveAll() {
    if (!rows) return
    setBusy("saving")
    setError(null)
    try {
      const res = await saveBulkAnalyses(rows)
      setPreview(res.rows)
      setSavedCount(res.saved)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const okCount = preview?.filter((r) => r.ok).length ?? 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      {/* แถบนี้เป็นทางลัด ไม่ใช่ขั้นตอนหลักของหน้า จึงคุมให้เตี้ยและสีจางกว่าปุ่มในฟอร์ม */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FileSpreadsheet className="h-4 w-4 shrink-0 text-gray-400" />
        <div className="mr-auto min-w-0">
          <p className="text-[13px] font-medium text-gray-600">นำเข้าจากไฟล์ Excel / CSV</p>
          <p className="text-[11px] text-gray-400">คำนวณและบันทึกลงประวัติพร้อมกัน</p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Download className="h-3.5 w-3.5" /> เทมเพลต
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "reading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          เลือกไฟล์
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {info && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{info}</p>
      )}
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {preview && (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
              <Check className="h-3 w-3" /> พร้อมบันทึก {okCount} แถว
            </span>
            {preview.length - okCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                <AlertTriangle className="h-3 w-3" /> มีปัญหา {preview.length - okCount} แถว
              </span>
            )}
            <button
              type="button"
              onClick={reset}
              className="ml-auto inline-flex items-center gap-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" /> ล้าง
            </button>
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[40rem] border-collapse text-xs">
              <thead className="sticky top-0 bg-gray-50/95">
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-3 py-2 font-medium text-gray-600">แถว</th>
                  <th className="px-3 py-2 font-medium text-gray-600">พืช</th>
                  <th className="px-3 py-2 font-medium text-gray-600">OM / P / K</th>
                  <th className="px-3 py-2 font-medium text-gray-600">ธาตุอาหารที่ต้องการ</th>
                  <th className="px-3 py-2 font-medium text-gray-600">ปุ๋ยที่ต้องใช้</th>
                  <th className="px-3 py-2 font-medium text-gray-600">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((r) => (
                  <tr key={r.rowNumber} className={r.ok ? "" : "bg-amber-50/50"}>
                    <td className="px-3 py-2 text-gray-400">{r.rowNumber}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">{r.cropName ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {[r.om, r.p, r.k].map((v) => v ?? "—").join(" / ")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {r.target
                        ? `${r.target.n ?? "—"} / ${r.target.p2o5 ?? "—"} / ${r.target.k2o ?? "—"}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {r.blend.length > 0
                        ? r.blend.map((b) => `${b.grade} ${b.amount.toLocaleString("th-TH")}`).join(" · ")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.ok ? (
                        <span className="whitespace-nowrap font-medium text-emerald-600">พร้อมบันทึก</span>
                      ) : (
                        <span className="text-amber-700">{r.errors.join(" · ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {savedCount === null ? (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={busy !== null || okCount === 0}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1A4D2E] text-sm font-medium text-white hover:bg-[#143a22] disabled:opacity-50"
            >
              {busy === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
              คำนวณและบันทึกทั้งหมด ({okCount} แถว)
            </button>
          ) : (
            <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
              บันทึกลงประวัติแล้ว {savedCount.toLocaleString("th-TH")} รายการ
              {preview.length - savedCount > 0 && ` · ข้าม ${preview.length - savedCount} แถวที่มีปัญหา`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
