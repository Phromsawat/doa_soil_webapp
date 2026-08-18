"use client"

import { useRouter } from "next/navigation"
import { FileDown, ArrowLeft } from "lucide-react"

/**
 * แถบปุ่มของหน้ารายงาน — ซ่อนตอนบันทึกไฟล์ (คลาส no-print)
 *
 * ไม่เปิดกล่องบันทึกเองอัตโนมัติ ผู้ใช้ได้ดูรายงานก่อนแล้วค่อยกดเอง
 * หมายเหตุ: บนเว็บ การบันทึกเป็น PDF ต้องผ่านกล่องของเบราว์เซอร์
 * (เลือกปลายทางเป็น "Save as PDF" / "บันทึกเป็น PDF")
 */
export default function PrintActions() {
  const router = useRouter()

  return (
    <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> กลับ
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-full bg-[#1A4D2E] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#143a22]"
      >
        <FileDown className="h-4 w-4" /> บันทึกเป็น PDF
      </button>
    </div>
  )
}
