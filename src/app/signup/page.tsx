"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react"
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
      if (data.session) {
        router.push("/")
      } else {
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
      <div className="flex-1 w-full flex flex-col items-center px-4 py-3 sm:py-6 font-thai bg-background">
        <div className="w-full max-w-[440px] bg-white rounded-3xl border border-gray-100 p-5 sm:p-7 space-y-4 text-center">
          <CheckCircle2 className="w-14 h-14 text-[#1A4D2E] mx-auto" />
          <h1 className="text-lg font-medium text-gray-900">ส่งอีเมลยืนยันแล้ว</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            กรุณาเช็คอีเมล <span className="font-medium text-gray-700">{email}</span><br />
            แล้วคลิกลิงก์เพื่อยืนยันบัญชี
          </p>
          <Link
            href="/login"
            className="block w-full h-11 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-medium text-sm flex items-center justify-center transition-colors"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-3 sm:py-6 font-thai bg-background overflow-y-auto">
      <div className="w-full max-w-[440px] bg-white rounded-3xl border border-gray-100 p-5 sm:p-7 space-y-3 sm:space-y-5 relative">

        {/* Header */}
        <div className="flex items-center justify-center relative">
          <Link href="/login" className="absolute left-0 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <h1 className="text-lg font-medium text-gray-900">สมัครสมาชิก</h1>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center">
          <img src="/doa-logo.svg" alt="DOA" className="w-14 h-14 object-contain" />
        </div>

        <p className="text-center text-sm text-gray-500">
          สร้างบัญชีเพื่อเก็บประวัติการวิเคราะห์ดินถาวร
        </p>

        <form onSubmit={handleSignUp} className="space-y-4">
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
                placeholder="อย่างน้อย 6 ตัวอักษร"
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 pl-4">ยืนยันรหัสผ่าน</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-4 py-2 rounded-xl">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || !confirmPassword}
            className="w-full h-11 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "สมัครสมาชิก"}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500">
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="text-gray-700 font-bold hover:underline">
            เข้าสู่ระบบ
          </Link>
        </div>

      </div>
    </div>
  )
}
