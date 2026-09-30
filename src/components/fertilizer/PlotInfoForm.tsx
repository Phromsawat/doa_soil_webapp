"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { MapPin, Loader2 } from "lucide-react"
import type { FarmerInfo } from "@/lib/report"

const MapPicker = dynamic(() => import("@/app/analyze/map/MapPicker"), { ssr: false })

type IndexEntry = { t: string; nth: string; pth?: string; dth?: string; b: [number, number, number, number] }
let indexCache: IndexEntry[] | null = null

/** หา ตำบล/อำเภอ/จังหวัด จากพิกัด (กรอบของตำบลที่เล็กที่สุดที่ครอบจุดนั้น) */
export async function lookupAdminArea(lat: number, lng: number) {
  if (!indexCache) indexCache = await fetch("/boundaries/search-index.json").then((r) => r.json())
  let best: IndexEntry | null = null
  let bestArea = Infinity
  for (const e of indexCache!) {
    if (e.t !== "sub") continue
    const [minLng, minLat, maxLng, maxLat] = e.b
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue
    const area = (maxLng - minLng) * (maxLat - minLat)
    if (area < bestArea) {
      best = e
      bestArea = area
    }
  }
  return best ? { district: best.nth, amphur: best.dth ?? "", province: best.pth ?? "" } : null
}

/** ข้อมูลเกษตรกร + พื้นที่ปลูก (ชื่อ ที่อยู่ พิกัด) — แสดงในหน้าพิมพ์รายงาน */
export default function PlotInfoForm({
  value,
  onChange,
}: {
  value: FarmerInfo
  onChange: (v: FarmerInfo) => void
}) {
  const [mapOpen, setMapOpen] = useState(false)
  const [looking, setLooking] = useState(false)
  const set = (k: keyof FarmerInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value })

  async function handlePick(lat: number, lng: number) {
    setMapOpen(false)
    const next = { ...value, lat: lat.toFixed(6), lng: lng.toFixed(6) }
    onChange(next)
    setLooking(true)
    try {
      const area = await lookupAdminArea(lat, lng)
      if (area) onChange({ ...next, ...area })
    } finally {
      setLooking(false)
    }
  }

  const input =
    "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-base focus:border-[#1A4D2E] focus:bg-white focus:outline-none"
  const label = "text-sm text-gray-600"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>ชื่อ-นามสกุล เกษตรกร</span>
          <input value={value.name} onChange={set("name")} placeholder="เช่น นายสมชาย ใจดี" className={input} />
        </label>
        <label className="block">
          <span className={label}>เบอร์โทรศัพท์</span>
          <input value={value.phone} onChange={set("phone")} inputMode="tel" placeholder="08x-xxx-xxxx" className={input} />
        </label>
        <label className="block">
          <span className={label}>ชื่อแปลง / รหัสแปลง</span>
          <input value={value.plot} onChange={set("plot")} placeholder="เช่น แปลงทุเรียนหลังบ้าน" className={input} />
        </label>
        <label className="block">
          <span className={label}>ที่อยู่ (บ้านเลขที่ หมู่ ถนน)</span>
          <input value={value.address} onChange={set("address")} placeholder="เช่น 12 หมู่ 3" className={input} />
        </label>
        <label className="block">
          <span className={label}>ตำบล</span>
          <input value={value.district} onChange={set("district")} className={input} />
        </label>
        <label className="block">
          <span className={label}>อำเภอ</span>
          <input value={value.amphur} onChange={set("amphur")} className={input} />
        </label>
        <label className="block">
          <span className={label}>จังหวัด</span>
          <input value={value.province} onChange={set("province")} className={input} />
        </label>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">พิกัดพื้นที่ปลูก</p>
            <p className="text-sm tabular-nums text-gray-600">
              {value.lat && value.lng ? `${value.lat}, ${value.lng}` : "ยังไม่ได้ระบุ"}
              {looking && <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#1A4D2E] px-4 h-10 text-sm font-semibold text-white hover:bg-[#143a22]"
          >
            <MapPin className="h-4 w-4" /> {value.lat ? "เปลี่ยนพิกัด" : "ปักหมุดบนแผนที่"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>ละติจูด</span>
            <input value={value.lat} onChange={set("lat")} inputMode="decimal" className={input} />
          </label>
          <label className="block">
            <span className={label}>ลองจิจูด</span>
            <input value={value.lng} onChange={set("lng")} inputMode="decimal" className={input} />
          </label>
        </div>
      </div>

      <Dialog.Root open={mapOpen} onOpenChange={setMapOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
          <Dialog.Content className="fixed inset-x-0 top-1/2 z-[101] mx-auto w-[95vw] max-w-3xl -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <Dialog.Title className="sr-only">เลือกพิกัดพื้นที่ปลูก</Dialog.Title>
            <Dialog.Description className="sr-only">ปักหมุดตำแหน่งแปลงปลูก</Dialog.Description>
            {mapOpen && (
              <MapPicker
                onConfirm={handlePick}
                onCancel={() => setMapOpen(false)}
                initialLat={value.lat ? Number(value.lat) : undefined}
                initialLng={value.lng ? Number(value.lng) : undefined}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
