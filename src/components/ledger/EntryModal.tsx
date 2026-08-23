"use client"

import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import LedgerModal from "./LedgerModal"
import { BUILTIN_CATEGORIES, KIND_LABEL, type EntryKind } from "@/lib/ledger/categories"
import type { CustomCategory, Entry } from "@/lib/supabase/ledger"

const FIELD =
  "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm focus:border-[#1A4D2E] focus:bg-white focus:outline-none"
const LABEL = "text-xs text-gray-500"
const NEW_CATEGORY = "__new__"

const todayISO = () => new Date().toISOString().slice(0, 10)

/**
 * เพิ่ม/แก้ไขรายการรายรับหรือรายจ่าย
 * เลือกหมวดจากรายการตายตัว + หมวดที่ผู้ใช้เคยเพิ่มเอง หรือกด "เพิ่มหมวดใหม่" ตรงนี้เลย
 * หน้าแม่ mount ตัวนี้เฉพาะตอนเปิด ค่าเริ่มต้นจึงตั้งจาก props ได้ตรง ๆ
 */
export default function EntryModal({
  kind,
  entry,
  customCategories,
  onClose,
  onSave,
  onDelete,
  onCreateCategory,
}: {
  kind: EntryKind
  entry: Entry | null
  customCategories: CustomCategory[]
  onClose: () => void
  onSave: (values: {
    kind: EntryKind
    category: string
    title: string | null
    amount: number
    happened_on: string
  }) => Promise<void>
  onDelete?: () => Promise<void>
  onCreateCategory: (kind: EntryKind, name: string) => Promise<void>
}) {
  const options = [
    ...BUILTIN_CATEGORIES[kind],
    ...customCategories.filter((c) => c.kind === kind).map((c) => c.name),
  ]

  const [category, setCategory] = useState(entry?.category ?? BUILTIN_CATEGORIES[kind][0])
  const [newCategory, setNewCategory] = useState("")
  const [title, setTitle] = useState(entry?.title ?? "")
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "")
  const [happenedOn, setHappenedOn] = useState(entry?.happened_on ?? todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const value = Number(amount)
    if (!amount.trim() || !Number.isFinite(value) || value < 0) {
      setError("กรอกจำนวนเงินให้ถูกต้อง")
      return
    }
    let finalCategory = category
    if (category === NEW_CATEGORY) {
      const name = newCategory.trim()
      if (!name) {
        setError("ตั้งชื่อหมวดใหม่ก่อนนะครับ")
        return
      }
      finalCategory = name
    }

    setBusy(true)
    setError(null)
    try {
      // หมวดใหม่ต้องบันทึกก่อน เพื่อให้ครั้งหน้าเลือกซ้ำได้
      if (category === NEW_CATEGORY && !options.includes(finalCategory)) {
        await onCreateCategory(kind, finalCategory)
      }
      await onSave({
        kind,
        category: finalCategory,
        title: title.trim() || null,
        amount: value,
        happened_on: happenedOn || todayISO(),
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm("ลบรายการนี้?")) return
    setBusy(true)
    try {
      await onDelete()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const accent = kind === "income" ? "text-emerald-600" : "text-red-500"

  return (
    <LedgerModal title={`${entry ? "แก้ไข" : "เพิ่ม"}${KIND_LABEL[kind]}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className={LABEL}>วันที่</label>
          <input
            type="date"
            className={FIELD}
            value={happenedOn}
            onChange={(e) => setHappenedOn(e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL}>หมวดหมู่</label>
          <select
            className={FIELD}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {/* รายการเก่าที่หมวดถูกลบไปแล้ว ยังต้องเลือกค้างไว้ได้ */}
            {!options.includes(category) && category !== NEW_CATEGORY && (
              <option value={category}>{category}</option>
            )}
            {options.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={NEW_CATEGORY}>＋ เพิ่มหมวดใหม่…</option>
          </select>
          {category === NEW_CATEGORY && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F1F7F2] px-3 py-2">
              <Plus className="h-4 w-4 shrink-0 text-[#1A4D2E]" />
              <input
                autoFocus
                className="w-full bg-transparent text-sm focus:outline-none"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder={`ชื่อหมวด${KIND_LABEL[kind]}ใหม่`}
              />
            </div>
          )}
        </div>

        <div>
          <label className={LABEL}>รายละเอียด <span className="text-gray-400">(ไม่บังคับ)</span></label>
          <input
            className={FIELD}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "income" ? "เช่น ขายทุเรียน 200 กก." : "เช่น ปุ๋ย 46-0-0 2 กระสอบ"}
          />
        </div>

        <div>
          <label className={LABEL}>
            จำนวนเงิน <span className="text-gray-400">— บาท</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className={`${FIELD} text-lg font-bold ${accent}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
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
          บันทึก
        </button>

        {entry && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-red-100 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> ลบรายการนี้
          </button>
        )}
      </div>
    </LedgerModal>
  )
}
