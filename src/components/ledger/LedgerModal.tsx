"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

/**
 * กล่องกรอกข้อมูลของสมุดบัญชี — มือถือเด้งขึ้นจากล่าง จอใหญ่อยู่กลางจอ
 * หน้าแม่เป็นคน mount/unmount เอง (ไม่มี prop `open`) เพื่อให้ค่าในฟอร์มรีเซ็ตเองทุกครั้งที่เปิดใหม่
 */
export default function LedgerModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  // ล็อกไม่ให้หน้าหลังกล่องเลื่อนตาม
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3.5">
          <h2 className="font-thai text-base font-bold text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}
