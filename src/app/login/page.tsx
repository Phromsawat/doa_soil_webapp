"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react"
import {
  signInWithEmail,
  signInAnonymously,
} from "@/lib/supabase/auth"

export default function LoginPage() {
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

        {/* ใช้งานแบบไม่สมัครสมาชิก */}
        <div className="space-y-3">
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
