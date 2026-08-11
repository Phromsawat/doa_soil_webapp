"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { PAGE_SLUGS, PAGE_TITLES, type PageSlug } from "@/types/content"

/** แถบหัวหน้าข้อมูล + เมนูสลับไปหน้าอื่นในกลุ่มเดียวกัน (ใช้ร่วมกันทั้ง 3 หน้า) */
export default function ContentPageHeader({ current }: { current: PageSlug }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white px-4 h-14 flex items-center shadow-sm sticky top-0 z-10 justify-between">
      <Link
        href="/"
        className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-600 shrink-0 invisible lg:visible"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
      </Link>

      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-1 text-[16px] sm:text-[17px] font-bold text-gray-800 focus:outline-none whitespace-nowrap"
        >
          {PAGE_TITLES[current]}
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${isMenuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isMenuOpen && (
          <>
            {/* คลิกนอกเมนูเพื่อปิด */}
            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[280px] bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
              {PAGE_SLUGS.map((slug, i) => (
                <div key={slug}>
                  {i > 0 && <div className="h-[1px] bg-gray-100 mx-4" />}
                  <Link
                    href={`/${slug}`}
                    className={`block px-5 py-3 text-[15px] hover:bg-gray-50 ${
                      slug === current ? "text-[#1A4D2E] font-bold" : "text-gray-700"
                    }`}
                  >
                    {PAGE_TITLES[slug]}
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="w-10" />
    </header>
  )
}
