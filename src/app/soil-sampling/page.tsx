"use client"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown } from "lucide-react"

export default function SoilSamplingPage() {
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
            className="flex items-center gap-1 text-[17px] font-bold text-gray-800 focus:outline-none whitespace-nowrap"
          >
            วิธีการเก็บตัวอย่างดิน
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
                <Link href="/soil-sampling" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-[#1A4D2E] font-bold">
                  วิธีการเก็บตัวอย่างดิน
                </Link>
                <div className="h-[1px] bg-gray-100 mx-4"></div>
                <Link href="/doa-kits" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-gray-700">
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
      
      {/* Banner Image and Title (Full Width) */}
      <div className="w-full bg-white border-b border-gray-200">
        <h2 className="text-[17px] font-bold text-[#1A1A1A] text-center px-4 pt-6 pb-4 leading-relaxed">
          การเก็บตัวอย่างดินเพื่อส่งวิเคราะห์และใช้กับ<br/>ชุดตรวจสอบดิน
        </h2>
        <img 
          src="/img/soil_sample.jpeg" 
          alt="การเก็บตัวอย่างดิน" 
          className="w-full h-auto"
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">

         <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 border border-gray-100">
           <h2 className="font-bold text-[#1A4D2E] text-lg">1. การเตรียมอุปกรณ์</h2>
           <p className="text-gray-600 text-sm leading-relaxed">
             เตรียมเสียม จอบ หรืออุปกรณ์ขุดดิน และถังพลาสติกที่สะอาดสำหรับผสมดิน
           </p>
         </div>
         <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 border border-gray-100">
           <h2 className="font-bold text-[#1A4D2E] text-lg">2. การเลือกจุดเก็บตัวอย่าง</h2>
           <p className="text-gray-600 text-sm leading-relaxed">
             เลือกจุดเก็บตัวอย่างให้กระจายทั่วแปลง ประมาณ 15-20 จุด ต่อพื้นที่ 10-20 ไร่ หลีกเลี่ยงบริเวณที่เคยเป็นกองปุ๋ย หรือใกล้จอมปลวก
           </p>
         </div>
         <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 border border-gray-100">
           <h2 className="font-bold text-[#1A4D2E] text-lg">3. วิธีการขุด</h2>
           <p className="text-gray-600 text-sm leading-relaxed">
             ขุดหลุมรูปตัววี (V) ลึกประมาณ 15 เซนติเมตร (สำหรับพืชไร่/ข้าว) หรือ 30 เซนติเมตร (สำหรับไม้ผล) แล้วแซะดินด้านข้างหลุมหนาประมาณ 2-3 เซนติเมตร จากปากหลุมถึงก้นหลุม
           </p>
         </div>
         <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 border border-gray-100">
           <h2 className="font-bold text-[#1A4D2E] text-lg">4. การคลุกเคล้าตัวอย่างดิน</h2>
           <p className="text-gray-600 text-sm leading-relaxed">
             นำดินจากทุกจุดมารวมกันในถังพลาสติก คลุกเคล้าให้เข้ากัน เอาเศษหญ้าและกรวดทิ้งไป แล้วแบ่งดินมาประมาณครึ่งกิโลกรัม (500 กรัม) ใส่ถุงพลาสติกเพื่อนำไปวิเคราะห์
           </p>
         </div>

         {/* Next Steps Information */}
         <div className="bg-[#EAF5ED]/50 rounded-2xl p-5 shadow-sm space-y-4 border border-[#1A4D2E]/20">
           <p className="text-gray-800 text-[14.5px] leading-relaxed font-medium">
             เมื่อเก็บตัวอย่างดินตามคำแนะนำแล้ว สามารถนำตัวอย่างดินไปส่งวิเคราะห์ หรือนำไปทดสอบธาตุอาหารในดินด้วย DOA-Soil Test Kit ได้
           </p>
           
           <div className="space-y-1.5">
             <h3 className="font-bold text-[#1A4D2E] text-[15px]">กรณีทำการทดสอบด้วย DOA-Soil Test Kit</h3>
             <p className="text-gray-700 text-[14px] leading-relaxed">
               สามารถถ่ายภาพแผ่นทดสอบของแต่ละธาตุเพื่อนำมาวิเคราะห์ธาตุอาหารและจัดทำคำแนะนำการใช้ปุ๋ยอัตโนมัติได้ที่เมนู <span className="font-bold">"อัพโหลดรูปภาพ"</span>
             </p>
           </div>
           
           <div className="space-y-1.5">
             <h3 className="font-bold text-[#1A4D2E] text-[15px]">กรณีส่งตัวอย่างไปวิเคราะห์ที่ส่วนกลางหรือส่วนภูมิภาค</h3>
             <p className="text-gray-700 text-[14px] leading-relaxed">
               ให้นำค่าวิเคราะห์ที่ได้มาไปจัดทำคำแนะนำการใช้ปุ๋ยอัตโนมัติได้ที่เมนู <span className="font-bold">"กรอกผลวิเคราะห์ดิน"</span>
             </p>
           </div>
         </div>
      </div>
    </div>
  )
}
