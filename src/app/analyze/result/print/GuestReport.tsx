"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import SoilReportSheet from "@/components/report/SoilReportSheet"
import { buildSoilReport, type SoilReportData } from "@/lib/report/soilReport"
import { readGuestReport } from "@/lib/analysis/guestSession"
import type { PlanTab } from "@/lib/fertilizer/chemicalPlan"

/**
 * รายงานของผู้ที่ไม่ได้ล็อกอิน (/analyze/result/print?guest=1) — ไม่มีรายการในฐานข้อมูล
 * ค่าที่คำนวณไว้อยู่ใน sessionStorage (หน้าคำนวณปุ๋ยเขียนไว้ก่อนเปิดหน้านี้) จึงต้องอ่านฝั่งเบราว์เซอร์
 */
export default function GuestReport({ use }: { use: PlanTab | null }) {
  const [data, setData] = useState<SoilReportData | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading")

  useEffect(() => {
    // sessionStorage มีเฉพาะฝั่งเบราว์เซอร์ — อ่านหลัง mount
    const input = readGuestReport()
    const job = input ? buildSoilReport(input, use ?? input.plan_tab) : Promise.resolve(null)
    job
      .then((d) => {
        setData(d)
        setState(d ? "ready" : "missing")
      })
      .catch(() => setState("missing"))
  }, [use])

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center pt-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A4D2E]" />
      </div>
    )
  }

  if (state === "missing" || !data) {
    return (
      <div className="font-thai mx-auto mt-12 max-w-md px-4">
        <div className="space-y-3 rounded-2xl bg-gray-50 p-6 text-center">
          <p className="font-semibold text-gray-800">ไม่พบผลที่จะพิมพ์</p>
          <p className="text-sm text-gray-500">ผลที่ไม่ได้บันทึกจะหายเมื่อปิดแท็บ — กลับไปคำนวณใหม่อีกครั้ง</p>
          <Link
            href="/analyze/form"
            className="inline-block rounded-full bg-[#1A4D2E] px-5 py-2 text-sm font-medium text-white hover:bg-[#143a22]"
          >
            ไปหน้าคำนวณปุ๋ย
          </Link>
        </div>
      </div>
    )
  }

  return (
    <SoilReportSheet
      data={data}
      ownerName="ไม่ระบุ"
      notice="ผลนี้ไม่ได้บันทึกในระบบ — ดาวน์โหลด PDF เก็บไว้ก่อนปิดหน้านี้"
    />
  )
}
