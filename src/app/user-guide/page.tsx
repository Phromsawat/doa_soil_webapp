"use client"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown } from "lucide-react"

export default function UserGuidePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-thai">
      {/* Header */}
      <header className="bg-white px-4 h-14 flex items-center shadow-sm sticky top-0 z-10 gap-1">
        <Link href="/" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-600 shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1 text-[17px] font-bold text-gray-800 focus:outline-none whitespace-nowrap"
          >
            คู่มือการใช้เว็บแอปฯ
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isMenuOpen && (
            <>
              {/* Overlay to close menu when clicking outside */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              ></div>
              <div className="absolute top-full left-0 mt-4 w-[280px] bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <Link href="/soil-sampling" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-gray-700">
                  วิธีการเก็บตัวอย่างดิน
                </Link>
                <div className="h-[1px] bg-gray-100 mx-4"></div>
                <Link href="/doa-kits" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-gray-700">
                  การวิเคราะห์ดินด้วย DOA-Soil Test Kits
                </Link>
                <div className="h-[1px] bg-gray-100 mx-4"></div>
                <Link href="/user-guide" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-[#1A4D2E] font-bold">
                  คู่มือการใช้เว็บแอปฯ
                </Link>
              </div>
            </>
          )}
        </div>
        <div className="w-10"></div>
      </header>
      
      <div className="p-4 flex flex-col items-center justify-center h-64">
        <p className="text-gray-500">กำลังจัดทำข้อมูลหน้านี้</p>
      </div>
    </div>
  )
}
