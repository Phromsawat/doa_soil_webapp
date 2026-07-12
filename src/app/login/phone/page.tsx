"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, X } from "lucide-react"
import { useLanguage } from "@/components/providers/LanguageProvider"
import { useRouter } from "next/navigation"

export default function PhoneLoginPage() {
  const { t } = useLanguage()
  const router = useRouter()
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phoneNumber, setPhoneNumber] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // OTP State
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [otpError, setOtpError] = useState("")
  const [countdown, setCountdown] = useState(55)
  const [showToast, setShowToast] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend
  useEffect(() => {
    if (step === 'otp' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown, step])

  // Hide toast automatically after 5 seconds
  useEffect(() => {
    if (step === 'otp' && showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showToast, step])

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber) return
    
    // Validate phone number (must start with 0 and have 10 digits)
    const phoneRegex = /^0\d{9}$/
    if (!phoneRegex.test(phoneNumber)) {
      setError("เบอร์โทรศัพท์ของท่านไม่ถูกต้อง")
      return
    }
    
    setIsLoading(true)
    // Simulate API call for OTP
    setTimeout(() => {
      setIsLoading(false)
      setStep('otp')
      setCountdown(55)
      setShowToast(true)
      // Focus first OTP input when rendering OTP step
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }, 1500)
  }

  const handleOtpChange = (index: number, value: string) => {
    setOtpError("")
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.slice(0, 6).split('')
      const newOtp = [...otp]
      pastedData.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char
      })
      setOtp(newOtp)
      // Focus last filled input
      const nextIndex = Math.min(index + pastedData.length, 5)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Move to next input
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus()
    }
  }

  const isOtpComplete = otp.every(digit => digit !== "")

  const handleConfirmOtp = () => {
    if (!isOtpComplete) return
    setIsVerifying(true)
    setOtpError("")
    
    // Simulate verification
    setTimeout(() => {
      setIsVerifying(false)
      
      // Simulate wrong OTP (for demo, only 123456 is correct)
      const enteredOtp = otp.join("")
      if (enteredOtp !== "123456") {
        setOtpError("รหัส OTP ไม่ถูกต้อง")
        return
      }

      // Redirect to home/dashboard after successful login
      router.push('/')
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
    if (step === 'otp') {
      setStep('phone')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="fixed top-0 w-full h-[100dvh] flex flex-col items-center justify-center px-4 pb-12 font-thai overflow-hidden bg-background z-40">
      
      {step === 'phone' ? (
        <div className="w-full max-w-[340px] bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-8 relative">

          {/* Back Button */}
          <button onClick={goBack} className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-black text-[#1A1A1A]">
              {t('continueWithPhone') || "เข้าสู่ระบบด้วยเบอร์โทร"}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {t('phoneLoginDesc')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[14px] font-bold text-[#1A1A1A] block text-left">{t('phoneNumberLabel')}</label>
              <input 
                type="tel" 
                placeholder="08X-XXX-XXXX"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value)
                  setError("")
                }}
                className={`w-full h-[52px] px-4 rounded-xl border outline-none transition-all text-[#1A1A1A] ${
                  error 
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-[#1A4D2E] focus:ring-1 focus:ring-[#1A4D2E]'
                }`}
                required
              />
              {error && <p className="text-red-500 text-sm text-left font-medium">{error}</p>}
            </div>

            <button 
              type="submit"
              disabled={!phoneNumber || isLoading}
              className="w-full h-[52px] rounded-full border-none flex items-center justify-center bg-[#1A4D2E] hover:bg-[#1A4D2E]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span className="text-[15px] font-bold text-white">{t('getOtpBtn')}</span>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-[340px] flex flex-col space-y-8 mt-4">
          
          {/* OTP Title */}
          <h1 className="text-[18px] font-bold text-[#1A1A1A] text-left">
            {t('otpTitle')}
          </h1>

          {/* OTP Inputs */}
          <div className="flex justify-between gap-2 w-full">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className={`w-11 h-12 rounded-xl border text-center text-xl font-bold text-[#1A1A1A] outline-none transition-all bg-white ${
                  otpError 
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-red-500' 
                    : 'border-gray-200 focus:border-[#1A4D2E] focus:ring-1 focus:ring-[#1A4D2E]'
                }`}
              />
            ))}
          </div>

          {/* OTP Error Message */}
          {otpError && (
            <p className="text-red-500 text-sm text-center font-medium -mt-4">{otpError}</p>
          )}

          {/* Confirm Button */}
          <button 
            onClick={handleConfirmOtp}
            disabled={!isOtpComplete || isVerifying}
            className="w-full h-[48px] rounded-xl border-none flex items-center justify-center bg-[#1A4D2E] hover:bg-[#1A4D2E]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span className="text-[16px] font-medium text-white">{t('confirmBtn')}</span>
            )}
          </button>

          {/* Resend Timer */}
          <div className="text-center w-full mt-2">
            {countdown > 0 ? (
              <span className="text-[15px] text-[#A0A0A0]">
                {t('resendWait').replace('{time}', countdown.toString())}
              </span>
            ) : (
              <button 
                onClick={handleResendOtp}
                className="text-[15px] text-[#1A4D2E] font-bold hover:underline"
              >
                {t('resendNow')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification (only shown on OTP step) */}
      {step === 'otp' && showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-[#222222] text-white rounded-full px-6 py-4 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 z-50">
          <span className="text-[15px]">{t('checkInbox')}</span>
          <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
