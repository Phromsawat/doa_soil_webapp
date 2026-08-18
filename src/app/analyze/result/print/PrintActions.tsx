"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Printer, ArrowLeft } from "lucide-react"

/**
 * แถบปุ่มของหน้ารายงาน — ซ่อนตอนพิมพ์ (คลาส no-print)
 * เปิดหน้าแล้วเรียก dialog พิมพ์ให้เลย ผู้ใช้เลือก "Save as PDF" ได้จากที่นั่น
 */
export default function PrintActions({ autoPrint }: { autoPrint: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!autoPrint) return
    // รอให้ฟอนต์/รูปโหลดเสร็จก่อน ไม่งั้น dialog จับหน้าที่ยังไม่จัดวางเสร็จ
    let cancelled = false
    const run = async () => {
      try { await document.fonts.ready } catch { /* เบราว์เซอร์ไม่รองรับ */ }
      await new Promise((r) => setTimeout(r, 400))
      if (!cancelled) window.print()
    }
    run()
    return () => { cancelled = true }
  }, [autoPrint])

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
        <Printer className="h-4 w-4" /> พิมพ์ / บันทึกเป็น PDF
      </button>
    </div>
  )
}
