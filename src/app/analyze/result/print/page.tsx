import Link from "next/link"
import { notFound } from "next/navigation"
import SoilReportSheet from "@/components/report/SoilReportSheet"
import { getAnalysesByIds, getAnalysis } from "@/lib/supabase/analyses"
import { getMyProfile } from "@/lib/supabase/profile"
import { buildSoilReport, type SoilReportData } from "@/lib/report/soilReport"
import { parsePlanTab } from "@/lib/fertilizer/chemicalPlan"
import { parseReportIds } from "@/lib/report/reportLinks"
import GuestReport from "./GuestReport"

export const dynamic = "force-dynamic"

/** ทำทีละไม่กี่รายการพร้อมกัน — แต่ละผลดึงตารางอ้างอิงหลายตาราง ไม่ยิงใส่ฐานข้อมูลทีเดียวทั้งหมด */
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; ids?: string; use?: string; guest?: string }>
}) {
  const { id, ids, use, guest } = await searchParams

  // แถบที่ผู้ใช้เลือกอยู่บนหน้าผล — รายงานจะพิมพ์เฉพาะแถบนี้
  // ไม่ได้ส่งมา (เช่นเปิดลิงก์ตรง ๆ) = พิมพ์ทุกแถบที่มีข้อมูล
  const selectedTab = parsePlanTab(use)

  // ผู้ที่ไม่ได้ล็อกอิน — ผลอยู่ใน sessionStorage ของเบราว์เซอร์ ไม่ใช่ในฐานข้อมูล
  if (guest) return <GuestReport use={selectedTab} />

  // รายงานรวม (?ids=a,b,c) — หลายผลในไฟล์เดียว ผลละหน้า เช่นผลที่นำเข้าจากไฟล์ Excel
  // แต่ละผลพิมพ์แถบที่บันทึกไว้กับผลนั้น (ผลจากไฟล์ = ปุ๋ยเคมี) เหมือนตอนเปิดดูทีละรายการ
  const wantedIds = parseReportIds(ids)
  let reports: SoilReportData[]
  let missing = 0
  if (wantedIds.length > 0) {
    const records = await getAnalysesByIds(wantedIds).catch(() => [])
    if (records.length === 0) notFound()
    missing = wantedIds.length - records.length
    reports = await mapLimit(records, 4, (r) => buildSoilReport(r, selectedTab ?? parsePlanTab(r.plan_tab)))
  } else {
    if (!id) notFound()
    const record = await getAnalysis(id).catch(() => null)
    if (!record) notFound()
    reports = [await buildSoilReport(record, selectedTab)]
  }

  const profile = await getMyProfile().catch(() => null)

  // ชื่อเจ้าของผล — getAnalysis คืนเฉพาะผลของผู้ที่ล็อกอินอยู่ จึงใช้โปรไฟล์ของตัวเอง
  // ยังไม่ได้ตั้งชื่อ-นามสกุลในโปรไฟล์ -> ใช้ชื่อเล่น แล้วอีเมล (ระบุตัวเจ้าของได้ดีกว่า "-")
  const hasFullName = !!profile?.full_name?.trim()
  const ownerName = profile?.full_name?.trim() || profile?.nickname?.trim() || profile?.email || "-"

  return (
    <SoilReportSheet
      data={reports}
      ownerName={ownerName}
      notice={
        (missing > 0 || !hasFullName) && (
          <>
            {missing > 0 && <>ไม่พบ {missing} รายการ (อาจถูกลบไปแล้ว) · </>}
            {!hasFullName && (
              <>
                รายงานยังไม่มีชื่อ-นามสกุล ·{" "}
                <Link href="/profile" className="font-medium text-[#1A4D2E] underline">
                  ใส่ชื่อในหน้าโปรไฟล์
                </Link>{" "}
                แล้วเปิดรายงานใหม่
              </>
            )}
          </>
        )
      }
    />
  )
}
