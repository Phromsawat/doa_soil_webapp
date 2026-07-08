"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, User as UserIcon, Mail, Phone, Lock, Loader2, CheckCircle2 } from "lucide-react"
import { useUser } from "@/lib/supabase/useUser"
import { getMyProfile, updateMyProfile } from "@/lib/supabase/profile"
import type { Profile } from "@/types/database"

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: userLoading, isAnonymous } = useUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form fields
  const [fullName, setFullName] = useState("")
  const [nickname, setNickname] = useState("")
  const [phone, setPhone] = useState("")

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    getMyProfile()
      .then((p) => {
        setProfile(p)
        if (p) {
          setFullName(p.full_name ?? "")
          setNickname(p.nickname ?? "")
          setPhone(p.phone ?? "")
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [user, userLoading, router])

  const isDirty =
    fullName.trim() !== (profile?.full_name ?? "") ||
    nickname.trim() !== (profile?.nickname ?? "") ||
    phone.trim() !== (profile?.phone ?? "")

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      await updateMyProfile({
        full_name: fullName.trim() || null,
        nickname: nickname.trim() || null,
        phone: phone.trim() || null,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (userLoading || loading) {
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
          <UserIcon className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-700 font-semibold">คุณยังเป็นผู้ใช้ไม่ระบุตัวตน</p>
          <p className="text-sm text-gray-500">สมัครสมาชิกเพื่อเก็บโปรไฟล์ถาวร</p>
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
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-6 relative">

        <div className="flex items-center justify-center relative">
          <Link href="/" className="absolute left-0 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-medium text-gray-900">แก้ไขโปรไฟล์</h1>
        </div>

        <div className="flex items-center justify-center pt-2">
          <div className="w-20 h-20 rounded-full bg-[#1A4D2E] text-white flex items-center justify-center text-3xl font-bold shadow-lg">
            {(fullName || nickname || profile?.email || user?.email || "?").charAt(0).toUpperCase()}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 pl-4">อีเมล</label>
            <input
              type="email"
              value={user?.email ?? profile?.email ?? ""}
              disabled
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400 pl-2">ติดต่อแอดมินหากต้องการเปลี่ยนอีเมล</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 pl-4">ชื่อ-นามสกุล</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ระบุชื่อ-นามสกุล"
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 pl-4">ชื่อเล่น</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="ระบุชื่อเล่น (แสดงในเมนู)"
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 pl-4">เบอร์โทร</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08x-xxx-xxxx"
              className="w-full h-11 px-4 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E]"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> บันทึกข้อมูลเรียบร้อย
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !isDirty}
            className={`w-full h-11 rounded-full text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
              isDirty
                ? "bg-[#1A4D2E] hover:bg-[#143a22] cursor-pointer"
                : "bg-[#1A4D2E]/50 cursor-not-allowed"
            }`}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</> : "บันทึก"}
          </button>
        </form>

        <div className="pt-4 border-t border-gray-100">
          <Link
            href="/profile/change-password"
            className="flex items-center justify-between py-3 px-1 hover:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-semibold text-sm text-gray-800">เปลี่ยนรหัสผ่าน</p>
                <p className="text-xs text-gray-500">อัปเดตรหัสผ่านบัญชี</p>
              </div>
            </div>
            <span className="text-gray-400">›</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
