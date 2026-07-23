"use client"

import { Plus, X, Loader2 } from "lucide-react"
import type { FertilizerFormulaRow } from "@/lib/supabase/fertilizerFormulas"

/**
 * ตัวเลือกสูตรปุ๋ย 1-3 สูตร (controlled) — เป็น input ล้วน ๆ ไม่คำนวณอะไร
 * ผู้เรียกถือ state `picked` และเป็นคนคำนวณ blend ตอนกดปุ่ม
 */
export default function FertilizerPicker({
  formulas,
  loading,
  picked,
  onChange,
}: {
  formulas: FertilizerFormulaRow[]
  loading: boolean
  picked: string[]
  onChange: (picked: string[]) => void
}) {
  const optionsFor = (currentId: string) =>
    formulas.filter((f) => f.id === currentId || !picked.includes(f.id))

  const setSlot = (i: number, value: string) =>
    onChange(picked.map((v, idx) => (idx === i ? value : v)))
  const addSlot = () => picked.length < 3 && onChange([...picked, ""])
  const removeSlot = (i: number) =>
    picked.length > 1 && onChange(picked.filter((_, idx) => idx !== i))

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายการปุ๋ย…
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {picked.map((id, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={id}
              onChange={(e) => setSlot(i, e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A4D2E] focus:outline-none"
            >
              <option value="">— เลือกปุ๋ย —</option>
              {optionsFor(id).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.grade ? ` (${f.grade})` : ""}
                </option>
              ))}
            </select>
            {picked.length > 1 && (
              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                aria-label="ลบปุ๋ย"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {picked.length < 3 && (
        <button
          type="button"
          onClick={addSlot}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-[#1A4D2E] hover:opacity-80"
        >
          <Plus className="h-4 w-4" /> เพิ่มปุ๋ยอีกสูตร
        </button>
      )}
    </>
  )
}
