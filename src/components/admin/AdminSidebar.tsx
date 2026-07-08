"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileBarChart,
  Sprout,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/supabase/auth"
import { useRouter } from "next/navigation"

const NAV_ITEMS = [
  { href: "/admin",          label: "ภาพรวม",  icon: LayoutDashboard },
  { href: "/admin/users",    label: "ผู้ใช้",   icon: Users },
  { href: "/admin/analyses", label: "ประวัติ",  icon: FileBarChart },
  { href: "/admin/crops",    label: "พืช/ปุ๋ย", icon: Sprout },
  { href: "/admin/settings", label: "ตั้งค่า",  icon: Settings },
]

export default function AdminSidebar({ user }: { user: { email: string; name: string } }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
    router.refresh()
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── */}
      <aside className="hidden lg:flex fixed top-16 left-0 bottom-0 w-64 bg-[#1A2F2A] text-white z-50 flex-col">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-[#1A2F2A] font-bold">
            A
          </div>
          <div>
            <p className="font-bold text-sm">Admin Panel</p>
            <p className="text-[10px] text-white/60">DOA Soil Kit</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-accent/20 text-accent"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

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
