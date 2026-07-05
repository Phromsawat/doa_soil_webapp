"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  FileBarChart,
  Sprout,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/supabase/auth"
import { useRouter } from "next/navigation"

const NAV_ITEMS = [
  { href: "/admin",                 label: "ภาพรวม",        icon: LayoutDashboard },
  { href: "/admin/users",           label: "จัดการผู้ใช้",     icon: Users },
  { href: "/admin/analyses",        label: "ประวัติวิเคราะห์", icon: FileBarChart },
  { href: "/admin/crops",           label: "พืชและสูตรปุ๋ย",   icon: Sprout },
  { href: "/admin/settings",        label: "ตั้งค่า",          icon: Settings },
]

export default function AdminSidebar({ user }: { user: { email: string; name: string } }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-20 left-4 z-30 w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-700"
        aria-label="เปิดเมนูแอดมิน"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 left-0 bottom-0 w-64 bg-[#1A2F2A] text-white z-50 transition-transform duration-200 flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-[#1A2F2A] font-bold">
              A
            </div>
            <div>
              <p className="font-bold text-sm">Admin Panel</p>
              <p className="text-[10px] text-white/60">DOA Soil Kit</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/20 text-accent"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User + back link */}
        <div className="border-t border-white/10 p-4 space-y-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-accent text-[#1A2F2A] font-bold flex items-center justify-center text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">{user.name}</p>
              <p className="text-[10px] text-white/50 truncate">{user.email}</p>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/70 hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            กลับไปหน้าเว็บ
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  )
}
