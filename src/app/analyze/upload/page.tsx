"use client"

import { useState, useEffect, useRef } from "react"
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
  const [zipHint, setZipHint] = useState<string | null>(null)
  const [zipError, setZipError] = useState<string | null>(null)
  const [zipLoading, setZipLoading] = useState(false)
  const [zipOptions, setZipOptions] = useState<ZipOption[]>([])
  // ชื่อพื้นที่ที่ได้จากรหัสไปรษณีย์/หมุดแผนที่ — บันทึกลง record เพื่อให้หน้าผลแสดง "พื้นที่เพาะปลูก"
  const [area, setArea] = useState<Pick<ZipOption, "province" | "amphur" | "district"> | null>(null)
  const zipDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchIndexRef = useRef<Array<{ t: string; nth: string; pth?: string; dth?: string; b: [number,number,number,number]; zip?: string }> | null>(null)

  async function ensureSearchIndex() {
    if (searchIndexRef.current) return searchIndexRef.current
    const res = await fetch("/boundaries/search-index.json")
    searchIndexRef.current = await res.json()
    return searchIndexRef.current!
  }

  // ZIP → Nominatim (get district/province) → filter search-index for all ตำบล in that district
  useEffect(() => {
    if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current)
    setZipHint(null)
    setZipError(null)
    setZipOptions([])
    setArea(null)

    if (!/^\d{5}$/.test(postalCode)) return

    zipDebounceRef.current = setTimeout(async () => {
      setZipLoading(true)
      try {
        // 1. ค้นจาก index ก่อน (99.6% ของตำบลมี zip)
        const idx = await ensureSearchIndex()
        const subs = idx.filter(e => e.t === "sub" && e.zip === postalCode)

        if (subs.length > 0) {
          const options = subs.map(toZipOption)
          if (options.length === 1) {
            const o = options[0]
            setLat(o.lat); setLng(o.lng); setZipHint(o.label)
            setArea({ province: o.province, amphur: o.amphur, district: o.district })
          } else {
            setZipOptions(options)
          }
          return
        }

        // 2. fallback: Nominatim (31 ตำบลที่ชื่อ match ไม่ติดใน dataset)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?postalcode=${postalCode}&countrycodes=th&format=json&limit=1`,
          { headers: { "Accept-Language": "th" } }
        )
        const hits = await res.json() as Array<{ display_name: string; boundingbox: string[] }>
        if (!hits.length) { setZipError("ไม่พบรหัสไปรษณีย์"); return }

        const parts = hits[0].display_name.split(", ")
        const prov =
          parts.find((p: string) => p.startsWith("จังหวัด"))?.replace("จังหวัด", "")
          ?? (parts.some((p: string) => p === "กรุงเทพมหานคร") ? "กรุงเทพมหานคร" : undefined)
        let dist: string | undefined
        if (prov) {
          const STRIP = ["อำเภอ", "เขต"]
          for (const part of parts) {
            if (idx.some(e => e.t === "dist" && e.pth === prov && e.nth === part)) { dist = part; break }
            for (const prefix of STRIP) {
              if (part.startsWith(prefix)) {
                const stripped = part.replace(prefix, "")
                if (idx.some(e => e.t === "dist" && e.pth === prov && e.nth === stripped)) { dist = stripped; break }
              }
            }
            if (dist) break
          }
        }
        if (!prov) {
          const bb = hits[0].boundingbox
          setLat(((parseFloat(bb[0]) + parseFloat(bb[1])) / 2).toFixed(6))
          setLng(((parseFloat(bb[2]) + parseFloat(bb[3])) / 2).toFixed(6))
          return
        }
        const fallbackSubs = idx.filter(e => e.t === "sub" && e.pth === prov && (!dist || e.dth === dist))
        if (fallbackSubs.length === 0) { setZipError("ไม่พบรหัสไปรษณีย์"); return }
        const options = fallbackSubs.map(toZipOption)
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

  const handleMapConfirm = (pickedLat: number, pickedLng: number, pickedZip?: string) => {
    setLat(String(pickedLat))
    setLng(String(pickedLng))
    if (pickedZip) setPostalCode(pickedZip)
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
        province: area?.province ?? null,
        amphur: area?.amphur ?? null,
        district: area?.district ?? null,
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
