"use client"

import { useEffect, useState } from "react"
import { getCropNote } from "@/lib/supabase/fertilizerPlan"

/**
 * หมายเหตุการใส่ปุ๋ยของพืช (คำแนะนำเพิ่มเติมของกรมวิชาการเกษตร)
 * แสดงต่อจากขั้นที่ 6 — คืน null (ไม่แสดงอะไร) ถ้าพืชนี้ไม่มีหมายเหตุ
 */
export default function CropNote({ cropId }: { cropId: string }) {
  const [note, setNote] = useState<{ note: string; source: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    getCropNote(cropId)
      .then((n) => !cancelled && setNote(n))
      .catch(() => !cancelled && setNote(null))
    return () => {
      cancelled = true
    }
  }, [cropId])

  if (!note) return null

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
        <div className="mb-1.5 text-sm font-semibold text-amber-800">หมายเหตุ</div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
          {note.note}
        </p>
        {note.source && (
          <p className="mt-3 border-t border-amber-200/70 pt-2 text-xs text-gray-500">
            ที่มา: {note.source}
          </p>
        )}
      </div>
    </div>
  )
}
