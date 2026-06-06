"use client"

import { ArrowLeft } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useLanguage } from "@/components/providers/LanguageProvider"

export default function Bar() {
  const pathname = usePathname()
  const router = useRouter()
  const { language, setLanguage } = useLanguage()

  const isAnalyze = pathname.startsWith("/analyze")
  const isHistory = pathname.startsWith("/history")

  if (
    pathname === "/login" || 
    pathname === "/login/phone" || 
    pathname === "/login/otp" ||
    pathname === "/soil-sampling" ||
    pathname === "/doa-kits" ||
    pathname === "/user-guide"
  ) {
    return null
  }
  // We now show the Bar on all pages, including the landing page ("/")

  let title = "DOA-Soil Test Kit"
  let showBack = false

  if (isAnalyze) {
    title = "วิเคราะห์ดิน"
    showBack = true
  } else if (isHistory) {
    title = "ประวัติการวิเคราะห์"
    showBack = true
  }

  return (
    <header className="h-16 bg-white flex items-center justify-between px-4 sticky top-0 z-10 w-full shadow-sm">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
            <img src="/doa-logo.svg" alt="DOA Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <h2 className={`font-bold font-thai ${showBack ? 'text-lg text-text-primary' : 'text-base text-primary'}`}>
          {title}
        </h2>
      </div>
      <div className="flex items-center">
        <button 
          onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
          className="text-xs font-bold text-gray-500 hover:text-primary transition-colors px-2 py-1 border border-gray-200 rounded-md"
        >
          {language === 'th' ? 'TH' : 'EN'}
        </button>
      </div>
    </header>
  )
}
