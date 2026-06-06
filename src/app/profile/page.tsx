"use client"

import React from "react"
import Link from "next/link"
import { useLanguage } from "@/components/providers/LanguageProvider"
import { UserCircle } from "lucide-react"
import { Button } from "@/components/ui/Button"

export default function ProfilePage() {
  const { t } = useLanguage()

  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 pt-10 pb-12 font-thai bg-background min-h-[80vh]">
      
      <div className="w-full max-w-[340px] bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center mt-12">
        
        {/* Placeholder Icon */}
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
          <UserCircle className="w-16 h-16 text-gray-300" />
        </div>
        
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">
          {t('login') || "เข้าสู่ระบบ"}
        </h2>
        
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          กรุณาเข้าสู่ระบบเพื่อดูข้อมูลโปรไฟล์และประวัติการวิเคราะห์ดินของคุณ
        </p>
        
        <Link href="/login" className="w-full">
          <Button size="lg" className="w-full font-bold text-[15px] h-12 bg-[#1A4D2E] hover:bg-[#1A4D2E]/90 text-white rounded-full">
            {t('login') || "เข้าสู่ระบบ"}
          </Button>
        </Link>

      </div>
    </div>
  )
}
