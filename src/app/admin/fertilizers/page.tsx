"use client"

import { useEffect, useState, useTransition } from "react"
import { FlaskConical, Loader2, Plus, Trash2, Check, X, Pencil } from "lucide-react"
import {
  adminListFormulas,
  adminCreateFormula,
  adminUpdateFormula,
  adminDeleteFormula,
  type FertilizerFormulaRow,
} from "@/lib/supabase/fertilizerFormulas"

type Draft = {
  name: string
  grade: string
  n_percent: string
  p2o5_percent: string
  k2o_percent: string
  kind: "chemical" | "organic" | "biological"
  notes: string
}

const KIND_LABEL: Record<Draft["kind"], string> = {
  chemical: "ปุ๋ยเคมี",
  organic: "ปุ๋ยอินทรีย์",
  biological: "ปุ๋ยชีวภาพ",
}

const EMPTY: Draft = {
  name: "",
  grade: "",
  n_percent: "",
  p2o5_percent: "",
  k2o_percent: "",
  kind: "chemical",
  notes: "",
}

function toDraft(r: FertilizerFormulaRow): Draft {
  return {
    name: r.name,
    grade: r.grade ?? "",
    n_percent: String(r.n_percent),
    p2o5_percent: String(r.p2o5_percent),
    k2o_percent: String(r.k2o_percent),
    kind: r.kind,
    notes: r.notes ?? "",
  }
}

function parseDraft(d: Draft) {
  const num = (s: string) => {
    const v = parseFloat(s)
    return Number.isFinite(v) ? v : 0
  }
  return {
    name: d.name,
    grade: d.grade,
    n_percent: num(d.n_percent),
    p2o5_percent: num(d.p2o5_percent),
    k2o_percent: num(d.k2o_percent),
    kind: d.kind,
    notes: d.notes,
  }
}

function validate(d: Draft): string | null {
  if (!d.name.trim()) return "กรุณากรอกชื่อปุ๋ย"
  const p = parseDraft(d)
  for (const [label, v] of [
    ["N", p.n_percent],
    ["P₂O₅", p.p2o5_percent],
    ["K₂O", p.k2o_percent],
  ] as const) {
    if (v < 0 || v > 100) return `${label} ต้องอยู่ระหว่าง 0-100`
  }
  if (p.n_percent + p.p2o5_percent + p.k2o_percent === 0)
    return "ต้องมีธาตุอาหารอย่างน้อย 1 ตัวมากกว่า 0"
  return null
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-[#1A4D2E] focus:outline-none"

export default function AdminFertilizersPage() {
  const [rows, setRows] = useState<FertilizerFormulaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY)
  const [pending, startTransition] = useTransition()

  async function reload() {
    try {
      setRows(await adminListFormulas())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  function handleCreate() {
    const msg = validate(newDraft)
    if (msg) return setError(msg)
    startTransition(async () => {
      try {
        await adminCreateFormula(parseDraft(newDraft))
        setNewDraft(EMPTY)
        setAdding(false)
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ")
      }
    })
  }

  function handleSaveEdit(id: string) {
    const msg = validate(editDraft)
    if (msg) return setError(msg)
    startTransition(async () => {
      try {
        await adminUpdateFormula(id, parseDraft(editDraft))
        setEditingId(null)
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
      }
    })
  }

  function handleToggleActive(r: FertilizerFormulaRow) {
    startTransition(async () => {
      try {
        await adminUpdateFormula(r.id, { is_active: !r.is_active })
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ")
      }
    })
  }

  function handleDelete(r: FertilizerFormulaRow) {
    if (!confirm(`ลบสูตร "${r.name}" ?`)) return
    startTransition(async () => {
      try {
        await adminDeleteFormula(r.id)
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ")
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-[72rem]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-[#1A4D2E]" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">สูตรปุ๋ย</h1>
            <p className="text-xs text-gray-500">
              ใช้ตอนแปลงความต้องการธาตุอาหาร (N/P₂O₅/K₂O) เป็นปริมาณปุ๋ยจริง
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setAdding((v) => !v)
            setError(null)
          }}
          className="flex items-center gap-1 rounded-xl bg-[#1A4D2E] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> เพิ่มสูตรปุ๋ย
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {adding && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-gray-700">เพิ่มสูตรใหม่</div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
            <div className="col-span-2">
              <label className="text-[11px] text-gray-500">ชื่อปุ๋ย *</label>
              <input
                className={inputCls}
                value={newDraft.name}
                onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
                placeholder="เช่น มูลไก่แห้ง"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">สูตร</label>
              <input
                className={inputCls}
                value={newDraft.grade}
                onChange={(e) => setNewDraft({ ...newDraft, grade: e.target.value })}
                placeholder="16-16-16"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">%N</label>
              <input
                className={inputCls}
                inputMode="decimal"
                value={newDraft.n_percent}
                onChange={(e) => setNewDraft({ ...newDraft, n_percent: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">%P₂O₅</label>
              <input
                className={inputCls}
                inputMode="decimal"
                value={newDraft.p2o5_percent}
                onChange={(e) => setNewDraft({ ...newDraft, p2o5_percent: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">%K₂O</label>
              <input
                className={inputCls}
                inputMode="decimal"
                value={newDraft.k2o_percent}
                onChange={(e) => setNewDraft({ ...newDraft, k2o_percent: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">ประเภท</label>
              <select
                className={inputCls}
                value={newDraft.kind}
                onChange={(e) =>
                  setNewDraft({ ...newDraft, kind: e.target.value as Draft["kind"] })
                }
              >
                <option value="chemical">ปุ๋ยเคมี</option>
                <option value="organic">ปุ๋ยอินทรีย์</option>
                <option value="biological">ปุ๋ยชีวภาพ</option>
              </select>
            </div>
            <div className="col-span-2 lg:col-span-6">
              <label className="text-[11px] text-gray-500">
                หมายเหตุ / แหล่งอ้างอิง (แนะนำให้ใส่ถ้าเป็นปุ๋ยอินทรีย์)
              </label>
              <input
                className={inputCls}
                value={newDraft.notes}
                onChange={(e) => setNewDraft({ ...newDraft, notes: e.target.value })}
                placeholder="เช่น ค่าเฉลี่ยจากผลวิเคราะห์ของ..."
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreate}
                disabled={pending}
                className="w-full rounded-lg bg-[#1A4D2E] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? "กำลังบันทึก…" : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> กำลังโหลด…
          </div>
        ) : (
          <table className="w-full min-w-[54rem] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">ชื่อปุ๋ย</th>
                <th className="px-3 py-2">สูตร</th>
                <th className="px-3 py-2 text-right">%N</th>
                <th className="px-3 py-2 text-right">%P₂O₅</th>
                <th className="px-3 py-2 text-right">%K₂O</th>
                <th className="px-3 py-2">ประเภท</th>
                <th className="px-3 py-2 text-center">ใช้งาน</th>
                <th className="px-3 py-2 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const editing = editingId === r.id
                return (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          className={inputCls}
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        />
                      ) : (
                        <div>
                          <div className="font-medium text-gray-800">{r.name}</div>
                          {r.notes && (
                            <div className="text-[11px] text-gray-400">{r.notes}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {editing ? (
                        <input
                          className={inputCls}
                          value={editDraft.grade}
                          onChange={(e) => setEditDraft({ ...editDraft, grade: e.target.value })}
                        />
                      ) : (
                        r.grade ?? "—"
                      )}
                    </td>
                    {(["n_percent", "p2o5_percent", "k2o_percent"] as const).map((f) => (
                      <td key={f} className="px-3 py-2 text-right tabular-nums">
                        {editing ? (
                          <input
                            className={`${inputCls} text-right`}
                            inputMode="decimal"
                            value={editDraft[f]}
                            onChange={(e) => setEditDraft({ ...editDraft, [f]: e.target.value })}
                          />
                        ) : (
                          r[f]
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {editing ? (
                        <select
                          className={inputCls}
                          value={editDraft.kind}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, kind: e.target.value as Draft["kind"] })
                          }
                        >
                          <option value="chemical">ปุ๋ยเคมี</option>
                          <option value="organic">ปุ๋ยอินทรีย์</option>
                          <option value="biological">ปุ๋ยชีวภาพ</option>
                        </select>
                      ) : (
                        <span className="text-gray-600">{KIND_LABEL[r.kind]}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleToggleActive(r)}
                        disabled={pending}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {r.is_active ? "เปิด" : "ปิด"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {editing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(r.id)}
                              disabled={pending}
                              className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50"
                              aria-label="บันทึก"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                              aria-label="ยกเลิก"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(r.id)
                                setEditDraft(toDraft(r))
                                setError(null)
                              }}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                              aria-label="แก้ไข"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(r)}
                              disabled={pending}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                              aria-label="ลบ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                    ยังไม่มีสูตรปุ๋ย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
