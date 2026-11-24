"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Search, Filter, ChevronRight as ChevronRightIcon, Loader2, FileText, ListChecks, FileDown, Check } from "lucide-react"
import { listMyAnalyses } from "@/lib/supabase/analyses"
import { useUser } from "@/lib/supabase/useUser"
import { REPORT_BUNDLE_MAX, reportBundleLinks } from "@/lib/report/reportLinks"

type AnalysisRow = Awaited<ReturnType<typeof listMyAnalyses>>[number]

const TABS = ["ทั้งหมด", "วิเคราะห์เสร็จสิ้น", "รอดำเนินการ"] as const
type Tab = typeof TABS[number]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function npkBadge(label: "N" | "P" | "K", val: number | null) {
  let text = "—"
  let colorClass = "bg-gray-100 text-gray-500"

  if (val !== null && val !== undefined) {
    if (label === "N") {
      if (val < 20) { text = "ต่ำ"; colorClass = "bg-red-100 text-red-600" }
      else if (val <= 60) { text = "ปานกลาง"; colorClass = "bg-orange-100 text-orange-600" }
      else { text = "สูง"; colorClass = "bg-green-100 text-primary" }
    } else if (label === "P") {
      if (val < 10) { text = "ต่ำ"; colorClass = "bg-red-100 text-red-600" }
      else if (val <= 25) { text = "ปานกลาง"; colorClass = "bg-orange-100 text-orange-600" }
      else { text = "สูง"; colorClass = "bg-green-100 text-primary" }
    } else {
      if (val < 60) { text = "ต่ำ"; colorClass = "bg-red-100 text-red-600" }
      else if (val <= 90) { text = "ปานกลาง"; colorClass = "bg-orange-100 text-orange-600" }
      else { text = "สูง"; colorClass = "bg-green-100 text-primary" }
    }
  }

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="font-medium text-text-primary">{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colorClass}`}>{text}</span>
    </div>
  )
}

export default function HistoryPage() {
  const { user, loading: userLoading } = useUser()
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("ทั้งหมด")
  const [search, setSearch] = useState("")
  // โหมดเลือกหลายรายการ -> เปิดรายงาน PDF รวม (ผลละหน้าในไฟล์เดียว)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [limitHit, setLimitHit] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setLoading(false)
      setAnalyses([])
      return
    }
    listMyAnalyses(100)
      .then((data) => setAnalyses(data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [user, userLoading])

  const filtered = useMemo(() => {
    let list = analyses
    if (activeTab === "วิเคราะห์เสร็จสิ้น") list = list.filter(a => a.status === "completed")
    else if (activeTab === "รอดำเนินการ")    list = list.filter(a => a.status === "pending")

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        (a.province && a.province.toLowerCase().includes(q)) ||
        (a.amphur && a.amphur.toLowerCase().includes(q)) ||
        (a.district && a.district.toLowerCase().includes(q))
      )
    }
    return list
  }, [analyses, activeTab, search])

  // ผลที่ยังไม่เสร็จ (รอดำเนินการ/ล้มเหลว) ไม่มีค่าให้ออกรายงาน จึงเลือกไม่ได้
  const selectable = (a: AnalysisRow) => a.status === "completed"
  const visibleSelectable = filtered.filter(selectable)
  const allVisibleSelected = visibleSelectable.length > 0 && visibleSelectable.every((a) => selected.has(a.id))

  // เรียงตามลำดับในรายการ (ใหม่ -> เก่า) ไม่ใช่ลำดับที่กดเลือก
  const selectedIds = analyses.filter((a) => selected.has(a.id)).map((a) => a.id)
  const reportHref = selectedIds.length > 0 ? reportBundleLinks(selectedIds)[0].href : null

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
      setLimitHit(false)
    } else if (next.size >= REPORT_BUNDLE_MAX) {
      setLimitHit(true)
      return
    } else {
      next.add(id)
    }
    setSelected(next)
  }

  function toggleAllVisible() {
    const next = new Set(selected)
    if (allVisibleSelected) {
      for (const a of visibleSelectable) next.delete(a.id)
      setLimitHit(false)
    } else {
      for (const a of visibleSelectable) {
        if (next.size >= REPORT_BUNDLE_MAX) break
        next.add(a.id)
      }
      setLimitHit(visibleSelectable.some((a) => !next.has(a.id)))
    }
    setSelected(next)
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
    setLimitHit(false)
  }

  // ============ States ============

  if (userLoading || loading) {
    return (
      <div className="font-thai flex items-center justify-center pt-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A4D2E]" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="font-thai max-w-md mx-auto mt-12 px-4">
        <div className="bg-white rounded-2xl p-8 text-center space-y-4 border border-gray-100 shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-700 font-semibold">กรุณาเข้าสู่ระบบ</p>
          <p className="text-sm text-gray-500">เพื่อดูประวัติการวิเคราะห์ของคุณ</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-[#1A4D2E] text-white rounded-full font-bold text-sm hover:bg-[#143a22] transition-colors"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="font-thai max-w-md mx-auto mt-12 px-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl text-center text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className={`font-thai space-y-5 px-4 max-w-3xl mx-auto pt-4 ${selectMode ? "pb-48 lg:pb-32" : "pb-24"}`}>
      {/* Badge */}
      <div className="flex justify-center mb-2">
        <div className="bg-green-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
          {analyses.length} รายการ
        </div>
      </div>


      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาจังหวัด อำเภอ หรือชื่อพืช..."
            className="w-full h-12 bg-white rounded-full pl-12 pr-4 text-sm border border-gray-200 focus:outline-none focus:border-gray-400"
          />
        </div>
        <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 text-text-primary shrink-0 hover:bg-gray-50 transition-colors">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "bg-text-primary text-white"
                : "bg-white text-text-secondary border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* เลือกหลายรายการ -> รายงาน PDF รวม */}
      {analyses.some(selectable) && (
        <div className="flex items-center justify-between gap-3 text-sm">
          {selectMode ? (
            <>
              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={visibleSelectable.length === 0}
                className="flex items-center gap-2 font-medium text-text-primary disabled:opacity-40"
              >
                <CheckBox checked={allVisibleSelected} />
                เลือกทั้งหมดที่แสดง ({visibleSelectable.length})
              </button>
              <button
                type="button"
                onClick={exitSelectMode}
                className="text-gray-500 hover:text-gray-800"
              >
                ยกเลิก
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 font-medium text-[#1A4D2E] hover:bg-gray-50"
            >
              <ListChecks className="h-4 w-4" /> เลือกหลายรายการเพื่อออก PDF รวม
            </button>
          )}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">
            {analyses.length === 0 ? "ยังไม่มีประวัติการวิเคราะห์" : "ไม่พบรายการที่ตรงกับคำค้นหา"}
          </p>
          {analyses.length === 0 && (
            <Link
              href="/analyze"
              className="inline-block mt-4 px-6 py-2 bg-[#1A4D2E] text-white rounded-full font-bold text-sm hover:bg-[#143a22]"
            >
              เริ่มวิเคราะห์
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {filtered.map((item) => {
            const firstImage = item.analysis_images?.[0]?.public_url
            const location = [item.district, item.amphur, item.province].filter(Boolean).join(" ") ||
              (item.latitude && item.longitude
                ? `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}`
                : "-")
            const canSelect = selectMode && selectable(item)
            const isSelected = selected.has(item.id)
            return (
              <div
                key={item.id}
                onClick={(e) => {
                  // โหมดเลือก: กดตรงไหนของการ์ดก็เลือกได้ ยกเว้นลิงก์ "ดูรายละเอียด"
                  if (!canSelect || (e.target as HTMLElement).closest("a, button")) return
                  toggleOne(item.id)
                }}
                className={`bg-white rounded-2xl p-4 shadow-sm border flex gap-4 transition-colors ${
                  isSelected ? "border-[#1A4D2E] ring-1 ring-[#1A4D2E]" : "border-gray-100"
                } ${canSelect ? "cursor-pointer" : ""} ${selectMode && !canSelect ? "opacity-50" : ""}`}
              >
                {selectMode && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label="เลือกรายการนี้"
                    disabled={!canSelect}
                    onClick={() => toggleOne(item.id)}
                    className="self-center shrink-0 disabled:cursor-not-allowed"
                  >
                    <CheckBox checked={isSelected} />
                  </button>
                )}

                {/* Thumbnail — โหมดเลือกบนจอแคบซ่อนไว้ ให้ช่องติ๊กใช้ที่แทน */}
                <div className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 relative bg-gray-100 items-center justify-center ${selectMode ? "hidden sm:flex" : "flex"}`}>
                  {firstImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstImage} alt="soil sample" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-300" strokeWidth={1} />
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-medium text-text-primary text-sm leading-tight truncate">
                        {(() => {
                        if (item.input_mode === "map_pin" && item.notes) {
                          const parts = item.notes.split("|||")
                          return parts[0] ?? item.notes
                        }
                        return item.notes ?? (item.input_mode === "image_upload" ? "วิเคราะห์จากรูป" : "กรอกค่าเอง")
                      })()}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.input_mode === "map_pin" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">ปักพิกัด</span>
                        )}
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          item.status === "completed" ? "bg-green-100 text-gray-700"
                          : item.status === "pending" ? "bg-orange-100 text-orange-600"
                          : "bg-red-100 text-red-600"
                        }`}>
                          {item.status === "completed" ? "เสร็จสิ้น" : item.status === "pending" ? "รอดำเนินการ" : "ล้มเหลว"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary font-medium truncate">
                      {formatDate(item.created_at)} • {location}
                    </div>
                  </div>

                  {item.status === "completed" && (item.om_value !== null || item.p_value !== null || item.k_value !== null) ? (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex gap-2.5 bg-gray-50 rounded-lg p-1.5 flex-1 overflow-hidden">
                        {npkBadge("N", item.om_value)}
                        {npkBadge("P", item.p_value)}
                        {npkBadge("K", item.k_value)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-text-secondary italic">
                      {item.status === "pending" ? "กำลังประมวลผล..." : ""}
                    </div>
                  )}

                  <Link href={`/analyze/result?id=${item.id}`} className="mt-3 flex items-center justify-end text-xs font-medium text-gray-700 hover:text-gray-500 transition-colors">
                    ดูรายละเอียด <ChevronRightIcon className="w-4 h-4 ml-0.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* แถบสั่งออกรายงาน — ลอยเหนือแถบเมนูล่าง (มือถือ) */}
      {selectMode && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[1090] px-4 lg:bottom-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 pl-5 shadow-lg">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-text-primary">เลือกแล้ว {selectedIds.length} รายการ</p>
              <p className={`text-xs ${limitHit ? "text-amber-600" : "text-gray-500"}`}>
                {limitHit
                  ? `สูงสุด ${REPORT_BUNDLE_MAX} รายการต่อฉบับ`
                  : "รวมเป็น PDF ไฟล์เดียว"}
              </p>
            </div>
            {reportHref ? (
              <a
                href={reportHref}
                target="_blank"
                rel="noopener"
                className="flex shrink-0 items-center gap-2 rounded-full bg-[#1A4D2E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#143a22]"
              >
                <FileDown className="h-4 w-4" /> รายงาน PDF รวม
              </a>
            ) : (
              <span className="flex shrink-0 cursor-not-allowed items-center gap-2 rounded-full bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-500">
                <FileDown className="h-4 w-4" /> รายงาน PDF รวม
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
        checked ? "border-[#1A4D2E] bg-[#1A4D2E] text-white" : "border-gray-300 bg-white"
      }`}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  )
}
