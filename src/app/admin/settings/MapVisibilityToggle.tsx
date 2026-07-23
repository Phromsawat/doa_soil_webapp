"use client"

import { useState } from "react"
import Link from "next/link"
import { Map as MapIcon, ExternalLink, Loader2, Check } from "lucide-react"
import { setShowSoilMap } from "@/lib/supabase/settings"

export default function MapVisibilityToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    const next = !enabled
    setEnabled(next) // optimistic
    setSaving(true)
    setSavedAt(false)
    setError(null)
    try {
      await setShowSoilMap(next)
      setSavedAt(true)
    } catch (e) {
      setEnabled(!next) // revert
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F7F2] text-[#1A4D2E]">
            <MapIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-gray-800">แผนที่ดิน (OM/P/K)</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              เมื่อเปิด จะแสดงเมนู “แผนที่” ในหน้าหลักให้ผู้ใช้ทุกคนเข้าถึงได้
              <br />
              ปิดอยู่ = ซ่อนจากผู้ใช้ทั่วไป
            </p>
          </div>
        </div>

        {/* toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="เปิด/ปิดการแสดงแผนที่ดิน"
          onClick={toggle}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
            enabled ? "bg-[#1A4D2E]" : "bg-gray-300"
          } disabled:opacity-60`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            enabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {enabled ? "กำลังแสดงในหน้าหลัก" : "ซ่อนอยู่"}
        </span>

        {saving && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังบันทึก…
          </span>
        )}
        {savedAt && !saving && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3.5 w-3.5" /> บันทึกแล้ว
          </span>
        )}

        <Link
          href="/map"
          target="_blank"
          className="ml-auto flex items-center gap-1 text-xs font-medium text-[#1A4D2E] hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> เปิดดูแผนที่
        </Link>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          บันทึกไม่สำเร็จ: {error}
        </p>
      )}
    </div>
  )
}
