"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, Loader2, RotateCcw, Upload } from "lucide-react"
import { resetSiteLogo, uploadSiteLogo } from "@/lib/supabase/settings"

/**
 * เปลี่ยนโลโก้เว็บไซต์ — ใช้ทั้งแถบเมนู หน้าเข้าสู่ระบบ/สมัคร/ลืมรหัส และหัวรายงาน PDF
 * ทุกจุดอ่านผ่าน /api/site-logo (แคช ~1 นาที) จึงเห็นผลทั้งเว็บภายในราว 1 นาทีหลังบันทึก
 */
export default function SiteLogoUploader({
  customised,
  updatedAt,
}: {
  customised: boolean
  updatedAt: string | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  // ต่อท้าย URL ให้รูปตัวอย่างโหลดใหม่ทันทีหลังเปลี่ยน (ไม่ติดแคชของเบราว์เซอร์)
  const [version, setVersion] = useState(() => updatedAt ?? "default")

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      await uploadSiteLogo(fd)
      setVersion(String(Date.now()))
      setDone("เปลี่ยนโลโก้แล้ว — หน้าอื่นจะเห็นโลโก้ใหม่ภายในราว 1 นาที")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleReset() {
    if (!confirm("กลับไปใช้โลโก้ตั้งต้น (ตรากรมวิชาการเกษตร)?")) return
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      await resetSiteLogo()
      setVersion(String(Date.now()))
      setDone("กลับไปใช้โลโก้ตั้งต้นแล้ว")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <ImageIcon className="mt-0.5 h-5 w-5 text-[#1A4D2E]" />
        <div className="flex-1">
          <h2 className="font-semibold text-gray-800">โลโก้เว็บไซต์</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            แสดงที่แถบเมนูด้านบน หน้าเข้าสู่ระบบ/สมัครสมาชิก และหัวรายงาน PDF
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/site-logo?v=${encodeURIComponent(version)}`} alt="โลโก้ปัจจุบัน" className="h-full w-full object-contain" />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {customised ? "ใช้โลโก้ที่อัปโหลดไว้" : "ใช้โลโก้ตั้งต้น (ตรากรมวิชาการเกษตร)"}
            <br />
            ไฟล์ PNG, JPG, WebP หรือ SVG ไม่เกิน 2 MB — แนะนำรูปสี่เหลี่ยมจัตุรัส พื้นหลังโปร่งใส
          </p>
          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1A4D2E] px-4 py-2 text-sm font-medium text-white hover:bg-[#143a22] ${
                busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? "กำลังบันทึก…" : "อัปโหลดโลโก้ใหม่"}
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
            {customised && (
              <button
                onClick={handleReset}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" /> ใช้โลโก้ตั้งต้น
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {done && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{done}</p>}
    </div>
  )
}
