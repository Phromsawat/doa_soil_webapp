"use client"

import { useState } from "react"
import { ChevronDown, TableProperties } from "lucide-react"
import { levelNames, rangeLabel, type Range } from "@/lib/soil/advice"

const ROWS: { key: "om" | "p" | "k"; label: string; unit: string }[] = [
  { key: "om", label: "อินทรียวัตถุ (OM)", unit: "%" },
  { key: "p", label: "ฟอสฟอรัส (P)", unit: "มก./กก." },
  { key: "k", label: "โพแทสเซียม (K)", unit: "มก./กก." },
]

const LEVEL_BG = ["#FDE2E0", "#FFF1D6", "#E3F2E1", "#D3EBCF", "#C3E3BE"]

/**
 * ตาราง "ค่ามาตรฐานธาตุอาหาร" (เกณฑ์ความเข้มข้น ต่ำ/ปานกลาง/สูง) — ซ่อน/แสดงได้
 * ถ้าเลือกพืชแล้วแสดงช่วงตามตารางคำแนะนำของพืชนั้น, ยังไม่เลือกแสดงเกณฑ์ทั่วไป
 */
export default function SoilStandardPanel({
  ranges,
  cropName,
}: {
  ranges: Record<"om" | "p" | "k", Range[]>
  cropName?: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[15px] font-semibold text-gray-800">
          <TableProperties className="h-4 w-4 text-[#1A4D2E]" />
          ค่ามาตรฐานธาตุอาหาร (เกณฑ์ความเข้มข้น)
        </span>
        <span className="flex items-center gap-1 text-sm text-[#1A4D2E]">
          {open ? "ซ่อนตาราง" : "แสดงตาราง"}
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <p className="mb-2 text-sm text-gray-500">
            {cropName ? `เกณฑ์ตามตารางคำแนะนำของ${cropName}` : "เกณฑ์ทั่วไป (เลือกพืชแล้วจะแสดงเกณฑ์ของพืชนั้น)"}
          </p>
          <div className="space-y-3">
            {ROWS.map((row) => {
              const list = ranges[row.key]
              if (!list?.length) return null
              const names = levelNames(list.length)
              return (
                <div key={row.key}>
                  <p className="mb-1 text-sm font-semibold text-gray-700">
                    {row.label} <span className="font-normal text-gray-400">({row.unit})</span>
                  </p>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}>
                    {list.map((r, i) => (
                      <div
                        key={i}
                        className="rounded-lg px-2 py-2 text-center"
                        style={{ background: LEVEL_BG[Math.round((i / Math.max(1, list.length - 1)) * 2)] }}
                      >
                        <p className="text-xs font-semibold text-gray-600">{names[i]}</p>
                        <p className="text-[15px] font-bold tabular-nums text-gray-900">{rangeLabel(r)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
