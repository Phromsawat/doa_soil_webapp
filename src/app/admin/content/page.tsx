import Link from "next/link"
import { FileText, ExternalLink, ChevronRight } from "lucide-react"
import { listPageContents } from "@/lib/supabase/pageContent"
import { PAGE_TITLES } from "@/types/content"

export const dynamic = "force-dynamic"

function formatThaiDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function AdminContentPage() {
  const pages = await listPageContents()

  return (
    <div className="font-thai space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">จัดการเนื้อหา</h1>
        <p className="text-sm text-gray-500 mt-1">
          แก้ข้อความ รูป และวิดีโอในหน้าข้อมูลได้เอง โดยไม่ต้องแก้โค้ด
        </p>
      </div>

      <div className="space-y-3">
        {pages.map((p) => (
          <div
            key={p.slug}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-800 truncate">{PAGE_TITLES[p.slug]}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                /{p.slug} · {p.blockCount} บล็อก ·{" "}
                {p.customised && p.updated_at ? (
                  <>แก้ล่าสุด {formatThaiDateTime(p.updated_at)}</>
                ) : (
                  <span className="text-gray-400">ยังใช้เนื้อหาตั้งต้น</span>
                )}
              </p>
            </div>

            <Link
              href={`/${p.slug}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-2"
            >
              <ExternalLink className="w-3.5 h-3.5" /> ดูหน้าจริง
            </Link>

            <Link
              href={`/admin/content/${p.slug}`}
              className="flex items-center gap-1 rounded-full bg-[#1A4D2E] px-4 py-2 text-sm font-medium text-white hover:bg-[#143a22] shrink-0"
            >
              แก้ไข <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
