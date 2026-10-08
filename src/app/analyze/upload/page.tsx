"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import * as Dialog from "@radix-ui/react-dialog"
import { Folder, Ban, Map, Loader2, CheckCircle2, Calculator, RotateCcw } from "lucide-react"
import { createAnalysis, removeAnalysisImage } from "@/lib/supabase/analyses"
import { predictAnalysis, type PredictResult } from "@/lib/supabase/prediction"
import { checkPhoto, uploadSoilPhoto } from "@/lib/image/soilPhoto"
import { ensureSession } from "@/lib/supabase/auth"
import type { NutrientCode } from "@/types/database"
import type { PickedArea } from "@/app/analyze/map/MapPicker"

// Leaflet must be client-side only
const MapPicker = dynamic(() => import("@/app/analyze/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#1A4D2E]" />
    </div>
  ),
})

const NUTRIENT_FIELDS: Array<{ label: string; code: NutrientCode; unit: string; key: "om_value" | "p_value" | "k_value" }> = [
  { label: "อินทรียวัตถุ", code: "OM", unit: "%",     key: "om_value" },
  { label: "ฟอสฟอรัส",    code: "P",  unit: "mg/kg", key: "p_value"  },
  { label: "โพแทสเซียม",  code: "K",  unit: "mg/kg", key: "k_value"  },
]
const labelOf = (code: NutrientCode) => NUTRIENT_FIELDS.find((f) => f.code === code)?.label ?? code

type Prediction = Extract<PredictResult, { ok: true }>

/** ตัวเลือกตำบลจากรหัสไปรษณีย์ — เก็บชื่อพื้นที่แยกส่วนไว้บันทึกลง DB ด้วย */
type ZipOption = {
  label: string
  lat: string
  lng: string
  province: string | null   // จังหวัด
  amphur: string | null     // อำเภอ
  district: string | null   // ตำบล
}

/** entry ตำบลจาก search-index → ตัวเลือกพร้อมพิกัดกึ่งกลาง */
function toZipOption(e: {
  nth: string
  dth?: string
  pth?: string
  b: [number, number, number, number]
}): ZipOption {
  const [minLng, minLat, maxLng, maxLat] = e.b
  return {
    label: [e.nth, e.dth && `อ.${e.dth}`, e.pth && `จ.${e.pth}`].filter(Boolean).join(" "),
    lat: ((minLat + maxLat) / 2).toFixed(6),
    lng: ((minLng + maxLng) / 2).toFixed(6),
    province: e.pth ?? null,
    amphur: e.dth ?? null,
    district: e.nth ?? null,
  }
}

export default function AnalyzeUpload() {
  const [files, setFiles] = useState<Record<NutrientCode, File | null>>({
    OM: null, P: null, K: null,
  })
  const [sampleCode, setSampleCode] = useState("")
  const [phone, setPhone] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  // uploading = ส่งรูปขึ้นที่เก็บ, predicting = รอแบบจำลองทำนาย
  const [phase, setPhase] = useState<"idle" | "uploading" | "predicting">("idle")
  const submitting = phase !== "idle"
  const [error, setError] = useState<string | null>(null)
  // รายการที่สร้างแล้ว — กดทำนายซ้ำ (หลังเปลี่ยนรูปที่ไม่ผ่านการตรวจ) ใช้รายการเดิม ไม่สร้างใหม่
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  // รูปที่อัปโหลดขึ้นรายการแล้ว — รอบถัดไปอัปโหลดเฉพาะรูปที่เปลี่ยน
  const uploadedRef = useRef<Partial<Record<NutrientCode, File>>>({})
  // รูปที่แบบจำลองไม่รับ (ไม่เห็น strip ชัด ฯลฯ) → ข้อความจากระบบ
  const [rejected, setRejected] = useState<Partial<Record<NutrientCode, string>>>({})
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const locked = submitting || !!prediction
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [zipHint, setZipHint] = useState<string | null>(null)
  const [zipError, setZipError] = useState<string | null>(null)
  const [zipLoading, setZipLoading] = useState(false)
  const [zipOptions, setZipOptions] = useState<ZipOption[]>([])
  // ชื่อพื้นที่ที่ได้จากรหัสไปรษณีย์/หมุดแผนที่ — บันทึกลง record เพื่อให้หน้าผลแสดง "พื้นที่เพาะปลูก"
  const [area, setArea] = useState<Pick<ZipOption, "province" | "amphur" | "district"> | null>(null)
  const zipDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // รหัสไปรษณีย์ที่ได้จากการปักหมุด — กัน effect ค้นซ้ำแล้วล้างพื้นที่ที่ได้มาแล้ว
  const mapZipRef = useRef<string | null>(null)
  const searchIndexRef = useRef<Array<{ t: string; nth: string; pth?: string; dth?: string; b: [number,number,number,number]; zip?: string }> | null>(null)

  async function ensureSearchIndex() {
    if (searchIndexRef.current) return searchIndexRef.current
    const res = await fetch("/boundaries/search-index.json")
    searchIndexRef.current = await res.json()
    return searchIndexRef.current!
  }

  // ZIP → ค้นตำบลจาก search-index (ข้อมูลของเราเอง ไม่เรียกบริการภายนอก)
  useEffect(() => {
    if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current)

    // รหัสที่มาจากการปักหมุด — ได้พื้นที่ครบแล้ว ไม่ต้องค้นซ้ำ
    if (postalCode && postalCode === mapZipRef.current) return

    setZipHint(null)
    setZipError(null)
    setZipOptions([])
    setArea(null)

    if (!/^\d{5}$/.test(postalCode)) return

    zipDebounceRef.current = setTimeout(async () => {
      setZipLoading(true)
      try {
        const idx = await ensureSearchIndex()
        const subs = idx.filter(e => e.t === "sub" && e.zip === postalCode)
        if (subs.length === 0) {
          setZipError("ไม่พบรหัสไปรษณีย์ — เลือกพิกัดจากแผนที่ได้")
          return
        }

        const options = subs.map(toZipOption)
        if (options.length === 1) {
          const o = options[0]
          setLat(o.lat); setLng(o.lng); setZipHint(o.label)
          setArea({ province: o.province, amphur: o.amphur, district: o.district })
        } else {
          setZipOptions(options)
        }
      } catch {
        setZipError("ไม่สามารถค้นหารหัสไปรษณีย์ได้")
      } finally {
        setZipLoading(false)
      }
    }, 400)
  }, [postalCode])

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

  const handleMapConfirm = (pickedLat: number, pickedLng: number, pickedArea?: PickedArea) => {
    setLat(String(pickedLat))
    setLng(String(pickedLng))
    if (pickedArea) {
      setArea({
        province: pickedArea.province,
        amphur: pickedArea.amphur,
        district: pickedArea.district,
      })
      setZipHint(
        [pickedArea.district, pickedArea.amphur && `อ.${pickedArea.amphur}`, pickedArea.province && `จ.${pickedArea.province}`]
          .filter(Boolean).join(" ") || null
      )
      setZipError(null)
      setZipOptions([])
      if (pickedArea.zip) {
        // จำไว้ว่ารหัสนี้มาจากหมุด — effect จะได้ไม่ล้างพื้นที่ที่เพิ่งได้มา
        mapZipRef.current = pickedArea.zip
        setPostalCode(pickedArea.zip)
      }
    }
    setIsMapOpen(false)
  }

  const hasAnyFile = Object.values(files).some(Boolean)

  const pickFile = (code: NutrientCode, file: File | null) => {
    // รูปที่ใช้ไม่ได้ (ชนิดไฟล์ / เกิน 12 MB) — เตือนทันที ไม่รับเข้าช่อง
    const problem = file && checkPhoto(file)
    if (problem) {
      setRejected((prev) => ({ ...prev, [code]: problem }))
      return
    }
    setFiles((prev) => ({ ...prev, [code]: file }))
    setRejected((prev) => {
      const next = { ...prev }
      delete next[code]
      return next
    })
  }

  const handleSubmit = async () => {
    setError(null)

    if (!hasAnyFile) {
      setError("กรุณาอัปโหลดรูปอย่างน้อย 1 รูป")
      return
    }

    setPhase("uploading")
    try {
      // 1. Make sure user has a session (anonymous if not signed in)
      await ensureSession()

      // 2. Create analysis row (ครั้งแรกเท่านั้น)
      let id = analysisId
      if (!id) {
        id = await createAnalysis({
          crop_id: null,
          input_mode: "image_upload",
          status: "pending",
          om_value: null,
          p_value: null,
          k_value: null,
          ph_value: null,
          province: area?.province ?? null,
          amphur: area?.amphur ?? null,
          district: area?.district ?? null,
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
          notes: sampleCode ? `รหัสตัวอย่าง: ${sampleCode}${phone ? ` · ${phone}` : ""}` : null,
        })
        setAnalysisId(id)
      }

      // 3. อัปโหลดรูปที่ใหม่/เปลี่ยน (ต้นฉบับ + สำเนาย่อ ตรงเข้า Storage) และเอารูปที่ผู้ใช้กดยกเลิกออก
      for (const { code } of NUTRIENT_FIELDS) {
        const file = files[code]
        const sent = uploadedRef.current[code]
        if (file && file !== sent) {
          await uploadSoilPhoto(id, code, file)
          uploadedRef.current[code] = file
        } else if (!file && sent) {
          await removeAnalysisImage(id, code)
          delete uploadedRef.current[code]
        }
      }

      // 4. ให้แบบจำลองทำนายค่า — บันทึกค่าและเปลี่ยนสถานะเป็น completed ฝั่ง server เมื่อสำเร็จ
      setPhase("predicting")
      const codes = NUTRIENT_FIELDS.map((f) => f.code).filter((c) => files[c])
      const r = await predictAnalysis(id, codes)
      if (r.ok) {
        setPrediction(r)
        setRejected({})
      } else if (r.kind === "rejected" && r.element) {
        setRejected({ [r.element]: r.message })
        setError(`รูป${labelOf(r.element)}ไม่ผ่านการตรวจ — เปลี่ยนรูปแล้วกด "ทำนายผล" อีกครั้ง`)
      } else {
        setError(r.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPhase("idle")
    }
  }

  // เริ่มตัวอย่างใหม่ — คงพื้นที่/เบอร์โทรไว้ (มักเป็นแปลงเดียวกัน)
  const resetForNext = () => {
    setFiles({ OM: null, P: null, K: null })
    setSampleCode("")
    setAnalysisId(null)
    uploadedRef.current = {}
    setRejected({})
    setPrediction(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="font-thai pb-32">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8 mt-4 mx-4">

        {/* Section 1: สารอาหารในดิน */}
        <div className="space-y-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg">
              <span>สารอาหารในดิน</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">รูปแผ่นทดสอบ JPG, PNG หรือ WebP ไม่เกิน 12 MB ต่อรูป</p>
          </div>

          {NUTRIENT_FIELDS.map(({ label, code }) => (
            <div
              key={code}
              className={`space-y-1.5 rounded-xl p-2 ${rejected[code] ? "bg-red-50/70 ring-1 ring-red-200" : "bg-gray-50/50"}`}
            >
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-2 w-40 shrink-0 px-2">
                <span className="font-semibold text-sm text-gray-700">{label}</span>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-gray-600 text-sm flex items-center overflow-hidden whitespace-nowrap text-ellipsis">
                  {files[code] ? files[code]!.name : <span className="text-gray-400">Select ไฟล์ ...</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => pickFile(code, null)}
                    disabled={locked}
                    className="flex-1 sm:flex-none justify-center items-center gap-1 px-5 h-10 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full text-sm font-medium transition-colors flex disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Ban className="w-4 h-4" />
                    ยกเลิก
                  </button>
                  <label
                    className={`flex-1 sm:flex-none justify-center items-center gap-1 px-5 h-10 bg-[#E6EFEA] hover:bg-[#D8E6DD] text-[#1A1A1A] rounded-full text-sm font-medium transition-colors flex cursor-pointer ${
                      locked ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    <Folder className="w-4 h-4" />
                    {rejected[code] ? "เปลี่ยนรูป" : "เลือกรูป"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={locked}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) pickFile(code, e.target.files[0])
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            {rejected[code] && (
              <p className="px-2 text-xs text-red-600">{rejected[code]}</p>
            )}
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

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">รหัสไปรษณีย์</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="เช่น 10900"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
                className="w-32 bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
              {zipLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
            </div>

            {/* ตำบล selection list */}
            {zipOptions.length > 0 && (
              <div className="mt-1 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <p className="text-xs text-gray-400 px-3 pt-2 pb-1">เลือกตำบล</p>
                {zipOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setLat(opt.lat)
                      setLng(opt.lng)
                      setZipHint(opt.label)
                      setArea({ province: opt.province, amphur: opt.amphur, district: opt.district })
                      setZipOptions([])
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-[#f0fdf4] flex items-center gap-2 border-t border-gray-50 first:border-0 transition-colors"
                  >
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">ตำบล</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {zipHint && (
              <p className="text-xs text-[#1A4D2E] pl-2">{zipHint}</p>
            )}
            {zipError && (
              <p className="text-xs text-red-500 pl-2">{zipError}</p>
            )}
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

        {/* ผลทำนาย — ค่าถูกบันทึกในรายการแล้ว ไปเลือกพืช/ปุ๋ยต่อในหน้าคำนวณ (ตรวจ/แก้ค่าได้ที่นั่น) */}
        {prediction ? (
          <div className="rounded-2xl border border-[#1A4D2E]/15 bg-[#F1F7F2] p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-[#1A4D2E]">
              <CheckCircle2 className="w-5 h-5" /> ผลการวิเคราะห์ภาพ
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NUTRIENT_FIELDS.map(({ label, code, unit, key }) => {
                const v = prediction[key]
                return (
                  <div key={code} className="rounded-xl bg-white p-3 text-center shadow-sm">
                    <p className="flex min-h-[2.5rem] items-center justify-center text-xs leading-tight text-gray-500">{label} ({code})</p>
                    <p className={`mt-1 text-2xl font-semibold ${v == null ? "text-gray-300" : "text-[#1A4D2E]"}`}>
                      {v == null ? "—" : v.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-gray-400">{v == null ? "ไม่ได้ส่งรูป" : unit}</p>
                  </div>
                )
              })}
            </div>
            <p className="text-xs leading-relaxed text-gray-500">
              ค่าประมาณจากแบบจำลองวิเคราะห์ภาพแผ่นทดสอบ — ตรวจและแก้ค่าได้ในขั้นเลือกพืชและคำนวณปุ๋ย
              {prediction.model_version && (
                <span className="block break-all text-[11px] text-gray-400">รุ่นแบบจำลอง {prediction.model_version}</span>
              )}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/analyze/form?from=${analysisId}`}
                className="flex flex-1 items-center justify-center gap-2 h-11 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white text-[15px] font-medium shadow-sm"
              >
                <Calculator className="w-4 h-4" /> เลือกพืชและคำนวณปุ๋ย
              </Link>
              <button
                type="button"
                onClick={resetForNext}
                className="flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw className="w-4 h-4" /> วิเคราะห์ตัวอย่างใหม่
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-8 pb-4">
            <button
              onClick={handleSubmit}
              disabled={submitting || !hasAnyFile}
              className="flex items-center justify-center gap-2 px-12 h-10 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-medium text-[15px] shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {phase === "uploading" ? "กำลังอัปโหลดรูป..." : "กำลังวิเคราะห์ภาพ..."}
                </>
              ) : (
                "ทำนายผล"
              )}
            </button>
            {phase === "predicting" && (
              <p className="text-center text-xs text-gray-500">
                ระบบกำลังตรวจรูปและทำนายค่า ถ้าระบบเพิ่งเริ่มทำงานอาจใช้เวลา 1–2 นาที
              </p>
            )}
          </div>
        )}

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
                initialLat={lat ? Number(lat) : undefined}
                initialLng={lng ? Number(lng) : undefined}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
