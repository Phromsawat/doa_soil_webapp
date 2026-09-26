"use client"

import { useMemo, useState } from "react"
import { Check, X } from "lucide-react"
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
  const selected = crops.find((c) => c.id === value)
  const selectedType = selected?.crop_type_name
  const [activeType, setActiveType] = useState<string>(selectedType ?? "")

  // พืชถูกเปลี่ยนจากภายนอก (เช่นนำเข้าไฟล์) → เปิดแท็บประเภทของพืชนั้นให้เห็น
  // ปรับ state ระหว่าง render แทน useEffect ตามแนวทางของ React
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (selectedType) setActiveType(selectedType)
  }

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

      {!activeType && !selected && (
        <p className="mt-3 rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-400">
          เลือกประเภทพืชด้านบนเพื่อดูรายการพืช
        </p>
      )}

      {/* ③ พืชที่เลือกอยู่ — แสดงเสมอ เพราะถ้าเปลี่ยนไปดูประเภทอื่น การ์ดพืชที่เลือกจะไม่อยู่ในจอ
          ผู้ใช้จะเข้าใจผิดว่ายังไม่ได้เลือกพืช ทั้งที่กดคำนวณได้ */}
      {selected && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#1A4D2E]/20 bg-[#F1F7F2] px-3 py-2 text-sm">
          <Check className="h-4 w-4 shrink-0 text-[#1A4D2E]" strokeWidth={3} />
          <span className="mr-auto text-gray-700">
            พืชที่เลือก: <span className="font-bold text-[#1A4D2E]">{selected.name}</span>
            <span className="text-gray-400"> · {selected.crop_type_name}</span>
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-gray-500 hover:bg-white hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" /> ล้าง
          </button>
        </div>
      )}
    </div>
  )
}
