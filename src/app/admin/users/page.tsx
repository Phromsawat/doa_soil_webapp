"use client"

import { useEffect, useState, useTransition } from "react"
import { Users, Loader2, Search, ChevronLeft, ChevronRight, Trash2, ShieldCheck, User as UserIcon } from "lucide-react"
import {
  adminListUsers,
  adminUpdateUserRole,
  adminDeleteUser,
  type AdminUserRow,
} from "@/lib/supabase/admin"

const ROLE_TABS = ["all", "admin", "user"] as const
const ROLE_LABEL: Record<string, string> = {
  all: "ทั้งหมด",
  admin: "ผู้ดูแล",
  user: "ผู้ใช้ทั่วไป",
}
const PAGE_SIZE = 20

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "2-digit", month: "short", year: "2-digit",
  })
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [role, setRole] = useState<(typeof ROLE_TABS)[number]>("all")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(0)

  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startAction] = useTransition()

  const load = () => {
    setLoading(true)
    adminListUsers({ role, search, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((r) => {
        setRows(r.rows)
        setTotal(r.total)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, search, page])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    setSearch(searchInput.trim())
  }

  const handleRoleChange = (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin"
    const verb = newRole === "admin" ? "ตั้งให้เป็นแอดมิน" : "ถอนสิทธิ์แอดมิน"
    if (!confirm(`${verb}ของผู้ใช้นี้?`)) return

    setPendingId(userId)
    setActionError(null)
    startAction(async () => {
      try {
        await adminUpdateUserRole(userId, newRole)
        load()
      } catch (e) {
        setActionError(e instanceof Error ? e.message : String(e))
      } finally {
        setPendingId(null)
      }
    })
  }

  const handleDelete = (userId: string, email: string | null) => {
    if (!confirm(`ลบบัญชี "${email ?? userId}" และข้อมูลทั้งหมด?\n(การวิเคราะห์, รูป, ฯลฯ — ไม่สามารถกู้คืน)`)) return

    setPendingId(userId)
    setActionError(null)
    startAction(async () => {
      try {
        await adminDeleteUser(userId)
        load()
      } catch (e) {
        setActionError(e instanceof Error ? e.message : String(e))
      } finally {
        setPendingId(null)
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
            <Users className="w-6 h-6 text-[#1A4D2E]" /> จัดการผู้ใช้
          </h1>
          <p className="text-sm text-gray-500 mt-1">ทั้งหมด {total.toLocaleString()} คน</p>
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
            placeholder="ค้นหาอีเมล / ชื่อ / ชื่อเล่น..."
            className="w-full h-10 pl-11 pr-4 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E]"
          />
        </form>

        <div className="flex gap-2">
          {ROLE_TABS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r); setPage(0) }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                role === r
                  ? "bg-[#1A2F2A] text-white"
                  : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
              }`}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="bg-red-50 text-red-700 text-xs px-4 py-2 rounded-xl">{actionError}</div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1A4D2E]" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 text-sm">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center text-gray-500 text-sm">ไม่พบผู้ใช้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">ผู้ใช้</th>
                  <th className="px-4 py-3">เบอร์โทร</th>
                  <th className="px-4 py-3">สิทธิ์</th>
                  <th className="px-4 py-3 text-right">วิเคราะห์</th>
                  <th className="px-4 py-3">ใช้งานล่าสุด</th>
                  <th className="px-4 py-3">สมัครเมื่อ</th>
                  <th className="px-4 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((u) => {
                  const isPending = pendingId === u.id
                  const emailPrefix = u.email?.split("@")[0] ?? null
                  const name = u.full_name || u.nickname || emailPrefix || "ผู้ใช้ไม่ระบุตัวตน"

                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isPending ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                            u.role === "admin" ? "bg-[#1A4D2E]" : "bg-gray-400"
                          }`}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-xs truncate max-w-[160px]">{name}</p>
                            <p className="text-[10px] text-gray-500 truncate max-w-[160px]">{u.email ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{u.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        {u.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1A4D2E]/10 text-[#1A4D2E]">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                            <UserIcon className="w-3 h-3" /> User
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono">{u.analysis_count}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.last_analysis_at)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRoleChange(u.id, u.role)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-30 ${
                              u.role === "admin"
                                ? "text-gray-600 hover:bg-gray-100"
                                : "text-[#1A4D2E] hover:bg-[#1A4D2E]/10"
                            }`}
                          >
                            {u.role === "admin" ? "ถอน" : "ตั้งแอดมิน"}
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(u.id, u.email)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-30"
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
          <span className="font-medium text-gray-700">หน้า {page + 1} จาก {totalPages}</span>
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
