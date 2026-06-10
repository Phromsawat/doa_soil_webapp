"use client"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown } from "lucide-react"

export default function DoaKitsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-thai">
      {/* Header */}
      <header className="bg-white px-4 h-14 flex items-center shadow-sm sticky top-0 z-10 justify-between">
        <Link href="/" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-600 shrink-0 invisible lg:visible">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1 text-[16px] sm:text-[17px] font-bold text-gray-800 focus:outline-none whitespace-nowrap"
          >
            การวิเคราะห์ดินด้วย DOA-Soil Test Kits
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isMenuOpen && (
            <>
              {/* Overlay to close menu when clicking outside */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              ></div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[280px] bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <Link href="/soil-sampling" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-gray-700">
                  วิธีการเก็บตัวอย่างดิน
                </Link>
                <div className="h-[1px] bg-gray-100 mx-4"></div>
                <Link href="/doa-kits" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-[#1A4D2E] font-bold">
                  การวิเคราะห์ดินด้วย DOA-Soil Test Kits
                </Link>
                <div className="h-[1px] bg-gray-100 mx-4"></div>
                <Link href="/user-guide" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-gray-700">
                  คู่มือการใช้เว็บแอปฯ
                </Link>
              </div>
            </>
          )}
        </div>
        <div className="w-10"></div>
      </header>
      
      <div className="p-4 space-y-4 flex flex-col items-center max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden w-full">
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/CA0mXKXvG9A" 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowFullScreen
            ></iframe>
          </div>
          <div className="mt-4">
            <h2 className="font-bold text-[#1A1A1A] text-lg">วิดีโอสาธิตการวิเคราะห์ดินด้วย DOA-Soil Test Kit</h2>
            <p className="text-gray-600 text-[14.5px] mt-2 leading-relaxed">
              รับชมวิดีโอเพื่อศึกษาวิธีการวิเคราะห์ธาตุอาหารดินด้วยชุดตรวจสอบดิน N P K ของกรมวิชาการเกษตรอย่างละเอียดทุกขั้นตอน
            </p>
          </div>
        </div>

        {/* Note section */}
        <div className="bg-[#FFF8E6] rounded-2xl p-5 shadow-sm border border-[#FBE192] w-full">
          <h3 className="font-bold text-[#8A6D3B] text-[15px] mb-2">หมายเหตุ</h3>
          <ul className="text-[#8A6D3B] text-[13.5px] space-y-2 list-disc pl-4 leading-relaxed">
            <li>
              วีดีโอข้างต้นเป็นวิธีการใช้ชุดตรวจสอบ (DOA-Soil Test Kit) <span className="font-semibold text-[#D9534F]">รูปแบบเก่า</span> ปัจจุบันกำลังอยู่ในขั้นตอนการปรับแก้วีดีโอให้เป็นปัจจุบัน กรุณาสอบถามข้อมูลเพิ่มเติมกับหน่วยงานเพื่อตรวจสอบรุ่นของ DOA-Soil Test Kit ที่ท่านใช้งานอยู่
            </li>
            <li>
              แบบจำลอง AI ที่ใช้ในเว็บแอพพลิเคชันนี้ รองรับชุดตรวจสอบเฉพาะรูปแบบล่าสุดเท่านั้น
            </li>
          </ul>
          <p className="text-[#8A6D3B]/70 text-[12px] mt-4">แก้ไขข้อมูลเมื่อวันที่ : 20 มกราคม 2567</p>
        </div>

        {/* Contact section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 w-full">
          <h3 className="font-bold text-[#1A4D2E] text-[15px] mb-3">สอบถามข้อมูลเพิ่มเติม</h3>
          <div className="text-gray-600 text-[14px] space-y-2 leading-relaxed">
            <p className="font-medium text-gray-800">กลุ่มวิจัยเกษตรเคมี กองวิจัยพัฒนาปัจจัยการผลิตทางการเกษตร กรมวิชาการเกษตร</p>
            <p>50 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กทม. 10900</p>
            <p>โทร. <a href="tel:025798600" className="text-[#1A4D2E] hover:underline font-medium">025798600</a> ต่อ 700</p>
            <p>Email : <a href="mailto:soilandwatergroup@doa.in.th" className="text-[#1A4D2E] hover:underline font-medium">soilandwatergroup@doa.in.th</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}
