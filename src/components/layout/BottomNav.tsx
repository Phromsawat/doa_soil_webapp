"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Sprout, History, User } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BottomNav() {
  const pathname = usePathname()

  if (pathname === "/login" || pathname === "/login/phone" || pathname.startsWith("/login/")) {
    return null
  }

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/analyze", label: "Soil Test", icon: Sprout },
    { href: "/history", label: "History", icon: History },
    { href: "/profile", label: "Profile", icon: User },
  ]

  return (
    <nav className="fixed bottom-0 w-full max-w-[375px] h-16 bg-white border-t border-gray-100 flex items-center justify-around px-2 z-30 pb-safe">
      {links.map((link) => {
        const Icon = link.icon
        const isActive = 
          pathname === link.href || 
          (link.href === "/" && pathname === "/dashboard") ||
          (link.href === "/analyze" && pathname.startsWith("/analyze"))

        return (
          <Link
            key={link.href}
            href={link.href === "/analyze" ? "/analyze/upload" : link.href}
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
            )}>{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
