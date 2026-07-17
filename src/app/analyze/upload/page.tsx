"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import * as Dialog from "@radix-ui/react-dialog"
import { Folder, Ban, Map, Loader2 } from "lucide-react"
import {
  createAnalysis,
  uploadAnalysisImage,
  completeAnalysis,
} from "@/lib/supabase/analyses"
import { ensureSession } from "@/lib/supabase/auth"
import type { NutrientCode } from "@/types/database"

// Leaflet must be client-side only
const MapPicker = dynamic(() => import("@/app/analyze/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#1A4D2E]" />
    </div>
  ),
})

const NUTRIENT_FIELDS: Array<{ label: string; code: NutrientCode }> = [
  { label: "อินทรียวัตถุ", code: "OM" },
  { label: "ฟอสฟอรัส",    code: "P"  },
  { label: "โพแทสเซียม",  code: "K"  },
]

export default function AnalyzeUpload() {
  const router = useRouter()
  const [files, setFiles] = useState<Record<NutrientCode, File | null>>({
    OM: null, P: null, K: null,
  })
  const [sampleCode, setSampleCode] = useState("")
  const [phone, setPhone] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)

  // Legacy: pick up lat/lng if user came back from /analyze/map (the standalone page)
  useEffect(() => {
    const pickedLat = sessionStorage.getItem("picked_lat")
    const pickedLng = sessionStorage.getItem("picked_lng")
    if (pickedLat && pickedLng) {
      setLat(pickedLat)
      setLng(pickedLng)
      sessionStorage.removeItem("picked_lat")
      sessionStorage.removeItem("picked_lng")
    }
  }, [])

  const handleMapConfirm = (pickedLat: number, pickedLng: number) => {
    setLat(String(pickedLat))
    setLng(String(pickedLng))
    setIsMapOpen(false)
  }

  const hasAnyFile = Object.values(files).some(Boolean)

  const handleSubmit = async () => {
    setError(null)

    if (!hasAnyFile) {
      setError("กรุณาอัปโหลดรูปอย่างน้อย 1 รูป")
      return
    }

    setSubmitting(true)
    try {
      // 1. Make sure user has a session (anonymous if not signed in)
      await ensureSession()

      // 2. Create analysis row
      const analysisId = await createAnalysis({
        crop_id: null,
        input_mode: "image_upload",
        status: "pending",
        om_value: null,
        p_value: null,
        k_value: null,
        ph_value: null,
        province: null,
        amphur: null,
        district: postalCode || null,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        notes: sampleCode ? `รหัสตัวอย่าง: ${sampleCode}${phone ? ` · ${phone}` : ""}` : null,
      })

      // 3. Upload each image (skip empty slots)
      for (const { code } of NUTRIENT_FIELDS) {
        const file = files[code]
        if (!file) continue
        const fd = new FormData()
        fd.append("file", file)
        await uploadAnalysisImage(analysisId, code, fd)
      }

      // 4. Mark as completed (later: trigger AI prediction first)
      await completeAnalysis(analysisId)

      // 5. Navigate to result page with the analysis id
      router.push(`/analyze/result?id=${analysisId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="font-thai pb-32">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8 mt-4 mx-4">

        {/* Section 1: สารอาหารในดิน */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg mb-4">
            <span>สารอาหารในดิน</span>
          </div>

          {NUTRIENT_FIELDS.map(({ label, code }) => (
            <div key={code} className="flex flex-col lg:flex-row lg:items-center gap-3 bg-gray-50/50 p-2 rounded-xl">
              <div className="flex items-center gap-2 w-40 shrink-0 px-2">
                <span className="font-semibold text-sm text-gray-700">{label}</span>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-gray-600 text-sm flex items-center overflow-hidden whitespace-nowrap text-ellipsis">
                  {files[code] ? files[code]!.name : <span className="text-gray-400">Select ไฟล์ ...</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiles((prev) => ({ ...prev, [code]: null }))}
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
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0]
                          setFiles((prev) => ({ ...prev, [code]: file }))
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
              value={sampleCode}
              onChange={(e) => setSampleCode(e.target.value)}
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
            />
          </div>
        </div>

        {/* Section 3: สถานที่เก็บตัวอย่าง */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg mb-4">
            <span>สถานที่เก็บตัวอย่าง</span>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">รหัสไปรษณีย์</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="เช่น 10900"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
              className="w-32 bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">ละติจูด (Latitude)</label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 13.756331"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">ลองจิจูด (Longitude)</label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 100.501765"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-sm text-gray-400">หรือ</span>
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              className="flex items-center gap-2 h-9 px-4 bg-[#E6EFEA] hover:bg-[#D8E6DD] text-gray-700 rounded-full text-sm font-medium transition-colors"
            >
              <Map className="w-4 h-4" />
              เลือกพิกัดจากแผนที่
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Predict Button */}
        <div className="flex justify-center pt-8 pb-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || !hasAnyFile}
            className="flex items-center justify-center gap-2 px-12 h-10 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-medium text-[15px] shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังอัปโหลด...
              </>
            ) : (
              "ทำนายผล"
            )}
          </button>
        </div>

      </div>

      {/* Map picker Modal — keeps form state intact (no route change) */}
      <Dialog.Root open={isMapOpen} onOpenChange={setIsMapOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[100] data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-[101] mx-auto max-w-3xl w-[95vw] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <Dialog.Title className="sr-only">เลือกพิกัดจากแผนที่</Dialog.Title>
            <Dialog.Description className="sr-only">
              ปักหมุดบนแผนที่เพื่อเลือกตำแหน่งของตัวอย่างดิน
            </Dialog.Description>
            {isMapOpen && (
              <MapPicker
                onConfirm={handleMapConfirm}
                onCancel={() => setIsMapOpen(false)}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
