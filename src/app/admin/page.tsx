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
      color: "from-blue-500 to-blue-600",
      href: "/admin/users",
    },
    {
      label: "การวิเคราะห์ทั้งหมด",
      value: stats.totalAnalyses,
      sub: `${stats.completedAnalyses} เสร็จสิ้น · ${stats.pendingAnalyses} รอดำเนินการ`,
      icon: FileBarChart,
      color: "from-green-600 to-green-700",
      href: "/admin/analyses",
    },
    {
      label: "พืชในระบบ",
      value: stats.totalCrops,
      sub: `${stats.totalRecommendations} recommendations`,
      icon: Sprout,
      color: "from-amber-500 to-amber-600",
      href: "/admin/crops",
    },
    {
      label: "ใช้งาน 7 วันล่าสุด",
      value: stats.recentAnalyses,
      sub: "การวิเคราะห์ใหม่",
      icon: Activity,
      color: "from-purple-500 to-purple-600",
      href: "/admin/analyses",
    },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ภาพรวมระบบ</h1>
          <p className="text-sm text-gray-500 mt-1">สถานะการใช้งานโดยรวม</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" /> Admin Mode
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center mb-3 shadow-lg`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
            <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" /> เริ่มงานเร็ว
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href="/admin/users"
            className="px-4 py-3 rounded-xl border border-gray-200 hover:border-[#1A4D2E] hover:bg-[#1A4D2E]/5 text-sm font-medium text-gray-700 transition-colors"
          >
            👤 จัดการผู้ใช้
          </Link>
          <Link
            href="/admin/analyses"
            className="px-4 py-3 rounded-xl border border-gray-200 hover:border-[#1A4D2E] hover:bg-[#1A4D2E]/5 text-sm font-medium text-gray-700 transition-colors"
          >
            📊 ดูประวัติทั้งหมด
          </Link>
          <Link
            href="/admin/crops"
            className="px-4 py-3 rounded-xl border border-gray-200 hover:border-[#1A4D2E] hover:bg-[#1A4D2E]/5 text-sm font-medium text-gray-700 transition-colors"
          >
            🌱 แก้ไขข้อมูลพืช/ปุ๋ย
          </Link>
        </div>
      </div>

      {/* Coming soon section */}
      <div className="bg-gradient-to-r from-[#1A2F2A] to-[#1A4D2E] text-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold mb-2">🚧 ฟีเจอร์ที่กำลังพัฒนา</h2>
        <ul className="text-sm text-white/80 space-y-1 list-disc pl-5">
          <li>CMS — แก้ banner / ข้อความหน้าเว็บ</li>
          <li>Export ข้อมูลเป็น CSV / Excel</li>
          <li>Audit log — บันทึกการแก้ไข</li>
          <li>เชื่อม AI prediction (รอ endpoint จากทีม)</li>
        </ul>
      </div>
    </div>
  )
}
