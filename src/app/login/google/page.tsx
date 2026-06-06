"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"

export default function GoogleMockLoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleAccountSelect = () => {
    setIsLoading(true)
    setTimeout(() => {
      router.push('/')
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-white w-full flex flex-col items-center pt-16 px-4 font-sans text-[#202124]">
      <div className="w-full max-w-[400px] flex flex-col items-start space-y-2 mb-8">
        <h1 className="text-[32px] font-normal tracking-tight">Choose an account</h1>
        <p className="text-[16px] text-[#202124]">
          to continue to <span className="text-[#1a73e8] font-medium">doa-soiltestkit.doa.go.th</span>
        </p>
      </div>

      <div className="w-full max-w-[400px] border-t border-[#dadce0]">
        
        {/* Mock Account */}
        <button 
          onClick={handleAccountSelect}
          disabled={isLoading}
          className="w-full flex items-center py-3 px-1 border-b border-[#dadce0] hover:bg-[#f8f9fa] transition-colors text-left relative"
        >
          <div className="w-10 h-10 rounded-full bg-[#1e8e3e] flex items-center justify-center text-white font-medium text-lg mr-4 shrink-0 overflow-hidden">
             {/* Mock profile picture */}
             <div className="w-full h-full bg-[#0d652d] flex items-center justify-center">
               <span className="text-white text-xl">P</span>
             </div>
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-[14px] font-medium text-[#3c4043] truncate">Phromsawat Phoolprom</span>
            <span className="text-[12px] text-[#5f6368] truncate">phromsawat0101@gmail.com</span>
          </div>
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#1a73e8]/30 border-t-[#1a73e8] rounded-full animate-spin"></div>
            </div>
          )}
        </button>

        {/* Use another account */}
        <button 
          className="w-full flex items-center py-4 px-1 border-b border-[#dadce0] hover:bg-[#f8f9fa] transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 text-[#5f6368]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          <span className="text-[14px] font-medium text-[#3c4043]">Use another account</span>
        </button>

      </div>
    </div>
  )
}
