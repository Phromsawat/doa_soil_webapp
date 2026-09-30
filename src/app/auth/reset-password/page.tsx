"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Loader2, CheckCircle2 } from "lucide-react"
import { updatePassword } from "@/lib/supabase/auth"

/**
 * Landed here from the password-reset email link.
 * Supabase has already set a session via the URL hash before this page renders.
 * We just need to call updateUser({ password }) to set the new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน")
      return
    }
    if (newPassword.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
      return
    }

    setLoading(true)
    try {
      await updatePassword(newPassword)
      setSuccess(true)
      setTimeout(() => router.push("/"), 2000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("Auth session missing")) {
        setError("ลิงก์หมดอายุ กรุณาขอลิงก์ใหม่ที่ 'ลืมรหัสผ่าน'")
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
        <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-4 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#1A4D2E] mx-auto" />
          <h1 className="text-xl font-black text-[#1A1A1A]">เปลี่ยนรหัสผ่านสำเร็จ</h1>
          <p className="text-sm text-gray-500">กำลังกลับไปหน้าหลัก...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 pt-12 pb-12 font-thai bg-background">
      <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-6">

        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#1A4D2E]/10 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-[#1A4D2E]" />
          </div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-sm text-gray-500">กรอกรหัสผ่านใหม่ของคุณ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="รหัสผ่านใหม่"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-[48px] px-4 pr-16 rounded-full border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-3 text-xs text-gray-500 hover:text-gray-700"
            >
              {showPassword ? "ซ่อน" : "แสดง"}
            </button>
          </div>

          <input
            type={showPassword ? "text" : "password"}
            placeholder="ยืนยันรหัสผ่านใหม่"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-[48px] px-4 rounded-full border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E]/20 transition-all"
          />

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-4 py-2 rounded-xl">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full h-[48px] rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-bold text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเปลี่ยน...</> : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500">
          <Link href="/login" className="text-[#1A4D2E] font-bold hover:underline">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  )
}
