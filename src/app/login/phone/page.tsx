"use client"

import React, { useState, useEffect, useRef } from "react"
import { ArrowLeft, X } from "lucide-react"
import { useLanguage } from "@/components/providers/LanguageProvider"
import { useRouter } from "next/navigation"

export default function PhoneLoginPage() {
  const { t } = useLanguage()
  const router = useRouter()

  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [otpError, setOtpError] = useState("")
  const [countdown, setCountdown] = useState(55)
  const [showToast, setShowToast] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (step === "otp" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown, step])

  useEffect(() => {
    if (step === "otp" && showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showToast, step])

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber) return
    const phoneRegex = /^0\d{9}$/
    if (!phoneRegex.test(phoneNumber)) {
      setError("เบอร์โทรศัพท์ของท่านไม่ถูกต้อง")
      return
    }
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setStep("otp")
      setCountdown(55)
      setShowToast(true)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }, 1500)
  }

  const handleOtpChange = (index: number, value: string) => {
    setOtpError("")
    if (value.length > 1) {
      const pastedData = value.slice(0, 6).split("")
      const newOtp = [...otp]
      pastedData.forEach((char, i) => { if (index + i < 6) newOtp[index + i] = char })
      setOtp(newOtp)
      inputRefs.current[Math.min(index + pastedData.length, 5)]?.focus()
      return
    }
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value !== "" && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const isOtpComplete = otp.every(d => d !== "")

  const handleConfirmOtp = () => {
    if (!isOtpComplete) return
    setIsVerifying(true)
    setOtpError("")
    setTimeout(() => {
      setIsVerifying(false)
      if (otp.join("") !== "123456") { setOtpError("รหัส OTP ไม่ถูกต้อง"); return }
      router.push("/")
    }, 1500)
  }

  const handleResendOtp = () => {
    if (countdown > 0) return
    setCountdown(55)
    setShowToast(true)
    setOtp(["", "", "", "", "", ""])
    inputRefs.current[0]?.focus()
  }

  const goBack = () => {
    if (step === "otp") setStep("phone")
    else router.push("/login")
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-3 sm:py-6 font-thai bg-background overflow-y-auto">
      <div className="w-full max-w-[440px] bg-white rounded-3xl border border-gray-100 p-5 sm:p-7 space-y-4 sm:space-y-5 relative">

        {/* Header */}
        <div className="flex items-center justify-center relative">
          <button onClick={goBack} className="absolute left-0 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-medium text-gray-900">
            {step === "phone" ? "เข้าสู่ระบบด้วยเบอร์โทร" : "กรอกรหัส OTP"}
          </h1>
        </div>

        {step === "phone" ? (
          <>
            <p className="text-center text-sm text-gray-500">
              {t("phoneLoginDesc") || "กรุณากรอกเบอร์โทรศัพท์ของคุณเพื่อรับรหัส OTP สำหรับเข้าสู่ระบบ"}
            </p>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 pl-4">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  placeholder="08X-XXX-XXXX"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); setError("") }}
                  required
                  className={`w-full h-11 px-4 rounded-full bg-gray-50 border text-sm text-gray-900 focus:outline-none transition-colors ${
                    error ? "border-red-400 focus:border-red-400" : "border-gray-100 focus:border-[#1A4D2E]"
                  }`}
                />
                {error && <p className="text-red-500 text-xs pl-4">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={!phoneNumber || isLoading}
                className="w-full h-11 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : (t("getOtpBtn") || "รับรหัส OTP")}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-center text-sm text-gray-500">
              ส่งรหัส OTP ไปยัง <span className="font-medium text-gray-700">{phoneNumber}</span> แล้ว
            </p>

            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value.replace(/[^0-9]/g, ""))}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className={`flex-1 h-12 rounded-xl border text-center text-xl font-medium text-gray-900 bg-gray-50 outline-none transition-all ${
                    otpError
                      ? "border-red-400 text-red-500"
                      : "border-gray-100 focus:border-[#1A4D2E]"
                  }`}
                />
              ))}
            </div>

            {otpError && <p className="text-red-500 text-xs text-center">{otpError}</p>}

            <button
              onClick={handleConfirmOtp}
              disabled={!isOtpComplete || isVerifying}
              className="w-full h-11 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isVerifying
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : (t("confirmBtn") || "ยืนยัน")}
            </button>

            <div className="text-center text-sm">
              {countdown > 0 ? (
                <span className="text-gray-400">
                  {t("resendWait")?.replace("{time}", countdown.toString()) || `ส่งรหัสอีกครั้งใน ${countdown} วินาที`}
                </span>
              ) : (
                <button onClick={handleResendOtp} className="text-gray-700 font-bold hover:underline">
                  {t("resendNow") || "ส่งรหัสอีกครั้ง"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {step === "otp" && showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-[#222] text-white rounded-full px-6 py-3 flex items-center justify-between shadow-lg z-50">
          <span className="text-sm">{t("checkInbox") || "กรุณาเช็คกล่องข้อความของคุณ"}</span>
          <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-white ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
