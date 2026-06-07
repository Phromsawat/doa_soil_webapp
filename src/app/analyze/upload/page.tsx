"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FlaskConical, Hash, Phone as PhoneIcon, MapPin, Folder, Ban, BarChart2, Paperclip } from "lucide-react"
import { TermsModal } from "@/components/TermsModal"

export default function AnalyzeUpload() {
  const router = useRouter()
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [isTermsOpen, setIsTermsOpen] = useState(false)

  return (
    <div className="font-thai pb-32">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8 mt-4 mx-4">
        
        {/* Section 1: สารอาหารในดิน */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg mb-4">
            <span>สารอาหารในดิน</span>
          </div>

          {['อินทรียวัตถุ', 'ฟอสฟอรัส', 'โพแทสเซียม'].map((nutrient, idx) => (
            <div key={idx} className="flex flex-col lg:flex-row lg:items-center gap-3 bg-gray-50/50 p-2 rounded-xl">
              <div className="flex items-center gap-2 w-40 shrink-0 px-2">
                <span className="font-semibold text-sm text-gray-700">{nutrient}</span>
              </div>
              
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-gray-600 text-sm flex items-center overflow-hidden whitespace-nowrap text-ellipsis">
                  {files[nutrient] ? files[nutrient]!.name : <span className="text-gray-400">Select ไฟล์ ...</span>}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setFiles(prev => ({...prev, [nutrient]: null}))}
                    className="flex-1 sm:flex-none justify-center items-center gap-1 px-5 h-10 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full text-sm font-medium transition-colors flex"
                  >
                    <Ban className="w-4 h-4" />
                    ยกเลิก
                  </button>
                  <label className="flex-1 sm:flex-none justify-center items-center gap-1 px-5 h-10 bg-[#E6EFEA] hover:bg-[#D8E6DD] text-[#1A1A1A] rounded-full text-sm font-medium transition-colors flex cursor-pointer">
                    <Folder className="w-4 h-4" />
                    เลือกรูป
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setFiles(prev => ({...prev, [nutrient]: file}));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Section 2: รหัสตัวอย่าง & เบอร์โทร */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
              <span>รหัสตัวอย่าง</span>
            </div>
            <input 
              type="text" 
              placeholder="กรอกรหัสตัวอย่างดิน" 
              className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
              <span>เบอร์โทร</span>
            </div>
            <input 
              type="tel" 
              placeholder="08x-xxx-xxxx" 
              className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
            />
          </div>
        </div>

        {/* Section 3: สถานที่เก็บตัวอย่าง */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg mb-4">
            <span>สถานที่เก็บตัวอย่าง</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">ตำบล</label>
              <input 
                type="text" 
                placeholder="ระบุตำบล" 
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">อำเภอ</label>
              <input 
                type="text" 
                placeholder="ระบุอำเภอ" 
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">จังหวัด</label>
              <input 
                type="text" 
                placeholder="ระบุจังหวัด" 
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Predict Button */}
        <div className="flex justify-center pt-8 pb-4">
          <button 
            onClick={() => router.push('/analyze/result')}
            className="flex items-center justify-center px-12 h-10 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-medium text-[15px] shadow-sm hover:shadow-md transition-all"
          >
            ทำนายผล
          </button>
        </div>

      </div>

      {/* Terms & Conditions Frame */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-4 mx-4 text-center">
        <button onClick={() => setIsTermsOpen(true)} className="block w-full hover:opacity-80 transition-opacity">
          <div className="text-[#007AFF] font-normal text-sm md:text-base mb-1">
            Terms & Conditions and Privacy Policies
          </div>
          <div className="text-[#007AFF] font-normal text-xs md:text-sm">
            ข้อกำหนดใช้งานเว็บไซต์และนโยบายความเป็นส่วนตัว
          </div>
        </button>
      </div>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

    </div>
  )
}
