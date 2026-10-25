import Link from "next/link"
import { notFound } from "next/navigation"
import SoilReportSheet from "@/components/report/SoilReportSheet"
import { getAnalysis } from "@/lib/supabase/analyses"
import { getMyProfile } from "@/lib/supabase/profile"
import { buildSoilReport } from "@/lib/report/soilReport"
import { parsePlanTab } from "@/lib/fertilizer/chemicalPlan"
import GuestReport from "./GuestReport"

export const dynamic = "force-dynamic"

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; use?: string; guest?: string }>
}) {
  const { id, use, guest } = await searchParams

  // แถบที่ผู้ใช้เลือกอยู่บนหน้าผล — รายงานจะพิมพ์เฉพาะแถบนี้
  // ไม่ได้ส่งมา (เช่นเปิดลิงก์ตรง ๆ) = พิมพ์ทุกแถบที่มีข้อมูล
  const selectedTab = parsePlanTab(use)

  // ผู้ที่ไม่ได้ล็อกอิน — ผลอยู่ใน sessionStorage ของเบราว์เซอร์ ไม่ใช่ในฐานข้อมูล
  if (guest) return <GuestReport use={selectedTab} />

  if (!id) notFound()
  const record = await getAnalysis(id).catch(() => null)
  if (!record) notFound()

  const [data, profile] = await Promise.all([
    buildSoilReport(record, selectedTab),
    getMyProfile().catch(() => null),
  ])

  // ชื่อเจ้าของผล — getAnalysis คืนเฉพาะผลของผู้ที่ล็อกอินอยู่ จึงใช้โปรไฟล์ของตัวเอง
  // ยังไม่ได้ตั้งชื่อ-นามสกุลในโปรไฟล์ -> ใช้ชื่อเล่น แล้วอีเมล (ระบุตัวเจ้าของได้ดีกว่า "ไม่ระบุ")
  const hasFullName = !!profile?.full_name?.trim()
  const ownerName = profile?.full_name?.trim() || profile?.nickname?.trim() || profile?.email || "ไม่ระบุ"

  return (
    <SoilReportSheet
      data={data}
      ownerName={ownerName}
      notice={
        !hasFullName && (
          <>
            รายงานยังไม่มีชื่อ-นามสกุล ·{" "}
            <Link href="/profile" className="font-medium text-[#1A4D2E] underline">
              ใส่ชื่อในหน้าโปรไฟล์
            </Link>{" "}
            แล้วเปิดรายงานใหม่
          </>
        )
      }
    />
  )
}
