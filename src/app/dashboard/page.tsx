"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getAnalyses } from "@/lib/storage"
import { SoilAnalysis } from "@/types"
import { Card, CardContent } from "@/components/ui/Card"
import { Camera, FileEdit, CheckCircle2, Clock, History, ChevronRight } from "lucide-react"

export default function Dashboard() {
  const [analyses, setAnalyses] = useState<SoilAnalysis[]>([])
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalyses(getAnalyses())
    setIsMounted(true)
  }, [])

  const totalCount = isMounted ? analyses.length : 0
  const completedCount = isMounted ? analyses.filter(a => a.status === "completed").length : 0
  const pendingCount = isMounted ? analyses.filter(a => a.status === "pending").length : 0

  // Format date
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="space-y-6 pb-20 font-thai">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">สวัสดี, สมชาย</h1>
        <p className="text-sm text-text-secondary mt-1">{today}</p>
      </div>

      {/* 2 Large Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/analyze/upload" className="block">
          <Card className="bg-[#E6F4EA] border border-[#A5D6B6] shadow-sm h-full rounded-2xl hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4 justify-center h-full">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                <Camera className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-primary text-sm">อัพโหลดรูปภาพ</h3>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/analyze/form" className="block">
          <Card className="bg-card border border-gray-100 shadow-sm h-full rounded-2xl hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4 justify-center h-full">
              <div className="w-14 h-14 bg-surface rounded-full flex items-center justify-center text-text-secondary shadow-sm">
                <FileEdit className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-text-primary text-sm">กรอกผลด้วยตนเอง</h3>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stat Rows */}
      <div className="space-y-3">
        <Link href="/history" className="flex items-center justify-between bg-card p-4 rounded-2xl shadow-sm border border-gray-50 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <History className="w-5 h-5" />
            </div>
            <span className="font-bold text-text-primary text-sm">การวิเคราะห์ทั้งหมด</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-text-primary">{totalCount}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </Link>

        <Link href="/history?status=pending" className="flex items-center justify-between bg-card p-4 rounded-2xl shadow-sm border border-gray-50 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
              <Clock className="w-5 h-5" />
            </div>
            <span className="font-bold text-text-primary text-sm">รอผล</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-text-primary">{pendingCount}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </Link>

        <Link href="/history?status=completed" className="flex items-center justify-between bg-card p-4 rounded-2xl shadow-sm border border-gray-50 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-primary">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-text-primary text-sm">เสร็จสิ้น</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-text-primary">{completedCount}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </Link>
      </div>

      {/* Recent Activity List */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg text-text-primary">ประวัติล่าสุด</h2>
        
        <div className="space-y-3">
          {!isMounted ? (
            <div className="py-8 text-center text-text-secondary text-sm">
              กำลังโหลดข้อมูล...
            </div>
          ) : analyses.length > 0 ? (
            analyses.slice(0, 3).map((item) => (
              <Link key={item.id} href={item.status === 'completed' ? `/analyze/result?id=${item.id}` : `/analyze/upload`} className="block">
                <Card className="bg-card border-none shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-text-primary text-base">{item.crop}</h4>
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'completed' 
                              ? 'bg-[#E6F4EA] text-primary' 
                              : 'bg-orange-100 text-orange-600'
                          }`}>
                            {item.status === 'completed' ? 'เสร็จสิ้น' : 'รอผล'}
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary mb-3">{item.date}</p>
                        
                        {item.status === 'completed' && (
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-medium"><span className="text-blue-500 font-bold">N:</span> ต่ำ</span>
                            <span className="font-medium"><span className="text-orange-500 font-bold">P:</span> ปานกลาง</span>
                            <span className="font-medium"><span className="text-green-500 font-bold">K:</span> สูง</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 mt-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="py-8 text-center text-text-secondary text-sm bg-card rounded-2xl shadow-sm border border-gray-50">
              ยังไม่มีประวัติการวิเคราะห์
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
