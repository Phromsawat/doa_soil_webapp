"use client"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown } from "lucide-react"

export default function UserGuidePage() {
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
            คู่มือการใช้เว็บแอปฯ
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
                <Link href="/doa-kits" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-gray-700">
                  การวิเคราะห์ดินด้วย DOA-Soil Test Kits
                </Link>
                <div className="h-[1px] bg-gray-100 mx-4"></div>
                <Link href="/user-guide" className="block px-5 py-3 text-[15px] hover:bg-gray-50 text-[#1A4D2E] font-bold">
                  คู่มือการใช้เว็บแอปฯ
                </Link>
              </div>
            </>
          )}
        </div>
        <div className="w-10"></div>
      </header>
      
      <div className="w-full bg-white border-b border-gray-200">
        <h2 className="text-[17px] font-bold text-[#1A1A1A] text-center px-4 pt-6 pb-6 leading-relaxed">
          คู่มือการใช้เว็บแอปพลิเคชันเพื่อทำนายผลวิเคราะห์ดินและคำนวณการใช้ปุ๋ย<span className="whitespace-nowrap">ตามค่าวิเคราะห์ดิน</span>
        </h2>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800 space-y-12">
        
        {/* Section 1 */}
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-[#1A1A1A] mb-8 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#1A4D2E] rounded-full"></div>
            การใช้งาน เมนูอัพโหลดรูปภาพ
          </h3>
          
          <div className="space-y-10 text-[15px] leading-relaxed">
            
            {/* Step 1 */}
            <div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">1</div>
                <p className="pt-1 font-medium text-gray-800">นำตัวอย่างดินไปตรวจวิเคราะห์ด้วยสารละลายและแผ่นทดสอบของ DOA-Soil Test Kit</p>
              </div>
              <div className="mt-5 ml-12">
                <img src="/img/img07.png" alt="แผ่นทดสอบ" className="w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px] mx-auto rounded-xl shadow-lg border border-gray-200/60 object-contain bg-white" />
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">2</div>
                <div className="pt-1">
                  <p className="font-medium text-gray-800">นำแผ่นทดสอบวางบนแผ่นพื้นหลังสีขาว แล้วถ่ายภาพแผ่นทดสอบด้วยโทรศัพท์มือถือโดยให้บริเวณแถบสีของแผ่นทดสอบอยู่ตรงกลางของภาพ และให้มีสีใกล้เคียงกับที่สายตาเห็นมากที่สุด</p>
                  <p className="mt-2 text-gray-500 text-[14px]">ควรถ่ายภาพภายในอาคาร หากถ่ายภาพภายนอกอาคารให้หลีกเลี่ยงการเกิดเงาของโทรศัพท์มือถือบนภาพ</p>
                  <div className="mt-3 bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-red-600 text-[14px]">
                      *เมื่อทําการใช้แผ่นทดสอบแล้ว สําหรับชุดทดสอบอินทรียวัตถุ (OM) ควรรีบถ่ายภาพโดยทันที สําหรับชุดทดสอบฟอสฟอรัส (P) และ โพแทสเซียม (K) ให้ถ่ายภาพเมื่อระยะเวลาผ่านไป 1 นาที เพื่อให้สีบนแผ่นทดสอบคลาดเคลื่อนน้อยที่สุด
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 ml-12 space-y-6">
                <img src="/img/img20.png" alt="การถ่ายภาพแผ่นทดสอบ" className="w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px] mx-auto rounded-xl shadow-lg border border-gray-200/60 object-contain bg-white block" />
                <img src="/img/om_sample.jpeg" alt="ตัวอย่างแผ่นทดสอบ" className="w-full max-w-[250px] sm:max-w-[300px] md:max-w-[350px] mx-auto rounded-xl shadow-lg border border-gray-200/60 object-contain bg-white block" />
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">3</div>
                <p className="pt-1 font-medium text-gray-800">อัพโหลดรูปภาพของแผ่นทดสอบในช่องของธาตุอาหารที่ต้องการวิเคราะห์อย่างน้อย 1 ธาตุ และตรวจสอบความถูกต้องของภาพ</p>
              </div>
              <div className="mt-5 ml-12">
                <img src="/img/img21.png" alt="อัพโหลดรูปภาพ" className="w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px] mx-auto rounded-xl shadow-lg border border-gray-200/60 object-contain bg-white" />
              </div>
            </div>

            {/* Step 4 */}
            <div>
              <div className="flex gap-4 items-center">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">4</div>
                <p className="font-medium text-gray-800">กรอกข้อมูลรหัสตัวอย่าง (จำเป็น) และข้อมูลอื่นๆ</p>
              </div>
            </div>

            {/* Step 5 */}
            <div>
              <div className="flex gap-4 items-center">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">5</div>
                <p className="font-medium text-gray-800">กดปุ่ม "ทำนายผล"</p>
              </div>
            </div>

            {/* Step 6 */}
            <div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">6</div>
                <p className="pt-1 font-medium text-gray-800">ดูผลค่าวิเคราะห์ที่ทำนายได้ ซึ่งได้มาจากแบบจำลองที่พัฒนาโดยใช้ AI</p>
              </div>
              <div className="mt-5 ml-12">
                <img src="/img/img23.png" alt="ผลค่าวิเคราะห์" className="w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px] mx-auto rounded-xl shadow-lg border border-gray-200/60 object-contain bg-white" />
              </div>
            </div>

            {/* Step 7 */}
            <div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">7</div>
                <p className="pt-1 font-medium text-gray-800">เลือกประเภทพืช เลือกชนิดพืช และกดดูคำแนะนำการใช้ปุ๋ย ผู้ใช้งานสามารถเลือกประเภทของปุ๋ยได้ตามต้องการ โดยการแปลผลระดับความอุดมสมบูรณ์และการคำนวณคำแนะนำการใช้ปุ๋ยจะเปลี่ยนแปลงไปตามชนิดพืช</p>
              </div>
            </div>

            {/* Step 8 */}
            <div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">8</div>
                <p className="pt-1 font-medium text-gray-800">กดพิมพ์คำแนะนำที่ปุ่ม "พิมพ์" ในส่วนท้ายของปุ๋ยแต่ละสูตร ซึ่งระบบแสดงไฟล์ pdf ให้ผู้ใช้งานดาวน์โหลดหรือสั่งพิมพ์ได้</p>
              </div>
            </div>

            {/* Step 9 */}
            <div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">9</div>
                <p className="pt-1 font-medium text-gray-800">ผู้ใช้งานสามารถเลือกเปลี่ยนชนิดพืชเพื่อดูคำแนะนำการใช้ปุ๋ยสำหรับพืชอื่นๆ ได้</p>
              </div>
            </div>

          </div>
        </section>

        {/* Section 2 */}
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <h3 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#1A4D2E] rounded-full"></div>
              การใช้งาน เมนูกรอกค่าวิเคราะห์ดิน
            </h3>
            <Link 
              href="/analyze/form" 
              className="px-6 py-2.5 bg-[#1A4D2E] text-white rounded-full font-medium text-[15px] shadow-md hover:bg-[#153D24] hover:shadow-lg transition-all active:scale-95 inline-flex items-center justify-center whitespace-nowrap"
            >
              ไปหน้ากรอกค่าวิเคราะห์ดิน
            </Link>
          </div>
          
          <div className="space-y-6 text-[15px] leading-relaxed">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">1</div>
              <p className="pt-1 font-medium text-gray-800">เลือกประเภทพืช และชนิดพืชที่ต้องการจัดทำคำแนะนำการใช้ปุ๋ย โดยสามารถกดกลับไปก่อนหน้าหรือรีเฟรชเพื่อกลับสู่หน้าเริ่มต้นได้</p>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">2</div>
              <p className="pt-1 font-medium text-gray-800">นำค่าวิเคราะห์ดินที่ทราบผลปริมาณธาตุอาหารในดินแล้ว กรอกในแบบฟอร์มอย่างน้อย 1 ธาตุอาหาร</p>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">3</div>
              <p className="pt-1 font-medium text-gray-800">กดปุ่ม "Search" เพื่อประมวลผลข้อมูล</p>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">4</div>
              <p className="pt-1 font-medium text-gray-800">เลือกดูคำแนะนำการใช้ปุ๋ย ตามประเภทปุ๋ยที่ต้องการ</p>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">5</div>
              <p className="pt-1 font-medium text-gray-800">กดพิมพ์คำแนะนำที่ปุ่ม "พิมพ์" ในส่วนท้ายของปุ๋ยแต่ละสูตร ซึ่งระบบแสดงไฟล์ pdf ให้ผู้ใช้งานดาวน์โหลดหรือสั่งพิมพ์ได้</p>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">6</div>
              <p className="pt-1 font-medium text-gray-800">สามารถเลือกพืชชนิดใหม่และกรอกแบบฟอร์มใหม่ได้ ซึ่งการใช้งานในเมนูนี้จะไม่ถูกเก็บอยู่ในประวัติการใช้งานของระบบ</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
