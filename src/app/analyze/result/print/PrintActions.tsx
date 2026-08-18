"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileDown, ArrowLeft, Loader2 } from "lucide-react"
import { downloadReportPdf, type ReportData } from "@/lib/pdf/reportPdf"

/**
 * แถบปุ่มของหน้ารายงาน — ซ่อนตอนพิมพ์ (คลาส no-print)
 *
 * ปุ่มดาวน์โหลดสร้างไฟล์ PDF เองแล้วเซฟลงเครื่องเลย ไม่เปิดกล่องพิมพ์ของเบราว์เซอร์
 * (jsPDF ถูก import แบบ dynamic ตอนกด จึงไม่ถ่วง bundle ของหน้าอื่น)
 */
export default function PrintActions({
  data,
  filename,
}: {
  data: ReportData
  filename: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setBusy(true)
    setError(null)
    try {
      await downloadReportPdf(data, filename)
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้างไฟล์ PDF ไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="no-print mx-auto mb-4 max-w-[210mm] px-4">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> กลับ
        </button>
        <button
          onClick={handleDownload}
          disabled={busy}
          className="flex items-center gap-2 rounded-full bg-[#1A4D2E] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#143a22] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {busy ? "กำลังสร้างไฟล์…" : "ดาวน์โหลด PDF"}
        </button>
      </div>
      {error && <p className="mt-2 text-right text-xs text-red-600">{error}</p>}
    </div>
  )
}
