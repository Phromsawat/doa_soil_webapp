import { getAdminStats } from "@/lib/supabase/admin"
import { Users, FileBarChart, Sprout, Activity, ShieldCheck, Clock } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const stats = await getAdminStats()

  const cards = [
    {
      label: "ผู้ใช้ทั้งหมด",
      value: stats.totalUsers,
      sub: `${stats.adminCount} admin`,
      icon: Users,
      color: "text-blue-500",
      href: "/admin/users",
    },
    {
      label: "การวิเคราะห์ทั้งหมด",
      value: stats.totalAnalyses,
      sub: `${stats.completedAnalyses} เสร็จสิ้น · ${stats.pendingAnalyses} รอดำเนินการ`,
      icon: FileBarChart,
      color: "text-green-600",
      href: "/admin/analyses",
    },
    {
      label: "พืชในระบบ",
      value: stats.totalCrops,
      sub: `${stats.totalRecommendations} recommendations`,
      icon: Sprout,
      color: "text-amber-500",
      href: "/admin/crops",
    },
    {
      label: "ใช้งาน 7 วันล่าสุด",
      value: stats.recentAnalyses,
      sub: "การวิเคราะห์ใหม่",
      icon: Activity,
      color: "text-purple-500",
      href: "/admin/analyses",
    },
  ]

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900">ภาพรวมระบบ</h1>
          <p className="text-sm text-gray-400 mt-0.5">สถานะการใช้งานโดยรวม</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" /> Admin Mode
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors"
          >
            <Icon className="w-5 h-5 mb-3 text-gray-400" strokeWidth={1} />
            <p className="text-xs font-medium text-gray-400">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
            <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" /> เริ่มงานเร็ว
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href="/admin/users"
            className="px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
          >
            จัดการผู้ใช้
          </Link>
          <Link
            href="/admin/analyses"
            className="px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
          >
            ดูประวัติทั้งหมด
          </Link>
          <Link
            href="/admin/crops"
            className="px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
          >
            แก้ไขข้อมูลพืช/ปุ๋ย
          </Link>
        </div>
      </div>

      {/* Coming soon */}
      <div className="bg-[#1A4D2E] text-white rounded-2xl p-6">
        <h2 className="text-sm font-medium mb-2">ฟีเจอร์ที่กำลังพัฒนา</h2>
        <ul className="text-sm text-white/70 space-y-2">
          {[
            "CMS แก้ banner / ข้อความหน้าเว็บ",
            "Export ข้อมูลเป็น CSV / Excel",
            "Audit log บันทึกการแก้ไข",
            "เชื่อม AI prediction (รอ endpoint จากทีม)",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
