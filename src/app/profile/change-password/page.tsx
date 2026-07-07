"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { useUser } from "@/lib/supabase/useUser"
import { updatePassword } from "@/lib/supabase/auth"

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, loading: userLoading, isAnonymous } = useUser()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!user) router.push("/login")
  }, [user, userLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน")
      return
    }
    if (newPassword.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
      return
    }

    setSaving(true)
    try {
      await updatePassword(newPassword)
      setSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        setSuccess(false)
        router.push("/profile")
      }, 2000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("same as the old")) {
        setError("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม")
      } else if (msg.includes("Password should")) {
        setError("รหัสผ่านไม่แข็งแรงพอ")
      } else {
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center pt-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A4D2E]" />
      </div>
    )
  }

  if (isAnonymous) {
    return (
      <div className="font-thai max-w-md mx-auto mt-12 px-4">
        <div className="bg-white rounded-2xl p-8 text-center space-y-4 border border-gray-100 shadow-sm">
          <Lock className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-700 font-semibold">ผู้ใช้ไม่ระบุตัวตนไม่มีรหัสผ่าน</p>
          <p className="text-sm text-gray-500">สมัครสมาชิกเพื่อตั้งรหัสผ่าน</p>
          <Link
            href="/signup"
            className="inline-block px-6 py-2 bg-[#1A4D2E] text-white rounded-full font-bold text-sm hover:bg-[#143a22] transition-colors"
          >
            สมัครสมาชิก
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 pt-12 pb-32 font-thai bg-background">
      <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-6 relative">

        <div className="flex items-center justify-center relative">
          <Link href="/profile" className="absolute left-0 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-medium text-gray-900">เปลี่ยนรหัสผ่าน</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 pl-4">รหัสผ่านใหม่</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full h-11 px-4 pr-16 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E]"
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
            <label className="text-xs font-semibold text-gray-600 pl-4">ยืนยันรหัสผ่านใหม่</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="ใส่รหัสผ่านอีกครั้ง"
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E]"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> เปลี่ยนรหัสผ่านเรียบร้อย กำลังกลับไปหน้าโปรไฟล์...
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !newPassword || !confirmPassword}
            className={`w-full h-11 rounded-full text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
              newPassword && confirmPassword
                ? "bg-[#1A4D2E] hover:bg-[#143a22] cursor-pointer"
                : "bg-[#1A4D2E]/50 cursor-not-allowed"
            }`}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเปลี่ยน...</> : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>

      </div>
    </div>
  )
}
