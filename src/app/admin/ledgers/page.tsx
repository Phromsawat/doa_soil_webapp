"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, ChevronLeft, ChevronRight, Download, Eye, Loader2, Search, Trash2, X } from "lucide-react"
import {
  adminDeleteLedgerSeason,
  adminExportLedgers,
  adminListLedgers,
  type LedgerFilters,
  type LedgerSummaryRow,
} from "@/lib/supabase/adminLedger"
import { listCrops, type CropOption } from "@/lib/supabase/fertilizer"
import { formatBaht, formatDay } from "@/lib/ledger/categories"
import {
  buildLedgerSheet,
  LEDGER_XLSX_COLUMNS,
  LEDGER_XLSX_STICKY_ROWS,
} from "@/lib/ledger/ledgerXlsx"

const PAGE_SIZE = 20

function Money({ v, signed }: { v: number; signed?: boolean }) {
  const cls = signed ? (v < 0 ? "text-red-600" : "text-emerald-700") : ""
  return <span className={cls}>{signed && v < 0 ? "-" : ""}{formatBaht(Math.abs(v))}</span>
}

/** อธิบายตัวกรองเป็นข้อความ — ใส่ไว้หัวไฟล์ Excel ว่าข้อมูลชุดนี้กรองมาอย่างไร */
function describe(f: LedgerFilters, crops: CropOption[]) {
  const parts = [
    f.search && `ค้นหา "${f.search}"`,
    f.cropId && `พืช ${crops.find((c) => c.id === f.cropId)?.name ?? ""}`,
    f.from && `เริ่มรอบตั้งแต่ ${formatDay(f.from)}`,
    f.to && `ถึง ${formatDay(f.to)}`,
  ].filter(Boolean)
  return parts.length ? parts.join(" · ") : "ทุกรอบของผู้ใช้ทุกคน"
}

export default function AdminLedgersPage() {
  const [rows, setRows] = useState<LedgerSummaryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [crops, setCrops] = useState<CropOption[]>([])

  // ตัวกรองที่ใช้อยู่ (applied) แยกจากช่องที่กำลังพิมพ์ — ค้นหาเมื่อกดปุ่ม/Enter
  const [filters, setFilters] = useState<LedgerFilters>({})
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    listCrops().then(setCrops).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const r = await adminListLedgers({ ...filters, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
        if (cancelled) return
        setRows(r.rows)
        setTotal(r.total)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filters, page, reloadKey])

  // ลบรอบ + รายการทั้งหมดในรอบ (กู้คืนไม่ได้) — ยืนยันพร้อมบอกว่าเป็นของใคร มีกี่รายการ
  async function handleDelete(r: LedgerSummaryRow) {
    const who = r.owner_name ?? r.owner_email ?? "ผู้ใช้"
    if (!confirm(`ลบรอบ "${r.name}" ของ ${who} พร้อมรายการทั้งหมด ${r.entry_count} รายการ?
ลบแล้วกู้คืนไม่ได้`)) return
    setDeletingId(r.season_id)
    setError(null)
    try {
      await adminDeleteLedgerSeason(r.season_id)
      // ลบแถวสุดท้ายของหน้าสุดท้าย -> ถอยกลับหนึ่งหน้า
      if (rows.length === 1 && page > 0) setPage((p) => p - 1)
      else setReloadKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeletingId(null)
    }
  }

  const apply = (patch: Partial<LedgerFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(0)
  }
  const hasFilter = !!(filters.search || filters.cropId || filters.from || filters.to)

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const [all, { default: writeXlsxFile }] = await Promise.all([
        adminExportLedgers(filters),
        import("write-excel-file/browser"),
      ])
      const exportedAt = new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
      const data = buildLedgerSheet(all, { filterText: describe(filters, crops), exportedAt })
      await writeXlsxFile(data, {
        sheet: "สรุปรายรอบ",
        columns: LEDGER_XLSX_COLUMNS,
        stickyRowsCount: LEDGER_XLSX_STICKY_ROWS,
      }).toFile(`สมุดบัญชี-สรุปรายรอบ-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "ส่งออกไฟล์ไม่สำเร็จ")
    } finally {
      setExporting(false)
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const inputCls =
    "h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-[#1A4D2E] focus:outline-none"

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <BookOpen className="h-5 w-5 text-[#1A4D2E]" /> สมุดบัญชีของผู้ใช้
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            รายรับ รายจ่าย และกำไรสุทธิของทุกรอบเพาะปลูก — ดูและลบได้ แก้ไขข้อมูลของผู้ใช้ไม่ได้
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="flex items-center gap-2 rounded-full bg-[#1A4D2E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#143a22] disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "กำลังส่งออก…" : "ส่งออก Excel"}
        </button>
      </div>

      {/* ตัวกรอง */}
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <form
          onSubmit={(e) => { e.preventDefault(); apply({ search: searchInput.trim() || undefined }) }}
          className="flex min-w-[240px] flex-1 items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหาชื่อ อีเมล หรือชื่อรอบ"
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <button type="submit" className="h-10 rounded-xl bg-gray-100 px-4 text-sm text-gray-700 hover:bg-gray-200">ค้นหา</button>
        </form>
        <select value={filters.cropId ?? ""} onChange={(e) => apply({ cropId: e.target.value || undefined })} className={inputCls}>
          <option value="">ทุกพืช</option>
          {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          เริ่มรอบตั้งแต่
          <input type="date" value={filters.from ?? ""} onChange={(e) => apply({ from: e.target.value || undefined })} className={inputCls} />
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          ถึง
          <input type="date" value={filters.to ?? ""} onChange={(e) => apply({ to: e.target.value || undefined })} className={inputCls} />
        </label>
        {hasFilter && (
          <button
            onClick={() => { setFilters({}); setSearchInput(""); setPage(0) }}
            className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-gray-500 hover:bg-gray-50"
          >
            <X className="h-4 w-4" /> ล้างตัวกรอง
          </button>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">รอบเพาะปลูก</th>
              <th className="px-4 py-3 font-medium">ช่วงเวลา</th>
              <th className="px-4 py-3 text-right font-medium">รายการ</th>
              <th className="px-4 py-3 text-right font-medium">รายรับ</th>
              <th className="px-4 py-3 text-right font-medium">รายจ่าย</th>
              <th className="px-4 py-3 text-right font-medium">กำไรสุทธิ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">{hasFilter ? "ไม่พบรอบที่ตรงกับตัวกรอง" : "ยังไม่มีผู้ใช้บันทึกสมุดบัญชี"}</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.season_id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{r.owner_name ?? "ไม่ระบุชื่อ"}</p>
                    <p className="text-xs text-gray-400">{r.owner_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.crop_name ?? "ไม่ระบุพืช"}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                    {formatDay(r.started_on)} – {r.ended_on ? formatDay(r.ended_on) : "ยังไม่สิ้นสุด"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{r.entry_count}</td>
                  <td className="px-4 py-3 text-right"><Money v={r.income} /></td>
                  <td className="px-4 py-3 text-right"><Money v={r.expense} /></td>
                  <td className="px-4 py-3 text-right font-semibold"><Money v={r.net} signed /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/ledgers/${r.season_id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-[#1A4D2E]/40 hover:text-[#1A4D2E]"
                      >
                        <Eye className="h-3.5 w-3.5" /> ดู
                      </Link>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingId !== null}
                        aria-label={`ลบรอบ ${r.name}`}
                        className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >
                        {deletingId === r.season_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} จาก {total.toLocaleString("th-TH")} รอบ
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-30" aria-label="หน้าก่อน">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">{page + 1} / {pages}</span>
            <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-30" aria-label="หน้าถัดไป">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
