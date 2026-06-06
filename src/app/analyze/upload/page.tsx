"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { UploadCloud, Check } from "lucide-react"

export default function AnalyzeUpload() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [image, setImage] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = () => {
        setImage(reader.result as string)
        // In a real flow, we'd go to the next step, but right now we just rebuild the UI exactly
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6 font-thai pb-20">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 pt-4">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            <Check className="w-4 h-4" />
          </div>
        </div>
        <div className="w-12 h-1 bg-primary rounded-full" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
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

      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <h2 className="text-lg font-bold text-text-primary text-center">การวิเคราะห์หน้าดินด้วย AI</h2>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center space-y-4 relative group hover:border-primary/50 transition-colors bg-[#F9FAFB]">
          <input
            type="file"
            accept="image/jpeg, image/png"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 bg-[#E6F4EA] text-primary rounded-full flex items-center justify-center">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-text-primary text-base">เลือกรูปภาพหรือลากมาวางที่นี่</h3>
            <p className="text-xs text-text-secondary">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 10MB</p>
          </div>
          <Button className="pointer-events-none rounded-full bg-primary hover:bg-primary/90 text-white px-6 font-bold text-sm shadow-sm">
            เลือกไฟล์
          </Button>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-3 pt-4">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="flex-1 rounded-full border-gray-200 text-text-secondary font-bold hover:bg-gray-50 h-12"
        >
          ← ย้อนกลับ
        </Button>
        <Button 
          disabled
          className="flex-1 rounded-full bg-gray-200 text-gray-400 font-bold h-12"
        >
          ถัดไป →
        </Button>
      </div>
    </div>
  )
}
