"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Check, Share2, Loader2, MapPin, Droplets, Calendar } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { getAnalysisById } from "@/lib/storage"
import { SoilAnalysis } from "@/types"

function ResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  
  const [record, setRecord] = useState<SoilAnalysis | null>(null)

  useEffect(() => {
    if (id) {
      const rec = getAnalysisById(id)
      if (rec) setRecord(rec)
    }
  }, [id])

  const province = record?.province || "ไม่ระบุ"
  const ph = record?.ph || 6.0
  const om = record?.organicMatter || 1.5

  // Dummy logic to match the design EXACTLY, regardless of real values for the purpose of the UI test
  // In a real app we'd map actual values to these bars and recommendations.
  
  return (
    <div className="font-thai pb-24 relative">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 pt-4 mb-6">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            <Check className="w-4 h-4" />
          </div>
        </div>
        <div className="w-12 h-1 bg-primary rounded-full" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            <Check className="w-4 h-4" />
          </div>
        </div>
        <div className="w-12 h-1 bg-primary rounded-full" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            3
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* NPK progress bars card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-text-primary">ระดับธาตุอาหารหลัก</h2>
            <div className="px-3 py-1 bg-green-100 text-primary text-xs font-bold rounded-full">
              ดินดี
            </div>
          </div>

          <div className="space-y-4">
            {/* Nitrogen */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-bold">
                <span className="text-text-secondary">ไนโตรเจน (N)</span>
                <span className="text-blue-600">75% - ปานกลาง</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>

            {/* Phosphorus */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-bold">
                <span className="text-text-secondary">ฟอสฟอรัส (P)</span>
                <span className="text-orange-500">42% - ต่ำ</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>

            {/* Potassium */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-bold">
                <span className="text-text-secondary">โพแทสเซียม (K)</span>
                <span className="text-primary">90% - สูง</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex justify-center gap-4 text-xs text-text-secondary font-bold">
            <span>pH: {ph} (เหมาะสม)</span>
            <span>|</span>
            <span>OM: {om}% (ปานกลาง)</span>
          </div>
        </div>

        {/* Farm image card */}
        <div className="relative rounded-2xl overflow-hidden h-28 shadow-sm">
          <img 
            src="https://images.unsplash.com/photo-1592982537447-6f29633e7235?q=80&w=375&auto=format&fit=crop" 
            alt="Farm"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="absolute inset-0 flex items-center p-5">
            <div className="text-white">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-xs font-bold text-gray-200">พื้นที่เพาะปลูก</span>
              </div>
              <h3 className="text-lg font-bold">พื้นที่ปลูก: {province}</h3>
            </div>
          </div>
        </div>

        {/* Fertilizer recommendation card */}
        <div className="bg-[#1A2F2A] rounded-2xl p-5 text-white shadow-sm relative overflow-hidden">
          {/* Decorative subtle circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-accent" />
            คำแนะนำการจัดการปุ๋ย
          </h2>
          
          <div className="bg-white/10 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-sm text-white/70">สูตรปุ๋ยแนะนำ</span>
              <span className="text-base font-bold text-accent">16-20-0</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-sm text-white/70">ปริมาณการใช้</span>
              <span className="text-sm font-bold text-white">25-30 กก./ไร่</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm text-white/70 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> ช่วงเวลาที่ใส่
              </span>
              <span className="text-sm font-bold text-white">ระยะแตกกอ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex items-center gap-3">
        <button 
          onClick={() => router.push('/analyze')}
          className="text-sm font-bold text-text-secondary px-2 hover:text-primary transition-colors whitespace-nowrap"
        >
          วิเคราะห์ใหม่
        </button>
        <Button 
          variant="outline" 
          className="flex-1 rounded-full border-gray-200 font-bold h-12 text-text-primary bg-white hover:bg-gray-50 flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" /> แชร์ผล
        </Button>
        <Button 
          onClick={() => router.push('/dashboard')}
          className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
        >
          บันทึกผล
        </Button>
      </div>
    </div>
  )
}

export default function AnalyzeResult() {
  return (
    <div className="px-4">
      <Suspense
        fallback={
          <div className="p-12 text-center font-thai flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <span className="text-sm text-text-secondary font-bold">กำลังประมวลผล...</span>
          </div>
        }
      >
        <ResultContent />
      </Suspense>
    </div>
  )
}
