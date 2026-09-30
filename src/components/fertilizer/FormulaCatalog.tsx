"use client"

import { useState } from "react"
import { BookOpen, ChevronDown } from "lucide-react"
import type { FertilizerFormulaRow } from "@/lib/supabase/fertilizerFormulas"

const KIND_LABEL: Record<string, string> = {
  chemical: "ปุ๋ยเคมี",
  organic: "ปุ๋ยอินทรีย์",
  biological: "ปุ๋ยชีวภาพ",
}

/** แถบ "ดูสูตรปุ๋ย" — รายการสูตรปุ๋ยทั้งหมดพร้อมค่า N-P₂O₅-K₂O (ซ่อน/แสดงได้) */
export default function FormulaCatalog({ formulas }: { formulas: FertilizerFormulaRow[] }) {
  const [open, setOpen] = useState(false)
  const groups = ["chemical", "organic", "biological"]
    .map((k) => ({ kind: k, list: formulas.filter((f) => f.kind === k) }))
    .filter((g) => g.list.length > 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[15px] font-semibold text-gray-800">
          <BookOpen className="h-4 w-4 text-[#1A4D2E]" /> ดูสูตรปุ๋ยทั้งหมด
        </span>
        <span className="flex items-center gap-1 text-sm text-[#1A4D2E]">
          {formulas.length} สูตร
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3">
          {groups.map((g) => (
            <div key={g.kind}>
              <p className="mb-1.5 text-sm font-bold text-gray-700">{KIND_LABEL[g.kind]}</p>
              <table className="w-full border-collapse text-[15px]">
                <thead>
                  <tr className="bg-[#F1F7F2] text-left text-[#1A4D2E]">
                    <th className="px-3 py-2 font-bold">ชื่อ</th>
                    <th className="px-2 py-2 text-right font-bold">N</th>
                    <th className="px-2 py-2 text-right font-bold">P₂O₅</th>
                    <th className="px-2 py-2 text-right font-bold">K₂O</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.list.map((f) => (
                    <tr key={f.id}>
                      <td className="px-3 py-2 text-gray-800">
                        {f.name}
                        {f.grade && f.grade !== f.name && <span className="text-gray-400"> ({f.grade})</span>}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{f.n_percent}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{f.p2o5_percent}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{f.k2o_percent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <p className="text-xs text-gray-400">หน่วย: % โดยน้ำหนัก</p>
        </div>
      )}
    </div>
  )
}
