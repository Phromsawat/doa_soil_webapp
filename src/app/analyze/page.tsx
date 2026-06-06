import Link from "next/link"
import { Camera, Keyboard, ChevronRight, Info } from "lucide-react"

export default function MethodSelectionPage() {
  return (
    <div className="space-y-8 font-thai pb-20">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 pt-4">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            1
          </div>
        </div>
        <div className="w-12 h-1 bg-gray-200 rounded-full" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold text-sm">
            2
          </div>
        </div>
        <div className="w-12 h-1 bg-gray-200 rounded-full" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold text-sm">
            3
          </div>
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold text-text-primary">เลือกวิธีการบันทึกข้อมูล</h1>
      </div>

      <div className="space-y-4">
        {/* Method 1: Upload Photo */}
        <Link href="/analyze/upload" className="block">
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#E6F4EA] text-primary flex items-center justify-center shrink-0">
                <Camera className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-text-primary">อัพโหลดรูปภาพ</h3>
                <p className="text-sm text-text-secondary mt-0.5">วิเคราะห์สีด้วย AI</p>
              </div>
              <div className="flex items-center text-primary text-sm font-bold">
                เริ่มต้นใช้งาน <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        </Link>

        {/* Method 2: Manual Input */}
        <Link href="/analyze/form" className="block">
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Keyboard className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-text-primary">กรอกด้วยตนเอง</h3>
                <p className="text-sm text-text-secondary mt-0.5">ระบุค่าสีเทียบชาร์ต</p>
              </div>
              <div className="flex items-center text-blue-600 text-sm font-bold">
                ระบุข้อมูล <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Info Box */}
      <div className="bg-[#E6F4EA] rounded-xl p-4 flex gap-3 items-start border border-[#A5D6B6]/50">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-text-primary leading-relaxed">
          <span className="font-bold">แนะนำ:</span> การวิเคราะห์ด้วยรูปภาพจะให้ผลที่แม่นยำกว่า เพราะใช้ AI ช่วยเทียบสีมาตรฐาน
        </p>
      </div>
    </div>
  )
}
