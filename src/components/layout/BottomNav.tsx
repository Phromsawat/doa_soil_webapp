"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/LanguageProvider"

export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  if (pathname === "/login" || pathname === "/login/phone" || pathname.startsWith("/login/")) {
    return null
  }

  const items = [
    { type: 'link', href: "/", label: t('homeMenu') || "หน้าหลัก", icon: Home },
    { type: 'button', label: "เมนู", icon: Menu }, // Or translate if needed
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-100 z-[30] pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center justify-around w-full h-16 px-2">
        {items.map((item, index) => {
          const Icon = item.icon
          const isActive = item.type === 'link' && (
            pathname === item.href || 
            (item.href === "/" && pathname === "/dashboard")
          )

          if (item.type === 'button') {
            return (
              <button
                key={`btn-${index}`}
                onClick={(e) => {
                  e.preventDefault()
                  window.dispatchEvent(new Event("toggle-mobile-menu"))
                }}
                className="flex flex-col items-center justify-center flex-1 h-full font-thai"
              >
                <div className="flex flex-col items-center justify-center w-16 h-8 rounded-full transition-colors duration-200 text-text-secondary">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium mt-1 text-text-secondary">
                  {item.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className="flex flex-col items-center justify-center flex-1 h-full font-thai"
            >
              <div className={cn(
                "flex flex-col items-center justify-center w-16 h-8 rounded-full transition-colors duration-200", 
                isActive ? "bg-active text-white" : "text-text-secondary"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-1",
                isActive ? "text-primary" : "text-text-secondary"
              )}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
