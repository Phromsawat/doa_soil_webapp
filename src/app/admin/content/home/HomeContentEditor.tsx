"use client"

import { useState } from "react"
import Link from "next/link"
import { Save, Loader2, Check, RotateCcw, ExternalLink } from "lucide-react"
import { saveHomeContent, resetHomeContent } from "@/lib/supabase/pageContent"
import {
  HOME_DEFAULTS,
  validateHome,
  type HomeContentInput,
  type HomeTextKey,
} from "@/lib/content/home"

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm leading-relaxed focus:border-[#1A4D2E] focus:outline-none"

// ช่องข้อความที่มีทั้งไทย/อังกฤษ แบ่งตามส่วนบนหน้าหลัก
const SECTIONS: { title: string; fields: { key: HomeTextKey; label: string; rows: number }[] }[] = [
  {
    title: "รายละเอียดของโครงการ",
    fields: [
      { key: "projectDescription", label: "คำอธิบายโครงการ", rows: 3 },
      { key: "organizedBy", label: "จัดทำโดย", rows: 2 },
      { key: "contactPlace", label: "สถานที่ติดต่อ (ขึ้นบรรทัดใหม่ได้)", rows: 4 },
    ],
  },
  {
    title: "ติดต่อเรา",
    fields: [
      { key: "address", label: "ที่อยู่", rows: 3 },
      { key: "businessHours", label: "เวลาทำการ", rows: 1 },
      { key: "phone", label: "เบอร์โทร", rows: 1 },
    ],
  },
]

/** "13.8466, 100.5749" (แบบที่คัดลอกจาก Google Maps) -> [lat, lng] */
function parseCoords(s: string): [number, number] | null {
  const m = s.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

export default function HomeContentEditor({
  initial,
  updatedAt,
  customised,
  canReset,
}: {
  initial: HomeContentInput
  updatedAt: string | null
  customised: boolean
  canReset: boolean
}) {
  const [c, setC] = useState<HomeContentInput>(initial)
  const [coords, setCoords] = useState(
    initial.lat !== null && initial.lng !== null ? `${initial.lat}, ${initial.lng}` : ""
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function mutate(next: HomeContentInput) {
    setC(next)
    setDirty(true)
    setSaved(false)
  }
  const setText = (lang: "th" | "en", key: HomeTextKey, v: string) =>
    mutate({ ...c, [lang]: { ...c[lang], [key]: v } })

  const parsed = coords.trim() ? parseCoords(coords) : null
  const coordsError = coords.trim() && !parsed ? "รูปแบบพิกัดไม่ถูกต้อง ตัวอย่าง: 13.846650, 100.574964" : null
  const mapLat = parsed?.[0] ?? HOME_DEFAULTS.lat
  const mapLng = parsed?.[1] ?? HOME_DEFAULTS.lng

  async function handleSave() {
    setError(null)
    if (coordsError) return setError(coordsError)
    const next: HomeContentInput = { ...c, lat: parsed?.[0] ?? null, lng: parsed?.[1] ?? null }
    const invalid = validateHome(next)
    if (invalid) return setError(invalid)
    setSaving(true)
    try {
      await saveHomeContent(next)
      setDirty(false)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm("คืนค่าหน้าหลักกลับไปใช้ข้อความตั้งต้น? การแก้ไขที่บันทึกไว้จะถูกลบทิ้ง")) return
    setSaving(true)
    setError(null)
    try {
      await resetHomeContent()
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <div className="font-thai space-y-5 pb-24">
      {/* หัวเรื่อง + ปุ่มหลัก */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Link href="/admin/content" className="text-xs text-gray-500 hover:text-gray-700">
            ← จัดการเนื้อหา
          </Link>
          <h1 className="text-xl font-bold text-gray-800 mt-1">หน้าหลัก</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            ส่วนรายละเอียดของโครงการ และติดต่อเรา
            {customised && updatedAt ? (
              <> · แก้ล่าสุด {new Date(updatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</>
            ) : (
              <span className="text-gray-400"> · ยังใช้ข้อความตั้งต้น</span>
            )}
          </p>
        </div>
        <Link
          href="/#about"
          target="_blank"
          className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" /> ดูหน้าจริง
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 rounded-full bg-[#1A4D2E] px-5 py-2 text-sm font-medium text-white hover:bg-[#143a22] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "กำลังบันทึก…" : saved && !dirty ? "บันทึกแล้ว" : "บันทึก"}
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {dirty && <p className="text-xs text-amber-600">มีการแก้ไขที่ยังไม่ได้บันทึก</p>}

      <p className="rounded-xl bg-[#F1F7F2] px-4 py-3 text-xs leading-relaxed text-gray-600">
        ช่องภาษาไทยแสดงเมื่อผู้ใช้เลือกภาษาไทย ช่องภาษาอังกฤษแสดงเมื่อเลือก English —
        ถ้าลบข้อความในช่องจนว่าง ระบบจะใช้ข้อความตั้งต้น (ข้อความสีเทาในช่อง) แทน
      </p>

      {/* ข้อความไทย/อังกฤษ */}
      {SECTIONS.map((sec) => (
        <div key={sec.title} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-800">{sec.title}</h2>
          <div className="space-y-4">
            {sec.fields.map((f) => (
              <div key={f.key} className="grid gap-3 sm:grid-cols-2">
                {(["th", "en"] as const).map((lang) => (
                  <label key={lang} className="block">
                    <span className="text-xs font-medium text-gray-500">
                      {f.label} <span className="text-gray-400">{lang === "th" ? "· ไทย" : "· อังกฤษ"}</span>
                    </span>
                    <textarea
                      className={inputCls}
                      rows={f.rows}
                      value={c[lang][f.key]}
                      placeholder={HOME_DEFAULTS[lang][f.key]}
                      onChange={(e) => setText(lang, f.key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ค่าที่ใช้ร่วมกันทั้งสองภาษา */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-gray-800">อีเมลและแผนที่ (ใช้ทั้งสองภาษา)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-gray-500">อีเมล</span>
            <input
              type="email"
              className={inputCls}
              value={c.email}
              placeholder={HOME_DEFAULTS.email}
              onChange={(e) => mutate({ ...c, email: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">ลิงก์ &ldquo;ดูแผนที่บน Google Maps&rdquo;</span>
            <input
              className={inputCls}
              value={c.mapsUrl}
              placeholder={HOME_DEFAULTS.mapsUrl}
              onChange={(e) => mutate({ ...c, mapsUrl: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-gray-500">
              พิกัดหมุดบนแผนที่ (ละติจูด, ลองจิจูด) — ใน Google Maps คลิกขวาที่ตำแหน่งแล้วกดพิกัดเพื่อคัดลอก
            </span>
            <input
              className={inputCls}
              value={coords}
              placeholder={`${HOME_DEFAULTS.lat}, ${HOME_DEFAULTS.lng}`}
              onChange={(e) => { setCoords(e.target.value); setDirty(true); setSaved(false) }}
            />
            {coordsError && <span className="mt-1 block text-xs text-red-600">{coordsError}</span>}
          </label>
        </div>
        <div className="mt-3 h-[220px] overflow-hidden rounded-xl border border-gray-200">
          <iframe
            title="ตัวอย่างแผนที่"
            src={`https://maps.google.com/maps?q=${mapLat},${mapLng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      {/* คืนค่าตั้งต้น */}
      {customised && canReset && (
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> คืนค่าข้อความตั้งต้น
          </button>
        </div>
      )}
    </div>
  )
}
