"use client"

import { useRef, useState } from "react"
import { Loader2, RotateCcw, Upload } from "lucide-react"
import { CropIcon } from "@/components/fertilizer/cropIcons"
import {
  resetCropImage,
  resetCropTypeImage,
  uploadCropImage,
  uploadCropTypeImage,
} from "@/lib/supabase/cropImages"

// ไอคอนแสดงจริงแค่ราว 32 px — ย่อเหลือด้านยาวสุด 256 px ก่อนส่ง
// ให้อัปโหลดรูปถ่ายจากมือถือได้เลยโดยไม่ทำให้หน้าเลือกพืชโหลดช้า
const MAX_SIDE = 256

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("เปิดไฟล์รูปนี้ไม่ได้ — ใช้ไฟล์ PNG, JPG หรือ WebP")) }
    img.src = url
  })
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

async function shrink(file: File): Promise<File> {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
  // WebP เล็กและเก็บพื้นโปร่งใสได้ — เบราว์เซอร์ที่สร้าง WebP ไม่ได้จะคืน PNG มาแทน
  let blob = await canvasBlob(canvas, "image/webp", 0.9)
  if (!blob || blob.type !== "image/webp") blob = await canvasBlob(canvas, "image/png")
  if (!blob) throw new Error("แปลงรูปไม่สำเร็จ")
  return new File([blob], blob.type === "image/webp" ? "icon.webp" : "icon.png", { type: blob.type })
}

/**
 * รูปของพืชหนึ่งชนิด หรือของประเภทพืชหนึ่งประเภท — อัปโหลดแทนไอคอนเดิม หรือกลับไปใช้ไอคอนเดิม
 * compact = การ์ดเล็กในแถวประเภทพืช (หน้ารายการพืช)
 */
export default function CropImageField({
  kind,
  id,
  name,
  type,
  imageUrl,
  typeImageUrl,
  onChange,
  compact = false,
}: {
  kind: "crop" | "type"
  id: string
  /** ชื่อพืช (ใช้หาไอคอนเดิม) — ประเภทพืชส่ง "" */
  name: string
  type: string
  imageUrl: string | null
  typeImageUrl?: string | null
  onChange?: (url: string | null) => void
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(imageUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = kind === "crop" ? `รูปของ${name}` : `รูปประเภท${type}`

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", await shrink(file))
      const next = kind === "crop" ? await uploadCropImage(id, fd) : await uploadCropTypeImage(id, fd)
      setUrl(next)
      onChange?.(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleReset() {
    if (!confirm(`ลบ${label}ที่อัปโหลดไว้ แล้วกลับไปใช้ไอคอนตั้งต้น?`)) return
    setBusy(true)
    setError(null)
    try {
      if (kind === "crop") await resetCropImage(id)
      else await resetCropTypeImage(id)
      setUrl(null)
      onChange?.(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const preview = (
    <CropIcon
      name={name}
      type={type}
      imageUrl={kind === "crop" ? url : null}
      typeImageUrl={kind === "type" ? url : typeImageUrl}
      className="h-full w-full"
    />
  )

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="hidden"
      onChange={(e) => handleFile(e.target.files?.[0])}
    />
  )

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <div className="relative h-12 w-12">
          {preview}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
              <Loader2 className="h-4 w-4 animate-spin text-[#1A4D2E]" />
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-gray-700">{type}</span>
        <div className="flex gap-1">
          <label
            title="อัปโหลดรูปใหม่"
            className={`flex h-7 cursor-pointer items-center gap-1 rounded-full bg-[#1A4D2E] px-2.5 text-[11px] font-bold text-white hover:bg-[#143a22] ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <Upload className="h-3 w-3" /> เปลี่ยน
            {fileInput}
          </label>
          {url && (
            <button
              type="button"
              title="ใช้ไอคอนตั้งต้น"
              onClick={handleReset}
              disabled={busy}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
        {error && <p className="text-center text-[11px] leading-tight text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-600">รูปพืช</label>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-3">
          {preview}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-[#1A4D2E]" />
            </span>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {url ? "ใช้รูปที่อัปโหลดไว้" : "ใช้ไอคอนตั้งต้น"} · แสดงในหน้าคำนวณปุ๋ย ขั้นเลือกพืช
            <br />
            ไฟล์ PNG, JPG หรือ WebP — ระบบย่อรูปให้เอง แนะนำรูปสี่เหลี่ยมจัตุรัส พื้นหลังโปร่งใส
          </p>
          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-[#1A4D2E] px-4 text-xs font-bold text-white hover:bg-[#143a22] ${
                busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <Upload className="h-3.5 w-3.5" /> อัปโหลดรูปใหม่
              {fileInput}
            </label>
            {url && (
              <button
                type="button"
                onClick={handleReset}
                disabled={busy}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-gray-200 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> ใช้ไอคอนตั้งต้น
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
