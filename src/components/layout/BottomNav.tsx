"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, Menu, BarChart2, Users, FileBarChart, Sprout, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const ADMIN_NAV = [
  { href: "/",               label: "หน้าหลัก", icon: Home },
  { href: "/admin",          label: "ภาพรวม",  icon: BarChart2 },
  { href: "/admin/users",    label: "ผู้ใช้",   icon: Users },
  { href: "/admin/analyses", label: "ประวัติ",  icon: FileBarChart },
  { href: "/admin/crops",    label: "พืช/ปุ๋ย", icon: Sprout },
  { href: "/admin/settings", label: "ตั้งค่า",  icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleMenuState = (e: Event) => setIsMenuOpen((e as CustomEvent<boolean>).detail)
    window.addEventListener("mobile-menu-state", handleMenuState)
    return () => window.removeEventListener("mobile-menu-state", handleMenuState)
  }, [])

  if (pathname === "/login" || pathname === "/login/phone" || pathname.startsWith("/login/") || pathname === "/signup") {
    return null
  }

  // Admin bottom nav
  if (pathname.startsWith("/admin")) {
    return (
      <nav className="fixed bottom-0 inset-x-0 z-[1100] lg:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2.5">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" || href === "/" ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 px-2 py-0.5">
                <span className={cn(
                  "flex items-center justify-center w-10 h-7 transition-all duration-300",
                  active ? "text-[#1A4D2E]" : "text-gray-400"
                )}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className={cn("text-[10px] leading-none font-medium", active ? "text-[#1A4D2E]" : "text-gray-400")}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  const isHome = (pathname === "/" || pathname === "/dashboard") && !isMenuOpen

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[1100] lg:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-6 py-1">
        <Link
          href="/"
          aria-label="หน้าหลัก"
          className="flex flex-col items-center gap-1 px-4 py-0.5"
          onClick={() => { if (isMenuOpen) window.dispatchEvent(new Event("toggle-mobile-menu")) }}
        >
          <span className={cn(
            "flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300",
            isHome ? "bg-active text-white" : "text-gray-400"
          )}>
            <Home className="w-5 h-5" />
          </span>
          <span className="text-[12px] leading-none font-medium text-gray-400">หน้าหลัก</span>
        </Link>

        <button
          type="button"
          aria-label="เมนู"
          onClick={() => window.dispatchEvent(new Event("toggle-mobile-menu"))}
          className="flex flex-col items-center gap-1 px-4 py-0.5"
        >
          <span className={cn(
            "flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300",
            isMenuOpen ? "bg-active text-white" : "text-gray-400"
          )}>
            <Menu className="w-5 h-5" />
          </span>
          <span className="text-[12px] leading-none text-gray-400 font-medium">เมนู</span>
        </button>
      </div>
    </nav>
  )
}
