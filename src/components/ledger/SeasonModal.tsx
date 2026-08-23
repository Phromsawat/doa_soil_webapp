"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import LedgerModal from "./LedgerModal"
import type { Season } from "@/lib/supabase/ledger"
import type { CropOption } from "@/lib/supabase/fertilizer"

const FIELD =
  "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm focus:border-[#1A4D2E] focus:bg-white focus:outline-none"
const LABEL = "text-xs text-gray-500"

const todayISO = () => new Date().toISOString().slice(0, 10)

/**
 * สร้าง/แก้ไขรอบเพาะปลูก — ส่ง season เข้ามา = โหมดแก้ไข (มีปุ่มลบ)
 * หน้าแม่ mount ตัวนี้เฉพาะตอนเปิด ค่าเริ่มต้นจึงตั้งจาก props ได้ตรง ๆ
 */
export default function SeasonModal({
  season,
  crops,
  defaultName,
  onClose,
  onSave,
  onDelete,
}: {
  season: Season | null
  crops: CropOption[]
  defaultName: string
  onClose: () => void
  onSave: (values: {
    name: string
    crop_id: string | null
    started_on: string
    ended_on: string | null
    yield_kg: number | null
  }) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [name, setName] = useState(season?.name ?? defaultName)
  const [cropId, setCropId] = useState(season?.crop_id ?? "")
  const [startedOn, setStartedOn] = useState(season?.started_on ?? todayISO())
  const [endedOn, setEndedOn] = useState(season?.ended_on ?? "")
  const [yieldKg, setYieldKg] = useState(season?.yield_kg != null ? String(season.yield_kg) : "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError("ตั้งชื่อรอบก่อนนะครับ")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        crop_id: cropId || null,
        started_on: startedOn || todayISO(),
        ended_on: endedOn || null,
        yield_kg: yieldKg.trim() === "" ? null : Number(yieldKg),
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm("ลบรอบนี้พร้อมรายการรายรับรายจ่ายทั้งหมดในรอบ?")) return
    setBusy(true)
    try {
      await onDelete()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <LedgerModal title={season ? "แก้ไขรอบเพาะปลูก" : "รอบเพาะปลูกใหม่"} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className={LABEL}>ชื่อรอบ</label>
          <input
            className={FIELD}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น รอบเพาะปลูก 1/2569"
          />
        </div>

        <div>
          <label className={LABEL}>พืชที่ปลูก <span className="text-gray-400">(ไม่บังคับ)</span></label>
          <select className={FIELD} value={cropId} onChange={(e) => setCropId(e.target.value)}>
            <option value="">— ไม่ระบุ —</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>เริ่มรอบ</label>
            <input
              type="date"
              className={FIELD}
              value={startedOn}
              onChange={(e) => setStartedOn(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>สิ้นสุดรอบ</label>
            <input
              type="date"
              className={FIELD}
              value={endedOn}
              onChange={(e) => setEndedOn(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>
            ผลผลิตที่ได้ <span className="text-gray-400">— กิโลกรัม (ไม่บังคับ)</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className={FIELD}
            value={yieldKg}
            onChange={(e) => setYieldKg(e.target.value)}
            placeholder="ระบุภายหลังเมื่อเก็บเกี่ยวแล้วได้"
          />
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1A4D2E] font-medium text-white hover:bg-[#143a22] disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {season ? "บันทึกการแก้ไข" : "สร้างรอบ"}
        </button>

        {season && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-red-100 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> ลบรอบนี้
          </button>
        )}
      </div>
    </LedgerModal>
  )
}
