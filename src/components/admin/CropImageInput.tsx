"use client"

import { useRef } from "react"
import { ImagePlus, RotateCcw } from "lucide-react"
import { CropIcon } from "@/components/fertilizer/cropIcons"

// ย่อรูปเป็นสี่เหลี่ยมจัตุรัส 256px (crop กลางภาพ) แล้วคืนเป็น data URL (webp/jpeg)
// เก็บลงคอลัมน์ crops.image_url ได้ตรง ๆ ไม่ต้องพึ่ง Storage
async function toSquareDataUrl(file: File, size = 256): Promise<string> {
  const bmp = await createImageBitmap(file)
  const s = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size)
  const webp = canvas.toDataURL("image/webp", 0.85)
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85)
}

/** เลือก/เปลี่ยนรูปพืช — ว่าง = ใช้ไอคอนวาดเอง */
export default function CropImageInput({
  name,
  type,
  value,
  onChange,
}: {
  name: string
  type: string
  value: string | null
  onChange: (v: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-1">
        <CropIcon name={name} type={type} imageUrl={value} className="h-full w-full" />
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full border border-[#1A4D2E]/30 bg-white px-4 h-9 text-sm font-medium text-[#1A4D2E] hover:bg-[#F1F7F2]"
          >
            <ImagePlus className="h-4 w-4" /> {value ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 h-9 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" /> ใช้ไอคอนเดิม
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">รูปจะถูกครอปเป็นสี่เหลี่ยมจัตุรัสและย่อเหลือ 256×256 px อัตโนมัติ</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) onChange(await toSquareDataUrl(f))
        }}
      />
    </div>
  )
}
