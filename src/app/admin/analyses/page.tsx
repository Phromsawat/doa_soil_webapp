"use client"

import { useEffect, useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { FileBarChart, Loader2, Search, ChevronLeft, ChevronRight, ImageIcon, Eye, Trash2, Camera, Pencil } from "lucide-react"
import { adminListAnalyses, adminDeleteAnalysis } from "@/lib/supabase/admin"

type Row = Awaited<ReturnType<typeof adminListAnalyses>>["rows"][number]

const MODE_TABS = ["all", "image_upload", "manual_form"] as const
const MODE_LABEL: Record<string, string> = {
  all: "ทั้งหมด",
  image_upload: "วิเคราะห์ด้วย AI",
  manual_form: "บันทึกผลด้วยตนเอง",
}

const STATUS_TABS = ["all", "completed", "pending", "failed"] as const
const STATUS_LABEL: Record<string, string> = {
  all: "ทั้งหมด",
  completed: "เสร็จสิ้น",
  pending: "รอดำเนินการ",
  failed: "ล้มเหลว",
}
const STATUS_BADGE: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-orange-100 text-orange-700",
  failed: "bg-red-100 text-red-700",
}

const PAGE_SIZE = 20

export default function AdminAnalysesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("all")
  const [mode, setMode] = useState<(typeof MODE_TABS)[number]>("all")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(0)

  const [, startDelete] = useTransition()

  const load = () => {
    setLoading(true)
    adminListAnalyses({
      status,
      search,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((r) => {
        setRows(r.rows as Row[])
        setTotal(r.total)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, page])

  // Client-side filter by mode (server returns all)
  const filteredRows = useMemo(() => {
    if (mode === "all") return rows
    return rows.filter((r) => r.input_mode === mode)
  }, [rows, mode])

  const modeCounts = useMemo(() => ({
    image_upload: rows.filter((r) => r.input_mode === "image_upload").length,
    manual_form: rows.filter((r) => r.input_mode === "manual_form").length,
  }), [rows])

  // Hide image column entirely when only showing manual-form rows
  const showImageColumn = mode !== "manual_form"

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    setSearch(searchInput.trim())
  }

  const handleDelete = (id: string) => {
    if (!confirm("ลบรายการนี้และรูปภาพทั้งหมด? (ไม่สามารถกู้คืนได้)")) return
    startDelete(async () => {
      try {
        await adminDeleteAnalysis(id)
        load()
      } catch (e) {
        alert(e instanceof Error ? e.message : String(e))
      }
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-[#1A4D2E]" />
            ประวัติการวิเคราะห์ทั้งหมด
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ทั้งหมด {total.toLocaleString()} รายการ
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาในจังหวัด อำเภอ ตำบล หรือ notes..."
            className="w-full h-10 pl-11 pr-4 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
          />
        </form>

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">ประเภท</p>
          <div className="flex gap-2 overflow-x-auto">
            {MODE_TABS.map((m) => {
              const count = m === "all" ? rows.length : modeCounts[m as keyof typeof modeCounts]
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
                    mode === m
                      ? "bg-[#1A4D2E] text-white"
                      : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
                  }`}
                >
                  {MODE_LABEL[m]}
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${mode === m ? "bg-white/20" : "bg-gray-200 text-gray-600"}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">สถานะ</p>
          <div className="flex gap-2 overflow-x-auto">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatus(s); setPage(0) }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  status === s
                    ? "bg-[#1A2F2A] text-white"
                    : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1A4D2E]" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 text-sm">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-16 text-center text-gray-500 text-sm">
            ไม่พบรายการ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                <tr>
                  {showImageColumn && <th className="px-4 py-3">รูป</th>}
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3">ผู้ใช้</th>
                  <th className="px-4 py-3">พืช</th>
                  <th className="px-4 py-3 text-right">OM</th>
                  <th className="px-4 py-3 text-right">P</th>
                  <th className="px-4 py-3 text-right">K</th>
                  <th className="px-4 py-3">สถานที่</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3">เวลา</th>
                  <th className="px-4 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row) => {
                  const firstImage = row.analysis_images?.[0]?.public_url
                  const cropName = (row.crops as { name?: string } | null)?.name ?? "—"
                  const userInfo = row.user
                  const userLabel = userInfo?.full_name || userInfo?.nickname || userInfo?.email || "anonymous"
                  const location = [row.district, row.amphur, row.province].filter(Boolean).join(" ") || "—"
                  const dateStr = new Date(row.created_at).toLocaleString("th-TH", {
                    day: "2-digit", month: "short", year: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })

                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {showImageColumn && (
                        <td className="px-4 py-3">
                          {row.input_mode === "image_upload" ? (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                              {firstImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={firstImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-gray-300" />
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {row.input_mode === "image_upload" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 whitespace-nowrap">
                            <Camera className="w-3 h-3" /> วิเคราะห์ด้วย AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 whitespace-nowrap">
                            <Pencil className="w-3 h-3" /> บันทึกด้วยตนเอง
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 text-xs truncate max-w-[120px]">{userLabel}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{userInfo?.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{cropName}</td>
                      <td className="px-4 py-3 text-right text-xs font-mono">{row.om_value ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs font-mono">{row.p_value ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs font-mono">{row.k_value ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[140px]">{location}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/admin/analyses/${row.id}`}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-[#1A4D2E]"
                            title="ดู"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-gray-700">
            หน้า {page + 1} จาก {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
