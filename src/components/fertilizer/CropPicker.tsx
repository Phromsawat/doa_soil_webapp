"use client"

import { useMemo, useState } from "react"
import { Check } from "lucide-react"
import type { CropOption } from "@/lib/supabase/fertilizer"
import { CropIcon } from "./cropIcons"

// ลำดับประเภทพืชที่อยากให้แสดง
const TYPE_ORDER = ["ไม้ผล", "พืชไร่", "พืชผัก", "ข้าว"] as const

export default function CropPicker({
  crops,
  value,
  onChange,
}: {
  crops: CropOption[]
  value: string
  onChange: (cropId: string) => void
}) {
  // จัดกลุ่มพืชตามประเภท เรียงตาม TYPE_ORDER (ประเภทที่ไม่รู้จักต่อท้าย)
  const grouped = useMemo(() => {
    const byType = crops.reduce<Record<string, CropOption[]>>((acc, c) => {
      ;(acc[c.crop_type_name] = acc[c.crop_type_name] ?? []).push(c)
      return acc
    }, {})
    const known = TYPE_ORDER.filter((t) => byType[t]?.length)
    const extra = Object.keys(byType).filter((t) => !TYPE_ORDER.includes(t as (typeof TYPE_ORDER)[number]))
    return [...known, ...extra].map((t) => ({ type: t, list: byType[t] }))
  }, [crops])

  // ประเภทที่กำลังเปิดอยู่ — ตั้งต้นจากประเภทของพืชที่เลือกไว้ (ถ้ามี)
  const selectedType = crops.find((c) => c.id === value)?.crop_type_name
  const [activeType, setActiveType] = useState<string>(selectedType ?? "")

  const activeList = grouped.find((g) => g.type === activeType)?.list ?? []

  return (
    <div>
      <style>{`@keyframes cropIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      {/* ① เลือกประเภทพืช */}
      <div className="grid grid-cols-4 gap-2">
        {grouped.map(({ type }) => {
          const active = type === activeType
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(active ? "" : type)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition ${
                active
                  ? "border-[#1A4D2E] bg-[#F1F7F2] text-[#1A4D2E] shadow-sm"
                  : "border-gray-200 bg-gray-50/60 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <CropIcon name="" type={type} className="h-7 w-7" />
              {type}
            </button>
          )
        })}
      </div>

      {/* ② พืชในประเภทที่เลือก — ทยอยเด้งขึ้นมาทีละใบ */}
      {activeType && (
        <div key={activeType} className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {activeList.map((c, i) => {
            const active = c.id === value
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(c.id)}
                style={{ animation: "cropIn .28s ease-out both", animationDelay: `${i * 30}ms` }}
                className={`relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center text-xs font-medium transition ${
                  active
                    ? "border-[#1A4D2E] bg-[#1A4D2E] text-white shadow"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#1A4D2E]/40 hover:bg-[#F1F7F2]"
                }`}
              >
                {active && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#1A4D2E]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
                <CropIcon name={c.name} type={c.crop_type_name} className="h-8 w-8" />
                <span className="leading-tight">{c.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {!activeType && (
        <p className="mt-3 rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-400">
          เลือกประเภทพืชด้านบนเพื่อดูรายการพืช
        </p>
      )}
    </div>
  )
}
