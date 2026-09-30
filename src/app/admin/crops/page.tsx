"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Sprout, Loader2, Search, Plus, Edit3, Trash2, ChevronRight } from "lucide-react"
import {
  adminListCrops,
  adminListCropTypes,
  adminCreateCrop,
  adminDeleteCrop,
  type AdminCropRow,
} from "@/lib/supabase/admin"

type CropType = { id: string; name: string; unit_basis: string }

export default function AdminCropsPage() {
  const [rows, setRows] = useState<AdminCropRow[]>([])
  const [total, setTotal] = useState(0)
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [filterType, setFilterType] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [newNameEn, setNewNameEn] = useState("")
  const [newTypeId, setNewTypeId] = useState("")
  const [creating, setCreating] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startAction] = useTransition()

  const load = () => {
    setLoading(true)
    adminListCrops({
      crop_type_id: filterType === "all" ? undefined : filterType,
      search,
      limit: 100,
    })
      .then((r) => { setRows(r.rows); setTotal(r.total) })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    adminListCropTypes()
      .then((types) => {
        setCropTypes(types)
        if (types.length > 0) setNewTypeId(types[0].id)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, search])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    setCreating(true)
    try {
      await adminCreateCrop({
        name: newName.trim(),
        name_en: newNameEn.trim() || null,
        crop_type_id: newTypeId,
      })
      setShowAddModal(false)
      setNewName("")
      setNewNameEn("")
      load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (id: string, name: string, recCount: number) => {
    const msg = recCount > 0
      ? `ลบพืช "${name}" และ ${recCount} recommendations ทั้งหมด?`
      : `ลบพืช "${name}"?`
    if (!confirm(msg)) return

    setPendingId(id)
    setActionError(null)
    startAction(async () => {
      try {
        await adminDeleteCrop(id)
        load()
      } catch (e) {
        setActionError(e instanceof Error ? e.message : String(e))
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sprout className="w-6 h-6 text-[#1A4D2E]" /> พืชและสูตรปุ๋ย
          </h1>
          <p className="text-sm text-gray-500 mt-1">ทั้งหมด {total.toLocaleString()} ชนิด</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 h-10 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white text-sm font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" /> เพิ่มพืช
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()) }} className="relative">
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาชื่อพืช..."
            className="w-full h-10 pl-11 pr-4 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
          />
        </form>

        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              filterType === "all" ? "bg-[#1A2F2A] text-white" : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
            }`}
          >
            ทั้งหมด
          </button>
          {cropTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterType(t.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                filterType === t.id ? "bg-[#1A2F2A] text-white" : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="bg-red-50 text-red-700 text-xs px-4 py-2 rounded-xl">{actionError}</div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#1A4D2E]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl text-sm">{error}</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-500 text-sm">
          ไม่พบพืชในระบบ
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((c) => {
            const isPending = pendingId === c.id
            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2 hover:shadow-md transition-shadow ${isPending ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 truncate">{c.name}</h3>
                    {c.name_en && <p className="text-xs text-gray-400 truncate">{c.name_en}</p>}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E6F4EA] text-[#1A4D2E] shrink-0">
                    {c.crop_type_name}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                  <span>{c.recommendation_count} recommendations</span>
                  <span>·</span>
                  <span>{c.crop_type_unit === "per_tree" ? "กรัม/ต้น" : "กก./ไร่"}</span>
                </div>

                <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                  <Link
                    href={`/admin/crops/${c.id}`}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-[#1A4D2E] hover:bg-[#1A4D2E]/10"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> แก้ไข
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(c.id, c.name, c.recommendation_count)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add crop modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900">เพิ่มพืชใหม่</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">ประเภทพืช *</label>
              <select
                value={newTypeId}
                onChange={(e) => setNewTypeId(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
              >
                {cropTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">ชื่อพืช (ไทย) *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="เช่น แตงโม"
                className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">ชื่อพืช (English) — optional</label>
              <input
                type="text"
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder="e.g. Watermelon"
                className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
              />
            </div>

            {actionError && (
              <div className="bg-red-50 text-red-600 text-xs px-4 py-2 rounded-xl">{actionError}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 h-10 rounded-full border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={creating || !newName.trim() || !newTypeId}
                className="flex-1 h-10 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
