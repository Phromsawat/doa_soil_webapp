"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/Card"
import { Camera, FileEdit, CheckCircle2, Clock, History, ChevronRight, Loader2 } from "lucide-react"
import { listMyAnalyses } from "@/lib/supabase/analyses"
import { useUser } from "@/lib/supabase/useUser"
import { classify, LEVEL_LABEL_TH, type Nutrient } from "@/lib/soil/grid"

type AnalysisRow = Awaited<ReturnType<typeof listMyAnalyses>>[number]

/** ชื่อรายการ — ใช้เกณฑ์เดียวกับหน้าประวัติ */
function rowTitle(item: AnalysisRow): string {
  if (item.input_mode === "map_pin" && item.notes) {
    return item.notes.split("|||")[0] ?? item.notes
  }
  return item.notes ?? (item.input_mode === "image_upload" ? "วิเคราะห์จากรูป" : "กรอกค่าเอง")
}

const NUTRIENT_COLORS: Record<Nutrient, string> = {
  om: "text-blue-500",
  p: "text-orange-500",
  k: "text-green-500",
}

/** ป้ายระดับธาตุอาหารจากค่าจริง — ไม่มีค่า = ไม่แสดง */
function NutrientTag({ nutrient, label, value }: { nutrient: Nutrient; label: string; value: number | null }) {
  const level = classify(nutrient, value)
  if (!level) return null
  return (
    <span className="font-medium">
      <span className={`${NUTRIENT_COLORS[nutrient]} font-bold`}>{label}:</span> {LEVEL_LABEL_TH[level]}
    </span>
  )
}

export default function Dashboard() {
  const { user, loading: userLoading, displayName } = useUser()
  // null = ยังไม่ได้โหลด (แยกจาก [] ที่แปลว่าโหลดแล้วไม่มีข้อมูล)
  const [analyses, setAnalyses] = useState<AnalysisRow[] | null>(null)

  useEffect(() => {
    if (userLoading || !user) return
    let alive = true
    listMyAnalyses(100)
      .then((data) => { if (alive) setAnalyses(data ?? []) })
      .catch(() => { if (alive) setAnalyses([]) })
    return () => { alive = false }
  }, [user, userLoading])

  const busy = userLoading || (!!user && analyses === null)
  const rows = analyses ?? []
  const totalCount = rows.length
  const completedCount = rows.filter((a) => a.status === "completed").length
  const pendingCount = rows.filter((a) => a.status === "pending").length

  const today = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6 pb-20 font-thai">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          สวัสดี{displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="text-sm text-text-secondary mt-1">{today}</p>
      </div>

      {/* 2 Large Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/analyze/upload" className="block">
          <Card className="bg-[#E6F4EA] border border-[#A5D6B6] shadow-sm h-full rounded-2xl hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4 justify-center h-full">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                <Camera className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-primary text-sm">อัพโหลดรูปภาพ</h3>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analyze/form" className="block">
          <Card className="bg-card border border-gray-100 shadow-sm h-full rounded-2xl hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4 justify-center h-full">
              <div className="w-14 h-14 bg-surface rounded-full flex items-center justify-center text-text-secondary shadow-sm">
                <FileEdit className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-text-primary text-sm">กรอกผลด้วยตนเอง</h3>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stat Rows */}
      <div className="space-y-3">
        {[
          { href: "/history", icon: History, wrap: "bg-blue-50 text-blue-600", label: "การวิเคราะห์ทั้งหมด", count: totalCount },
          { href: "/history?status=pending", icon: Clock, wrap: "bg-orange-50 text-orange-500", label: "รอผล", count: pendingCount },
          { href: "/history?status=completed", icon: CheckCircle2, wrap: "bg-green-50 text-primary", label: "เสร็จสิ้น", count: completedCount },
        ].map(({ href, icon: Icon, wrap, label, count }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center justify-between bg-card p-4 rounded-2xl shadow-sm border border-gray-50 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${wrap}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-bold text-text-primary text-sm">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-text-primary">{busy ? "–" : count}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity List */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg text-text-primary">ประวัติล่าสุด</h2>

        <div className="space-y-3">
          {busy ? (
            <div className="py-8 flex items-center justify-center gap-2 text-text-secondary text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดข้อมูล...
            </div>
          ) : !user ? (
            <div className="py-8 text-center text-text-secondary text-sm bg-card rounded-2xl shadow-sm border border-gray-50 space-y-3">
              <p>เข้าสู่ระบบเพื่อดูประวัติการวิเคราะห์ของคุณ</p>
              <Link
                href="/login"
                className="inline-block px-6 py-2 bg-[#1A4D2E] text-white rounded-full font-bold text-xs hover:bg-[#143a22]"
              >
                เข้าสู่ระบบ
              </Link>
            </div>
          ) : rows.length > 0 ? (
            rows.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={item.status === "completed" ? `/analyze/result?id=${item.id}` : "/analyze/upload"}
                className="block"
              >
                <Card className="bg-card border-none shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-text-primary text-base truncate">{rowTitle(item)}</h4>
                          <div
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              item.status === "completed"
                                ? "bg-[#E6F4EA] text-primary"
                                : "bg-orange-100 text-orange-600"
                            }`}
                          >
                            {item.status === "completed" ? "เสร็จสิ้น" : "รอผล"}
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary mb-3">
                          {new Date(item.created_at).toLocaleDateString("th-TH", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>

                        {item.status === "completed" && (
                          <div className="flex items-center gap-3 text-xs flex-wrap">
                            <NutrientTag nutrient="om" label="OM" value={item.om_value} />
                            <NutrientTag nutrient="p" label="P" value={item.p_value} />
                            <NutrientTag nutrient="k" label="K" value={item.k_value} />
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 mt-2 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="py-8 text-center text-text-secondary text-sm bg-card rounded-2xl shadow-sm border border-gray-50">
              ยังไม่มีประวัติการวิเคราะห์
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
