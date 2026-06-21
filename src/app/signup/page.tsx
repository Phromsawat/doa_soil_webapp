"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Lock, Loader2, CheckCircle2 } from "lucide-react"
import { signUpWithEmail } from "@/lib/supabase/auth"

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน")
      return
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
      return
    }

    setLoading(true)
    try {
      const data = await signUpWithEmail(email, password)
      // If Confirm Email is OFF in Supabase → session is set immediately
      if (data.session) {
        router.push("/")
      } else {
        // Confirm Email is ON → user must click link in email first
        setSuccess(true)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("already registered")) {
        setError("อีเมลนี้มีผู้ใช้แล้ว ลองเข้าสู่ระบบแทน")
      } else if (msg.includes("Password")) {
        setError("รหัสผ่านไม่ถูกต้องตามเงื่อนไข")
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex-1 w-full flex flex-col items-center px-4 pt-24 pb-12 font-thai bg-background">
        <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-6 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#1A4D2E] mx-auto" />
          <h1 className="text-xl font-black text-[#1A1A1A]">ส่งอีเมลยืนยันแล้ว</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            กรุณาเช็คอีเมล <span className="font-bold text-[#1A4D2E]">{email}</span><br/>
            แล้วคลิกลิงก์เพื่อยืนยันบัญชี
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
          <ArrowLeft className="w-6 h-6" />
        </Link>

        <div className="text-center space-y-3 pt-2">
          <div className="flex items-center justify-center mx-auto mb-2">
            <img src="/doa-logo.svg" alt="DOA" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">สมัครสมาชิก</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            สร้างบัญชีเพื่อเก็บประวัติการวิเคราะห์ดินถาวร
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-3">
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

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-[48px] pl-12 pr-16 rounded-full border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-3 text-xs text-gray-500 hover:text-gray-700"
            >
              {showPassword ? "ซ่อน" : "แสดง"}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="ยืนยันรหัสผ่าน"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-[48px] pl-12 pr-4 rounded-full border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E]/20 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-4 py-2 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || !confirmPassword}
            className="w-full h-[48px] rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-bold text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "สมัครสมาชิก"}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500">
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="text-[#1A4D2E] font-bold hover:underline">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  )
}
