"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react"
import { useLanguage } from "@/components/providers/LanguageProvider"
import {
  signInWithEmail,
  signInAnonymously,
} from "@/lib/supabase/auth"

export default function LoginPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const authErrorParam = searchParams.get("auth_error")

  // หน้าที่ต้องกลับไปหลังล็อกอิน (เช่น /admin ส่ง ?redirect=/admin มา)
  // รับเฉพาะ path ภายในเว็บ กัน open redirect ไปเว็บนอก
  const redirectParam = searchParams.get("redirect")
  const redirectTo =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [isLoadingPhone, setIsLoadingPhone] = useState(false)
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const [isLoadingAnon, setIsLoadingAnon] = useState(false)
  const [error, setError] = useState<string | null>(authErrorParam ? "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง" : null)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoadingEmail(true)
    try {
      await signInWithEmail(email, password)
      // hard navigation: ให้ server component (navbar/admin guard) เห็น session ใหม่
      // ถ้าใช้ router.push เฉยๆ RSC cache เดิมจะทำให้ดูเหมือนยังไม่ได้ล็อกอิน
      window.location.href = redirectTo
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Invalid login credentials")) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
      } else if (msg.includes("Email not confirmed")) {
        setError("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ")
      } else {
        setError(msg)
      }
    } finally {
      setIsLoadingEmail(false)
    }
  }

  const handlePhoneLogin = () => {
    setIsLoadingPhone(true)
    setTimeout(() => { window.location.href = "/login/phone" }, 500)
  }

  const handleGoogleLogin = () => {
    setIsLoadingGoogle(true)
    setTimeout(() => { window.location.href = "/login/google" }, 500)
  }

  const handleAnonymousLogin = async () => {
    setError(null)
    setIsLoadingAnon(true)
    try {
      await signInAnonymously()
      window.location.href = redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoadingAnon(false)
    }
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-3 sm:py-6 font-thai bg-background overflow-y-auto">
      <div className="w-full max-w-[440px] bg-white rounded-3xl border border-gray-100 p-5 sm:p-7 space-y-3 sm:space-y-5 relative">

        {/* Header */}
        <div className="flex items-center justify-center relative">
          <Link href="/" className="absolute left-0 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <h1 className="text-lg font-medium text-gray-900">เข้าสู่ระบบ</h1>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center pt-2">
          <img src="/doa-logo.svg" alt="DOA" className="w-16 h-16 object-contain" />
        </div>

        <p className="text-center text-sm text-gray-500 -mt-2">
          เข้าสู่ระบบเพื่อบันทึกประวัติการวิเคราะห์ดิน
        </p>

        {/* Email + Password form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 pl-4">อีเมล</label>
            <input
              type="email"
              placeholder="กรอกอีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 pl-4">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-11 px-4 pr-12 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-4 py-2 rounded-xl">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoadingEmail || !email || !password}
            className="w-full h-11 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoadingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : "เข้าสู่ระบบ"}
          </button>
        </form>

        {/* Helper links */}
        <div className="flex justify-between text-xs">
          <Link href="/forgot-password" className="text-gray-500 hover:text-[#1A4D2E]">
            ลืมรหัสผ่าน?
          </Link>
          <Link href="/signup" className="text-gray-700 font-bold hover:underline">
            สมัครสมาชิก
          </Link>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400">หรือ</span>
          </div>
        </div>

        {/* Social / Anonymous */}
        <div className="space-y-3">
          <button
            onClick={handlePhoneLogin}
            disabled={isLoadingPhone}
            className="w-full h-11 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-70 flex items-center justify-center"
          >
            {isLoadingPhone
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : (t("continueWithPhone") || "ดำเนินการต่อด้วยเบอร์โทรศัพท์")}
          </button>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoadingGoogle}
            className="w-full h-11 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-70 flex items-center justify-center relative"
          >
            <div className="absolute left-5">
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>
            {isLoadingGoogle
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : (t("continueWithGoogle") || "ดำเนินการต่อด้วย Google")}
          </button>

          <button
            onClick={handleAnonymousLogin}
            disabled={isLoadingAnon}
            className="w-full h-11 rounded-full bg-[#E6F4EA] hover:bg-[#D8E6DD] text-gray-700 font-medium text-sm transition-colors disabled:opacity-70 flex items-center justify-center"
          >
            {isLoadingAnon
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : "ใช้งานต่อโดยไม่สมัครสมาชิก"}
          </button>
        </div>

      </div>
    </div>
  )
}
