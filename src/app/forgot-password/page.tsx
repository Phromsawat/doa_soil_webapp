"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react"
import { sendPasswordReset } from "@/lib/supabase/auth"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await sendPasswordReset(email)
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex-1 w-full flex flex-col items-center px-4 pt-24 pb-12 font-thai bg-background">
        <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-6 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#1A4D2E] mx-auto" />
          <h1 className="text-xl font-black text-[#1A1A1A]">ส่งอีเมลแล้ว</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            กรุณาเช็คอีเมล <span className="font-bold text-[#1A4D2E]">{email}</span><br/>
            แล้วคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่
          </p>
          <p className="text-xs text-gray-400 italic">
            ไม่ได้รับอีเมล? ลองเช็คใน junk/spam
          </p>
          <Link
            href="/login"
            className="block w-full h-[48px] rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-bold text-[15px] flex items-center justify-center"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 pt-12 pb-12 font-thai bg-background">
      <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-6 relative">

        <Link
          href="/login"
          className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </Link>

        <div className="text-center space-y-3 pt-2">
          <div className="flex items-center justify-center mx-auto mb-2">
            <img src="/doa-logo.svg" alt="DOA" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">ลืมรหัสผ่าน</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            กรอกอีเมลของคุณ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="อีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-[48px] pl-12 pr-4 rounded-full border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E]/20 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-4 py-2 rounded-xl">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full h-[48px] rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-bold text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...</> : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500">
          จำได้แล้ว?{" "}
          <Link href="/login" className="text-[#1A4D2E] font-bold hover:underline">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  )
}
