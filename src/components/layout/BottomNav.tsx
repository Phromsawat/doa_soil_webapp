"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BottomNav() {
  const pathname = usePathname()

  if (pathname === "/login" || pathname === "/login/phone" || pathname.startsWith("/login/") || pathname === "/signup") {
    return null
  }

  const isHome = pathname === "/" || pathname === "/dashboard"

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[30] lg:hidden pb-[env(safe-area-inset-bottom)]">
      {/* Liquid Glass container */}
      <div className="relative rounded-full
                      bg-white/40 backdrop-blur-2xl
                      border border-white/60
                      shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.6)]">

        {/* Top highlight gradient (decorative, never blocks clicks) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent"
        />

        {/* Buttons */}
        <div className="relative flex items-center gap-1 px-2 py-2">
          {/* Home */}
          <Link
            href="/"
            aria-label="หน้าหลัก"
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300",
              isHome
                ? "bg-[#1A4D2E] text-white shadow-lg shadow-[#1A4D2E]/30 scale-105"
                : "text-gray-700 hover:bg-white/40 active:bg-white/60"
            )}
          >
            <Home className="w-5 h-5" />
          </Link>

          {/* Menu */}
          <button
            type="button"
            aria-label="เมนู"
            onClick={() => window.dispatchEvent(new Event("toggle-mobile-menu"))}
            className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 text-gray-700 hover:bg-white/40 active:bg-white/60"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

      </div>
    </nav>
  )
}
