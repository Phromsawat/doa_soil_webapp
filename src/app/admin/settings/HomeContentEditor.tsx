"use client"

import { useState } from "react"
import { Loader2, Save, CheckCircle2, FileText } from "lucide-react"
import { setHomeContent, type HomeContent } from "@/lib/supabase/settings"
import { translations } from "@/lib/TH_ENG"

const th = translations.th

// ช่องที่แก้ได้ + ค่าตั้งต้น (แสดงเป็น placeholder — เว้นว่าง = ใช้ค่าตั้งต้น)
const FIELDS: { key: keyof HomeContent; label: string; fallback: string; multiline?: boolean }[] = [
  { key: "title", label: "หัวข้อหลัก (Hero)", fallback: th.title },
  { key: "subtitle", label: "คำอธิบายใต้หัวข้อ", fallback: `${th.subtitle1}\n${th.subtitle2}`, multiline: true },
  { key: "projectDetailsTitle", label: "หัวข้อรายละเอียดโครงการ", fallback: th.projectDetailsTitle },
  { key: "projectDescription", label: "รายละเอียดโครงการ", fallback: th.projectDescription, multiline: true },
  { key: "organizedByTitle", label: "หัวข้อผู้จัดทำ", fallback: th.organizedByTitle },
  { key: "organizedByDesc", label: "ผู้จัดทำ", fallback: th.organizedByDesc, multiline: true },
  {
    key: "contact",
    label: "สถานที่ติดต่อ (หลายบรรทัด)",
    fallback: [th.contactDept1, th.contactDept2, th.contactDept3, th.contactDept4, th.contactPhoneShort].join("\n"),
    multiline: true,
  },
  { key: "address", label: "ที่อยู่", fallback: th.addressFull, multiline: true },
  { key: "businessHours", label: "เวลาทำการ", fallback: th.businessHoursFull },
  { key: "phone", label: "โทรศัพท์", fallback: th.contactPhoneShort },
  { key: "email", label: "อีเมล", fallback: "soilandwatergroup@doa.in.th" },
]

/** แก้ไขรายละเอียดโครงการในหน้าแรก (ภาษาไทย) */
export default function HomeContentEditor({ initial }: { initial: HomeContent | null }) {
  const [value, setValue] = useState<HomeContent>(initial ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await setHomeContent(value)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const input =
    "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[15px] focus:border-[#1A4D2E] focus:bg-white focus:outline-none"

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-[#1A4D2E]" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">เนื้อหาหน้าแรก</h2>
          <p className="text-sm text-gray-500">แก้ไขรายละเอียดโครงการ/ช่องทางติดต่อ — ช่องที่เว้นว่างจะใช้ข้อความตั้งต้น (สีจาง)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={`block ${f.multiline ? "md:col-span-2" : ""}`}>
            <span className="text-sm font-semibold text-gray-700">{f.label}</span>
            {f.multiline ? (
              <textarea
                rows={3}
                value={value[f.key] ?? ""}
                placeholder={f.fallback}
                onChange={(e) => setValue({ ...value, [f.key]: e.target.value })}
                className={input}
              />
            ) : (
              <input
                value={value[f.key] ?? ""}
                placeholder={f.fallback}
                onChange={(e) => setValue({ ...value, [f.key]: e.target.value })}
                className={input}
              />
            )}
          </label>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex h-10 items-center gap-2 rounded-full bg-[#1A4D2E] px-6 text-sm font-bold text-white hover:bg-[#143a22] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} บันทึกเนื้อหา
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> บันทึกแล้ว — หน้าแรกอัปเดตทันที
          </span>
        )}
      </div>
    </div>
  )
}
