"use client"

import { useMemo, useState } from "react"
import { Check, X } from "lucide-react"
import type { CropOption } from "@/lib/supabase/fertilizer"
import { CropIcon } from "./cropIcons"

// ลำดับประเภทพืชที่อยากให้แสดง
const TYPE_ORDER = ["ไม้ผล", "พืชไร่", "พืชผัก", "ข้าว"] as const

// สีประจำประเภท — กรอบ/พื้นของปุ่มประเภทและการ์ดพืชในประเภทนั้น ให้แยกกลุ่มด้วยตาได้ทันที
// line = กรอบตอนปกติ, solid = กรอบตอนเลือก/พื้นการ์ดที่เลือก, tint = พื้นอ่อน, ink = ตัวอักษร
interface TypeColor { line: string; solid: string; tint: string; ink: string }
const TYPE_COLOR: Record<string, TypeColor> = {
  "ไม้ผล": { line: "#F5C9A6", solid: "#E07A2F", tint: "#FFF5EC", ink: "#A9531B" }, // ส้ม
  "พืชไร่": { line: "#DCC6A8", solid: "#9A6B3F", tint: "#FAF4EC", ink: "#74502E" }, // น้ำตาล
  "พืชผัก": { line: "#A8DAB5", solid: "#2F9E44", tint: "#EEF8F1", ink: "#21773A" }, // เขียว
  "ข้าว": { line: "#EBD58A", solid: "#C99A06", tint: "#FDF8E6", ink: "#8A6A04" },   // เหลืองทอง
}
const DEFAULT_COLOR: TypeColor = { line: "#E5E7EB", solid: "#1A4D2E", tint: "#F1F7F2", ink: "#1A4D2E" }
const colorOf = (type: string) => TYPE_COLOR[type] ?? DEFAULT_COLOR

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
        {grouped.map(({ type, list }) => {
          const active = type === activeType
          const c = colorOf(type)
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(active ? "" : type)}
              style={{
                borderColor: active ? c.solid : c.line,
                background: active ? c.tint : "#FFFFFF",
                color: c.ink,
                boxShadow: active ? `0 0 0 1px ${c.solid}` : undefined,
              }}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition hover:brightness-[0.98] ${
                active ? "shadow-sm" : ""
              }`}
            >
              <CropIcon name="" type={type} typeImageUrl={list[0]?.crop_type_image_url} className="h-7 w-7" />
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
            const tc = colorOf(c.crop_type_name)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(c.id)}
                style={{
                  animation: "cropIn .28s ease-out both",
                  animationDelay: `${i * 30}ms`,
                  borderColor: active ? tc.solid : tc.line,
                  background: active ? tc.solid : "#FFFFFF",
                }}
                className={`relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center text-xs font-medium transition ${
                  active ? "text-white shadow" : "text-gray-700 hover:brightness-[0.97]"
                }`}
              >
                {active && (
                  <span
                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white"
                    style={{ color: tc.solid }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
                <CropIcon
                  name={c.name}
                  type={c.crop_type_name}
                  imageUrl={c.image_url}
                  typeImageUrl={c.crop_type_image_url}
                  className="h-8 w-8"
                />
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
