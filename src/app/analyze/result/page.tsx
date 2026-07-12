"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Share2, Loader2, MapPin, Calendar, Tractor, Apple, Wheat, Trees, TreePine, Carrot, Leaf, Sprout, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { getAnalysisById } from "@/lib/storage"
import { SoilAnalysis } from "@/types"

const MapPreview = dynamic(() => import("./MapPreview"), { ssr: false })

const plantTypes = [
  { id: 'พืชไร่',      title: 'พืชไร่',      desc: 'ไม้ประเภทไม้ล้มลุกและไม้ทนแล้ง',     icon: Tractor,  hasSub: true  },
  { id: 'ไม้ผล',      title: 'ไม้ผล',      desc: 'ต้นไม้ที่ออกลูกออกผลให้เรารับประทาน', icon: Apple,    hasSub: false },
  { id: 'ข้าว',       title: 'ข้าว',       desc: 'Rice',                                  icon: Wheat,    hasSub: false },
  { id: 'ปาล์มน้ำมัน', title: 'ปาล์มน้ำมัน', desc: 'Oil palm',                          icon: Trees,    hasSub: false },
  { id: 'ยางพารา',    title: 'ยางพารา',    desc: 'Rubber',                                icon: TreePine, hasSub: false },
  { id: 'พืชผัก',     title: 'พืชผัก',     desc: 'Vegetable',                             icon: Carrot,   hasSub: false },
]

const fieldCrops = [
  { id: 'ข้าวโพด',      title: 'ข้าวโพด',      desc: 'Corn',        icon: Wheat,    hasSub: true  },
  { id: 'อ้อย',         title: 'อ้อย',         desc: 'Sugar cane',  icon: Leaf,     hasSub: true  },
  { id: 'มันสำปะหลัง', title: 'มันสำปะหลัง', desc: 'Cassava',     icon: Sprout,   hasSub: false },
  { id: 'ถั่ว',         title: 'ถั่ว',         desc: 'Beans',       icon: Lightbulb, hasSub: false },
]

const cornTypes = [
  { id: 'ข้าวโพดเลี้ยงสัตว์', title: 'ข้าวโพดเลี้ยงสัตว์', desc: 'Field corn',    icon: Wheat },
  { id: 'ข้าวโพดฝักสด',       title: 'ข้าวโพดฝักสด',       desc: 'Specialty corn', icon: Wheat },
]

const sugarCaneTypes = [
  { id: 'อ้อยปลูก', title: 'อ้อยปลูก', desc: 'Plant cane',  icon: Leaf },
  { id: 'อ้อยตอ',   title: 'อ้อยตอ',   desc: 'Ratoon cane', icon: Leaf },
]

function ResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  
  const [record, setRecord] = useState<SoilAnalysis | null>(null)
  const [omImage, setOmImage] = useState<string | null>(null)
  const [pImage, setPImage] = useState<string | null>(null)
  const [kImage, setKImage] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedCrop, setSelectedCrop] = useState<string>("")
  const [selectedSubCrop, setSelectedSubCrop] = useState<string>("")
  const [selectedCropType, setSelectedCropType] = useState<string>("")

  useEffect(() => {
    if (id) {
      const rec = getAnalysisById(id)
      if (rec) setRecord(rec)
    }
    setOmImage(sessionStorage.getItem("predict_img_om"))
    setPImage(sessionStorage.getItem("predict_img_p"))
    setKImage(sessionStorage.getItem("predict_img_k"))
    const lat = sessionStorage.getItem("predict_lat")
    const lng = sessionStorage.getItem("predict_lng")
    if (lat && lng) setCoords({ lat: parseFloat(lat), lng: parseFloat(lng) })
    const savedCrop = sessionStorage.getItem("predict_crop")
    if (savedCrop) setSelectedCrop(savedCrop)
    const savedSubCrop = sessionStorage.getItem("predict_subcrop")
    if (savedSubCrop) setSelectedSubCrop(savedSubCrop)
    const savedCropType = sessionStorage.getItem("predict_croptype")
    if (savedCropType) setSelectedCropType(savedCropType)
  }, [id])

  const province = record?.province || "ไม่ระบุ"
  const ph = record?.ph || 6.0
  const om = record?.organicMatter || 1.5

  function levelColor(level: "low" | "medium" | "high") {
    if (level === "low")    return { text: "text-text-secondary", bar: "bg-[#ffa3a3]" }
    if (level === "medium") return { text: "text-text-secondary", bar: "bg-[#ffd188]" }
    return                         { text: "text-text-secondary", bar: "bg-[#85c98a]" }
  }
  const nLevel = levelColor("medium")
  const pLevel = levelColor("low")
  const kLevel = levelColor("high")

  const rawTime = record?.date || sessionStorage.getItem("predict_time") || ""
  const predictionDate = rawTime
    ? new Date(rawTime).toLocaleString("th-TH", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "-"

  return (
    <div className="font-thai pb-24 relative pt-6">

      <div className="space-y-4">
        {/* NPK cards */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-text-primary">ระดับธาตุอาหารหลัก</h2>
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            <Calendar className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-normal text-text-secondary">ทำนายผลเมื่อ {predictionDate}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Nitrogen card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-white h-24 relative overflow-hidden">
                {omImage && (
                  <img src={omImage} alt="OM color chart" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-2 sm:p-3 text-center">
                <span className="text-sm sm:text-base font-medium text-text-secondary">อินทรียวัตถุ</span>
                <div className={`text-sm sm:text-base font-semibold mb-1.5 ${nLevel.text}`}>75%</div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${nLevel.bar} rounded-full`} style={{ width: '75%' }} />
                </div>
                <p className={`text-sm sm:text-base font-medium mt-1.5 text-center ${nLevel.text}`}>ปานกลาง</p>
              </div>
            </div>

            {/* Phosphorus card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-white h-24 relative overflow-hidden">
                {pImage && (
                  <img src={pImage} alt="P color chart" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-2 sm:p-3 text-center">
                <span className="text-sm sm:text-base font-medium text-text-secondary">ฟอสฟอรัส</span>
                <div className={`text-sm sm:text-base font-semibold mb-1.5 ${pLevel.text}`}>42 มก./กก.</div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${pLevel.bar} rounded-full`} style={{ width: '42%' }} />
                </div>
                <p className={`text-sm sm:text-base font-medium mt-1.5 text-center ${pLevel.text}`}>ต่ำ</p>
              </div>
            </div>

            {/* Potassium card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-white h-24 relative overflow-hidden">
                {kImage && (
                  <img src={kImage} alt="K color chart" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-2 sm:p-3 text-center">
                <span className="text-sm sm:text-base font-medium text-text-secondary">โพแทสเซียม</span>
                <div className={`text-sm sm:text-base font-semibold mb-1.5 ${kLevel.text}`}>90 มก./กก.</div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${kLevel.bar} rounded-full`} style={{ width: '90%' }} />
                </div>
                <p className={`text-sm sm:text-base font-medium mt-1.5 text-center ${kLevel.text}`}>สูง</p>
              </div>
            </div>
          </div>

        </div>

        {/* Farm location card */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative h-48">
          {coords ? (
            <>
              <MapPreview lat={coords.lat} lng={coords.lng} />
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm px-3 py-1.5 flex items-center gap-1.5 z-[1000]">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs text-gray-600">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <span className="text-sm font-normal text-gray-500">พื้นที่เพาะปลูก</span>
                <h3 className="text-lg font-semibold mt-1 text-gray-800">พื้นที่ปลูก: {province}</h3>
              </div>
            </div>
          )}
        </div>

        {/* Crop selection card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-lg font-semibold text-text-primary mb-3">เลือกชนิดพืช</p>
          {/* Level 1 — ชนิดพืชหลัก */}
          <div className="grid grid-cols-1 gap-2">
            {plantTypes.map((plant) => {
              const isSelected = selectedCrop === plant.id
              const Icon = plant.icon
              return (
                <button
                  key={plant.id}
                  onClick={() => {
                    setSelectedCrop(plant.id)
                    setSelectedSubCrop("")
                    setSelectedCropType("")
                    sessionStorage.setItem("predict_crop", plant.id)
                    sessionStorage.removeItem("predict_subcrop")
                    sessionStorage.removeItem("predict_croptype")
                  }}
                  className={`flex items-center px-4 h-14 border rounded-full transition-all text-left ${
                    isSelected ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 shrink-0 ${isSelected ? 'border-primary' : 'border-gray-400'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <Icon className={`w-5 h-5 mr-3 shrink-0 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold leading-tight ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{plant.title}</span>
                    <span className="text-xs text-gray-400 mt-0.5">{plant.desc}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Level 2 — ประเภทพืชไร่ */}
          {selectedCrop === 'พืชไร่' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-text-primary mb-3">เลือกประเภทพืชไร่</p>
              <div className="grid grid-cols-1 gap-2">
                {fieldCrops.map((plant) => {
                  const isSelected = selectedSubCrop === plant.id
                  const Icon = plant.icon
                  return (
                    <button
                      key={plant.id}
                      onClick={() => {
                        setSelectedSubCrop(plant.id)
                        setSelectedCropType("")
                        sessionStorage.setItem("predict_subcrop", plant.id)
                        sessionStorage.removeItem("predict_croptype")
                      }}
                      className={`flex items-center px-4 h-14 border rounded-full transition-all text-left ${
                        isSelected ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 shrink-0 ${isSelected ? 'border-primary' : 'border-gray-400'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <Icon className={`w-5 h-5 mr-3 shrink-0 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold leading-tight ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{plant.title}</span>
                        <span className="text-xs text-gray-400 mt-0.5">{plant.desc}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Level 3 — ประเภทข้าวโพด */}
          {selectedCrop === 'พืชไร่' && selectedSubCrop === 'ข้าวโพด' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-text-primary mb-3">เลือกประเภทข้าวโพด</p>
              <div className="grid grid-cols-1 gap-2">
                {cornTypes.map((plant) => {
                  const isSelected = selectedCropType === plant.id
                  const Icon = plant.icon
                  return (
                    <button
                      key={plant.id}
                      onClick={() => { setSelectedCropType(plant.id); sessionStorage.setItem("predict_croptype", plant.id) }}
                      className={`flex items-center px-4 h-14 border rounded-full transition-all text-left ${
                        isSelected ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 shrink-0 ${isSelected ? 'border-primary' : 'border-gray-400'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <Icon className={`w-5 h-5 mr-3 shrink-0 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold leading-tight ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{plant.title}</span>
                        <span className="text-xs text-gray-400 mt-0.5">{plant.desc}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Level 3 — ประเภทอ้อย */}
          {selectedCrop === 'พืชไร่' && selectedSubCrop === 'อ้อย' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-text-primary mb-3">เลือกประเภทอ้อย</p>
              <div className="grid grid-cols-1 gap-2">
                {sugarCaneTypes.map((plant) => {
                  const isSelected = selectedCropType === plant.id
                  const Icon = plant.icon
                  return (
                    <button
                      key={plant.id}
                      onClick={() => { setSelectedCropType(plant.id); sessionStorage.setItem("predict_croptype", plant.id) }}
                      className={`flex items-center px-4 h-14 border rounded-full transition-all text-left ${
                        isSelected ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 shrink-0 ${isSelected ? 'border-primary' : 'border-gray-400'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <Icon className={`w-5 h-5 mr-3 shrink-0 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold leading-tight ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{plant.title}</span>
                        <span className="text-xs text-gray-400 mt-0.5">{plant.desc}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
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
