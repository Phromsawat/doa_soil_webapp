"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, X, Loader2, ChevronDown, Search } from "lucide-react"
import type { FertilizerFormulaRow } from "@/lib/supabase/fertilizerFormulas"

function fmtLabel(f: FertilizerFormulaRow) {
  return `${f.name}${f.grade ? ` (${f.grade})` : ""}`
}

/** ช่องเลือกปุ๋ยแบบพิมพ์ค้นหาได้ (combobox) */
function FertilizerCombobox({
  value,
  options,
  onSelect,
}: {
  value: string
  options: FertilizerFormulaRow[]
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const selected = options.find((f) => f.id === value) ?? null
  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter((f) => fmtLabel(f).toLowerCase().includes(q)) : options

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        {open && (
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        )}
        <input
          type="text"
          value={open ? query : selected ? fmtLabel(selected) : ""}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setQuery("")
            setOpen(true)
          }}
          placeholder="ค้นหา / เลือกปุ๋ย…"
          className={`w-full rounded-lg border border-gray-200 py-2 pr-9 text-sm focus:border-[#1A4D2E] focus:outline-none ${
            open ? "pl-9" : "pl-3"
          }`}
        />
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">ไม่พบปุ๋ยที่ค้นหา</div>
          ) : (
            filtered.map((f) => (
              <button
                key={f.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(f.id)
                  setOpen(false)
                  setQuery("")
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#F1F7F2] ${
                  f.id === value ? "bg-[#F1F7F2] font-medium text-[#1A4D2E]" : "text-gray-700"
                }`}
              >
                {f.name}
                {f.grade ? <span className="text-gray-400"> ({f.grade})</span> : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

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
            <FertilizerCombobox
              value={id}
              options={optionsFor(id)}
              onSelect={(v) => setSlot(i, v)}
            />
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
