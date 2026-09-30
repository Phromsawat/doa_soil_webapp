"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Loader2, Plus, Trash2, Save } from "lucide-react"
import {
  adminListCropPlan,
  adminUpdatePlanRow,
  adminCreatePlanRow,
  adminDeletePlanRow,
  type AdminPlanRow,
} from "@/lib/supabase/adminFertilizerPlan"
import type { UseType } from "@/lib/supabase/fertilizerPlan"

const TYPE_ORDER: UseType[] = ["straight", "compound", "organic70"]
const TYPE_LABEL: Record<UseType, string> = {
  straight: "แม่ปุ๋ย 100%",
  compound: "ปุ๋ยผสม 100%",
  organic70: "70% + อินทรีย์",
}
const UNITS = ["กรัม/ต้น", "กก./ไร่", "กก./ต้น"]

function fmtRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "ทุกค่า"
  if (min == null) return `<${max}`
  if (max == null) return `>${min}`
  return `${min}-${max}`
}
const comboKeyOf = (r: AdminPlanRow) =>
  [r.om_min, r.om_max, r.p_min, r.p_max, r.k_min, r.k_max].join("|")

export default function CropPlanEditor({ cropId }: { cropId: string }) {
  const [rows, setRows] = useState<AdminPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useType, setUseType] = useState<UseType | null>(null)
  const [comboKey, setComboKey] = useState<string>("")
  const [pending, startTransition] = useTransition()

  // add-row form
  const [addStage, setAddStage] = useState("")
  const [addGrade, setAddGrade] = useState("")
  const [addAmount, setAddAmount] = useState("")
  const [addUnit, setAddUnit] = useState("กรัม/ต้น")

  async function reload() {
    try {
      const list = await adminListCropPlan(cropId)
      setRows(list)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const list = await adminListCropPlan(cropId)
        if (!cancelled) { setRows(list); setError(null) }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [cropId])

  const useTypes = useMemo(
    () => TYPE_ORDER.filter((t) => rows.some((r) => r.use_type === t)),
    [rows]
  )
  const activeType = useType && useTypes.includes(useType) ? useType : useTypes[0] ?? null

  const typeRows = useMemo(
    () => rows.filter((r) => r.use_type === activeType),
    [rows, activeType]
  )

  // ช่วงค่าดินที่มี (combo) ในโหมดนี้
  const combos = useMemo(() => {
    const seen = new Map<string, AdminPlanRow>()
    for (const r of typeRows) if (!seen.has(comboKeyOf(r))) seen.set(comboKeyOf(r), r)
    return [...seen.entries()].map(([key, r]) => ({
      key,
      label: `OM ${fmtRange(r.om_min, r.om_max)} · P ${fmtRange(r.p_min, r.p_max)} · K ${fmtRange(r.k_min, r.k_max)}`,
    }))
  }, [typeRows])
  const activeCombo = combos.some((c) => c.key === comboKey) ? comboKey : combos[0]?.key ?? ""

  const comboRows = useMemo(
    () =>
      typeRows
        .filter((r) => comboKeyOf(r) === activeCombo)
        .sort((a, b) => a.stage_order - b.stage_order || a.grade.localeCompare(b.grade)),
    [typeRows, activeCombo]
  )

  // ระยะทั้งหมดในโหมดนี้ (ไว้ให้เลือกตอนเพิ่มแถว) + map ชื่อระยะ -> order
  const stageOrder = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of typeRows) if (!m.has(r.stage)) m.set(r.stage, r.stage_order)
    return m
  }, [typeRows])

  function handleAdd() {
    if (!activeType || !addStage || !addGrade.trim() || addAmount.trim() === "") {
      setError("กรอกระยะ / สูตร / ปริมาณ ให้ครบ")
      return
    }
    const base = comboRows[0] ?? typeRows[0]
    if (!base) return
    startTransition(async () => {
      try {
        await adminCreatePlanRow({
          crop_id: cropId,
          use_type: activeType,
          om_min: base.om_min, om_max: base.om_max,
          p_min: base.p_min, p_max: base.p_max,
          k_min: base.k_min, k_max: base.k_max,
          stage: addStage,
          stage_order: stageOrder.get(addStage) ?? 99,
          grade: addGrade.trim(),
          amount: Number(addAmount),
          unit: addUnit,
        })
        setAddGrade(""); setAddAmount("")
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm("ลบแถวนี้?")) return
    startTransition(async () => {
      try {
        await adminDeletePlanRow(id)
        setRows((prev) => prev.filter((r) => r.id !== id))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  function handleSaveRow(id: string, patch: { amount?: number; grade?: string; unit?: string }) {
    startTransition(async () => {
      try {
        await adminUpdatePlanRow(id, patch)
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดตารางปุ๋ย…
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        พืชนี้ยังไม่มีตารางปุ๋ยตามระยะ (มีเฉพาะไม้ผล/พืชไร่ที่ import ไว้)
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* โหมด */}
      <div className="flex flex-wrap gap-2">
        {useTypes.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setUseType(t); setComboKey("") }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              activeType === t ? "bg-[#1A4D2E] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* เลือกช่วงค่าดิน */}
      <div>
        <label className="text-xs font-semibold text-gray-600">ช่วงค่าวิเคราะห์ดิน</label>
        <select
          value={activeCombo}
          onChange={(e) => setComboKey(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A4D2E] focus:outline-none"
        >
          {combos.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* ตารางแถวของ combo นี้ */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">ระยะ</th>
              <th className="px-3 py-2">สูตร</th>
              <th className="px-3 py-2 text-right">ปริมาณ</th>
              <th className="px-3 py-2">หน่วย</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {comboRows.map((r) => (
              <PlanRowEditor
                key={`${r.id}:${r.amount}:${r.grade}:${r.unit}`}
                row={r}
                pending={pending}
                onSave={(patch) => handleSaveRow(r.id, patch)}
                onDelete={() => handleDelete(r.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* เพิ่มแถว */}
      <div className="rounded-xl border border-dashed border-gray-300 p-3">
        <div className="mb-2 text-xs font-semibold text-gray-600">เพิ่มสูตรในช่วงดินนี้</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select
            value={addStage}
            onChange={(e) => setAddStage(e.target.value)}
            className="col-span-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none"
          >
            <option value="">— เลือกระยะ —</option>
            {[...stageOrder.keys()].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            value={addGrade}
            onChange={(e) => setAddGrade(e.target.value)}
            placeholder="สูตร เช่น 46-0-0"
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none"
          />
          <input
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            inputMode="decimal"
            placeholder="ปริมาณ"
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-right text-xs focus:outline-none"
          />
          <select
            value={addUnit}
            onChange={(e) => setAddUnit(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="mt-2 flex items-center gap-1 rounded-lg bg-[#1A4D2E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> เพิ่ม
        </button>
      </div>
    </div>
  )
}

function PlanRowEditor({
  row, pending, onSave, onDelete,
}: {
  row: AdminPlanRow
  pending: boolean
  onSave: (patch: { amount?: number; grade?: string; unit?: string }) => void
  onDelete: () => void
}) {
  // state เริ่มจาก props; parent ใส่ key ที่รวมค่าแถว -> เปลี่ยนค่าเมื่อไร remount ใหม่เอง
  const [grade, setGrade] = useState(row.grade)
  const [amount, setAmount] = useState(String(row.amount))
  const [unit, setUnit] = useState(row.unit)

  const dirty = grade !== row.grade || amount !== String(row.amount) || unit !== row.unit

  return (
    <tr className={pending ? "opacity-50" : ""}>
      <td className="px-3 py-2 text-gray-600">{row.stage}</td>
      <td className="px-3 py-2">
        <input
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-28 rounded bg-transparent px-1 py-0.5 text-sm focus:bg-gray-50 focus:outline-none"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="w-20 rounded bg-transparent px-1 py-0.5 text-right text-sm tabular-nums focus:bg-gray-50 focus:outline-none"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded bg-transparent px-1 py-0.5 text-sm focus:bg-gray-50 focus:outline-none"
        >
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
          {dirty && (
            <button
              type="button"
              onClick={() => onSave({ grade: grade.trim(), amount: Number(amount), unit })}
              disabled={pending}
              className="rounded-lg p-1.5 text-[#1A4D2E] hover:bg-[#1A4D2E]/10"
              title="บันทึก"
            >
              <Save className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="ลบ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}
