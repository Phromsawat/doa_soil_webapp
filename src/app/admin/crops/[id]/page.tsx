"use client"

import { useEffect, useState, useTransition, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save, Plus, Trash2, CheckCircle2 } from "lucide-react"
import {
  adminListCropTypes,
  adminUpdateCrop,
  adminListRecommendations,
  adminCreateRecommendation,
  adminUpdateRecommendation,
  adminDeleteRecommendation,
  type AdminRecommendationRow,
} from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/client"

type CropType = { id: string; name: string; unit_basis: string }

interface PageProps {
  params: Promise<{ id: string }>
}

const EMPTY_REC: Omit<AdminRecommendationRow, "id" | "crop_id"> = {
  mode: "100%",
  om_min: null, om_max: null,
  p_min: null,  p_max: null,
  k_min: null,  k_max: null,
  target_n: null, target_p2o5: null, target_k2o: null,
  target_unit: "g/tree/year",
  notes: null,
}

export default function EditCropPage({ params }: PageProps) {
  const { id: cropId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [savingCrop, setSavingCrop] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Crop fields
  const [name, setName] = useState("")
  const [nameEn, setNameEn] = useState("")
  const [description, setDescription] = useState("")
  const [cropTypeId, setCropTypeId] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [cropTypes, setCropTypes] = useState<CropType[]>([])

  // Recommendations
  const [recs, setRecs] = useState<AdminRecommendationRow[]>([])
  const [showAddRec, setShowAddRec] = useState(false)
  const [newRec, setNewRec] = useState({ ...EMPTY_REC })
  const [creatingRec, setCreatingRec] = useState(false)
  const [pendingRecId, setPendingRecId] = useState<string | null>(null)
  const [, startAction] = useTransition()

  const loadCrop = async () => {
    const { data, error } = await supabase
      .from("crops")
      .select("id, name, name_en, description, crop_type_id, is_active")
      .eq("id", cropId)
      .single()
    if (error) { setError(error.message); return }
    setName(data.name)
    setNameEn(data.name_en ?? "")
    setDescription(data.description ?? "")
    setCropTypeId(data.crop_type_id)
    setIsActive(data.is_active)
  }

  const loadRecs = async () => {
    try {
      const list = await adminListRecommendations(cropId)
      setRecs(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    Promise.all([
      loadCrop(),
      adminListCropTypes().then((t) => setCropTypes(t)),
      loadRecs(),
    ]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropId])

  const handleSaveCrop = async () => {
    setError(null)
    setSuccessMsg(null)
    setSavingCrop(true)
    try {
      await adminUpdateCrop(cropId, {
        name: name.trim(),
        name_en: nameEn.trim() || null,
        description: description.trim() || null,
        crop_type_id: cropTypeId,
        is_active: isActive,
      })
      setSuccessMsg("บันทึกข้อมูลพืชเรียบร้อย")
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingCrop(false)
    }
  }

  const handleCreateRec = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreatingRec(true)
    try {
      await adminCreateRecommendation({
        crop_id: cropId,
        mode: newRec.mode,
        om_min: newRec.om_min, om_max: newRec.om_max,
        p_min: newRec.p_min,   p_max: newRec.p_max,
        k_min: newRec.k_min,   k_max: newRec.k_max,
        target_n: newRec.target_n,
        target_p2o5: newRec.target_p2o5,
        target_k2o: newRec.target_k2o,
        target_unit: newRec.target_unit,
        notes: newRec.notes,
      })
      setNewRec({ ...EMPTY_REC })
      setShowAddRec(false)
      await loadRecs()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreatingRec(false)
    }
  }

  const handleUpdateRec = (rec: AdminRecommendationRow, patch: Partial<AdminRecommendationRow>) => {
    setPendingRecId(rec.id)
    startAction(async () => {
      try {
        await adminUpdateRecommendation(rec.id, patch)
        setRecs((prev) => prev.map((r) => (r.id === rec.id ? { ...r, ...patch } : r)))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setPendingRecId(null)
      }
    })
  }

  const handleDeleteRec = (recId: string) => {
    if (!confirm("ลบ recommendation นี้?")) return
    setPendingRecId(recId)
    startAction(async () => {
      try {
        await adminDeleteRecommendation(recId)
        setRecs((prev) => prev.filter((r) => r.id !== recId))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setPendingRecId(null)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A4D2E]" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/admin/crops" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1A4D2E]">
          <ArrowLeft className="w-4 h-4" /> กลับไปรายการพืช
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Crop info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">ข้อมูลพืช</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">ชื่อพืช (ไทย) *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">ชื่อพืช (English)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">ประเภทพืช</label>
            <select
              value={cropTypeId}
              onChange={(e) => setCropTypeId(e.target.value)}
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
            >
              {cropTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              เปิดใช้งาน (แสดงในระบบ)
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">คำอธิบาย</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
          />
        </div>

        <button
          type="button"
          onClick={handleSaveCrop}
          disabled={savingCrop || !name.trim()}
          className="px-6 h-10 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
        >
          {savingCrop ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          บันทึกข้อมูลพืช
        </button>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recommendations</h2>
            <p className="text-xs text-gray-500 mt-1">ค่าแนะนำ N/P₂O₅/K₂O ตามช่วงค่า OM/P/K — ทั้งหมด {recs.length} รายการ</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddRec(true)}
            className="flex items-center gap-2 px-4 h-10 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่ม
          </button>
        </div>

        {recs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">ยังไม่มี recommendations</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left font-bold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-2 py-2">โหมด</th>
                  <th className="px-2 py-2 text-right">OM min</th>
                  <th className="px-2 py-2 text-right">OM max</th>
                  <th className="px-2 py-2 text-right">P min</th>
                  <th className="px-2 py-2 text-right">P max</th>
                  <th className="px-2 py-2 text-right">K min</th>
                  <th className="px-2 py-2 text-right">K max</th>
                  <th className="px-2 py-2 text-right">N</th>
                  <th className="px-2 py-2 text-right">P₂O₅</th>
                  <th className="px-2 py-2 text-right">K₂O</th>
                  <th className="px-2 py-2">หน่วย</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recs.map((r) => (
                  <RecommendationRow
                    key={r.id}
                    rec={r}
                    pending={pendingRecId === r.id}
                    onSave={(patch) => handleUpdateRec(r, patch)}
                    onDelete={() => handleDeleteRec(r.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add recommendation modal */}
      {showAddRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRec(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateRec}
            className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold text-gray-900">เพิ่ม Recommendation</h2>
            <p className="text-xs text-gray-500">กรอกเฉพาะค่าที่ต้องใช้ (เช่น OM range → ให้ค่า N)</p>

            <div className="grid grid-cols-2 gap-3">
              <NumField label="OM min" value={newRec.om_min} onChange={(v) => setNewRec({ ...newRec, om_min: v })} />
              <NumField label="OM max" value={newRec.om_max} onChange={(v) => setNewRec({ ...newRec, om_max: v })} />
              <NumField label="P min"  value={newRec.p_min}  onChange={(v) => setNewRec({ ...newRec, p_min: v })} />
              <NumField label="P max"  value={newRec.p_max}  onChange={(v) => setNewRec({ ...newRec, p_max: v })} />
              <NumField label="K min"  value={newRec.k_min}  onChange={(v) => setNewRec({ ...newRec, k_min: v })} />
              <NumField label="K max"  value={newRec.k_max}  onChange={(v) => setNewRec({ ...newRec, k_max: v })} />
              <NumField label="target N"    value={newRec.target_n}    onChange={(v) => setNewRec({ ...newRec, target_n: v })} />
              <NumField label="target P₂O₅" value={newRec.target_p2o5} onChange={(v) => setNewRec({ ...newRec, target_p2o5: v })} />
              <NumField label="target K₂O"  value={newRec.target_k2o}  onChange={(v) => setNewRec({ ...newRec, target_k2o: v })} />
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-gray-600 uppercase">หน่วย</label>
                <select
                  value={newRec.target_unit}
                  onChange={(e) => setNewRec({ ...newRec, target_unit: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20"
                >
                  <option value="g/tree/year">g/tree/year</option>
                  <option value="kg/rai">kg/rai</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRec(false)}
                className="flex-1 h-10 rounded-full border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={creatingRec}
                className="flex-1 h-10 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingRec ? <Loader2 className="w-4 h-4 animate-spin" /> : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function NumField({
  label, value, onChange, className,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-[10px] font-semibold text-gray-600 uppercase">{label}</label>
      <input
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20"
        placeholder="—"
      />
    </div>
  )
}

/** Inline editable row for a recommendation */
function RecommendationRow({
  rec, pending, onSave, onDelete,
}: {
  rec: AdminRecommendationRow
  pending: boolean
  onSave: (patch: Partial<AdminRecommendationRow>) => void
  onDelete: () => void
}) {
  const [local, setLocal] = useState(rec)
  const [dirty, setDirty] = useState(false)

  useEffect(() => { setLocal(rec); setDirty(false) }, [rec])

  const update = <K extends keyof AdminRecommendationRow>(k: K, v: AdminRecommendationRow[K]) => {
    setLocal({ ...local, [k]: v })
    setDirty(true)
  }

  const cellInput = (val: number | null, key: keyof AdminRecommendationRow) => (
    <input
      type="number"
      step="any"
      value={val ?? ""}
      onChange={(e) => update(key, (e.target.value === "" ? null : Number(e.target.value)) as never)}
      className="w-16 h-7 px-1.5 rounded bg-transparent text-right text-xs font-mono focus:bg-gray-50 focus:ring-1 focus:ring-[#1A4D2E]/20"
      placeholder="—"
    />
  )

  return (
    <tr className={`hover:bg-gray-50 ${pending ? "opacity-50" : ""}`}>
      <td className="px-2 py-2">
        <select
          value={local.mode}
          onChange={(e) => update("mode", e.target.value)}
          className="h-7 px-1.5 rounded bg-transparent text-xs focus:bg-gray-50"
        >
          <option value="100%">100%</option>
          <option value="70%">70%</option>
        </select>
      </td>
      <td className="px-2 py-2 text-right">{cellInput(local.om_min, "om_min")}</td>
      <td className="px-2 py-2 text-right">{cellInput(local.om_max, "om_max")}</td>
      <td className="px-2 py-2 text-right">{cellInput(local.p_min, "p_min")}</td>
      <td className="px-2 py-2 text-right">{cellInput(local.p_max, "p_max")}</td>
      <td className="px-2 py-2 text-right">{cellInput(local.k_min, "k_min")}</td>
      <td className="px-2 py-2 text-right">{cellInput(local.k_max, "k_max")}</td>
      <td className="px-2 py-2 text-right">{cellInput(local.target_n, "target_n")}</td>
      <td className="px-2 py-2 text-right">{cellInput(local.target_p2o5, "target_p2o5")}</td>
      <td className="px-2 py-2 text-right">{cellInput(local.target_k2o, "target_k2o")}</td>
      <td className="px-2 py-2">
        <select
          value={local.target_unit}
          onChange={(e) => update("target_unit", e.target.value)}
          className="h-7 px-1.5 rounded bg-transparent text-xs focus:bg-gray-50"
        >
          <option value="g/tree/year">g/tree</option>
          <option value="kg/rai">kg/rai</option>
        </select>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1 justify-end">
          {dirty && (
            <button
              type="button"
              onClick={() => onSave(local)}
              disabled={pending}
              className="p-1.5 rounded-lg text-[#1A4D2E] hover:bg-[#1A4D2E]/10"
              title="บันทึก"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="ลบ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}
