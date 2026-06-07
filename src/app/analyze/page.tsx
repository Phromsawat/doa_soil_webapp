import Link from "next/link"
import { Camera, Keyboard, ArrowRight, PenLine, Map, MapPin } from "lucide-react"
import { Button } from "@/components/ui/Button"

export default function MethodSelectionPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-thai pb-24">
      {/* Header */}
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">เลือกวิธีบันทึกข้อมูล</h1>
        <p className="text-gray-500 text-sm md:text-base mt-1">บันทึกข้อมูลเพื่อทำการวิเคราะห์คุณภาพดินของท่าน</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 mb-6">
        
        {/* Card 1: Upload */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="h-56 bg-[#F8F9FA] relative flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>
          <div className="p-4 md:p-8 flex flex-col flex-1">
            <div className="flex flex-col items-center justify-center text-center gap-2 mb-4">
              <Camera strokeWidth={1.5} className="w-7 h-7 md:w-8 md:h-8 text-[#1A1A1A] shrink-0 mb-1" />
              <div>
                <h3 className="font-bold text-[14px] md:text-lg text-[#1A1A1A]">ประมวลผลอัตโนมัติ</h3>
                <p className="text-[12px] md:text-sm text-gray-500 font-medium">เทียบเคียงสีจากภาพถ่าย</p>
              </div>
            </div>
            <p className="text-[13px] md:text-[15px] text-gray-600 mb-6 flex-1 leading-relaxed hidden sm:block text-center">
              ถ่ายรูปแผ่นทดสอบดินของท่าน เพื่อให้ระบบประมวลผลและเทียบเคียงสีกับค่ามาตรฐานโดยอัตโนมัติ
            </p>
            <Link href="/analyze/upload" className="w-full mt-auto">
              <Button className="w-full bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-medium text-[15px] h-10 flex items-center justify-center gap-1 md:gap-2 shadow-sm hover:shadow-md transition-all">
                อัปโหลดรูปภาพ
              </Button>
            </Link>
          </div>
        </div>

        {/* Card 2: Manual */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="h-56 bg-[#F5F5F0] relative flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(#e5e5e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>
          <div className="p-4 md:p-8 flex flex-col flex-1">
            <div className="flex flex-col items-center justify-center text-center gap-2 mb-4">
              <PenLine strokeWidth={1.5} className="w-7 h-7 md:w-8 md:h-8 text-[#1A1A1A] shrink-0 mb-1" />
              <div>
                <h3 className="font-bold text-[14px] md:text-lg text-[#1A1A1A] leading-tight">กรอกข้อมูลด้วยตนเอง</h3>
                <p className="text-[12px] md:text-sm text-gray-500 font-medium">ระบุค่าเทียบชาร์ต</p>
              </div>
            </div>
            <p className="text-[13px] md:text-[15px] text-gray-600 mb-6 flex-1 leading-relaxed hidden sm:block text-center">
              หากท่านมีผลวิเคราะห์จากห้องปฏิบัติการหรือต้องการระบุค่าสีดินเทียบกับชาร์ตสีมาตรฐานด้วยตนเอง เลือกวิธีนี้เพื่อความแม่นยำทางสถิติ
            </p>
            <Link href="/analyze/form" className="w-full mt-auto">
              <Button className="w-full bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-medium text-[15px] h-10 flex items-center justify-center gap-1 md:gap-2 shadow-sm hover:shadow-md transition-all">
                ระบุข้อมูล
              </Button>
            </Link>
          </div>
        </div>

      </div>


      
    </div>
  )
}
