"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Share2, Loader2, MapPin, Droplets, Sprout, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { getAnalysis } from "@/lib/supabase/analyses"
import { listCrops, calculateAndSave, type CropOption, type FertilizerResult } from "@/lib/supabase/fertilizer"

type AnalysisRecord = Awaited<ReturnType<typeof getAnalysis>>

function ResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id")

  const [record, setRecord] = useState<AnalysisRecord | null>(null)
  const [crops, setCrops] = useState<CropOption[]>([])
  const [selectedCropId, setSelectedCropId] = useState<string>("")
  const [calculation, setCalculation] = useState<FertilizerResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError("ไม่พบรหัสการวิเคราะห์")
      return
    }
    Promise.all([getAnalysis(id), listCrops()])
      .then(([data, cropList]) => {
        setRecord(data)
        setCrops(cropList)
        if (data?.crop_id) setSelectedCropId(data.crop_id)
        // If a result already exists, hydrate the calculation state
        const existing = data?.analysis_results?.[0]
        if (existing) {
          setCalculation({
            target_n: existing.recommended_n,
            target_p2o5: existing.recommended_p2o5,
            target_k2o: existing.recommended_k2o,
            unit: existing.unit ?? "g/tree/year",
            matched: {
              om: existing.recommended_n !== null,
              p:  existing.recommended_p2o5 !== null,
              k:  existing.recommended_k2o !== null,
            },
            notes: [],
          })
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [id])

  async function runCalculation() {
    if (!record || !selectedCropId) return
    setCalculating(true)
    setError(null)
    try {
      const result = await calculateAndSave({
        analysis_id: record.id,
        crop_id: selectedCropId,
        om_value: record.om_value,
        p_value:  record.p_value,
        k_value:  record.k_value,
      })
      setCalculation(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCalculating(false)
    }
  }

  if (loading) {
    return (
      <div className="font-thai flex items-center justify-center pt-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A4D2E]" />
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="font-thai max-w-md mx-auto mt-12 px-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl text-center space-y-3">
          <p className="font-semibold">โหลดผลไม่สำเร็จ</p>
          <p className="text-sm">{error || "ไม่พบข้อมูล"}</p>
          <Button onClick={() => router.push("/analyze")} className="rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-medium">
            กลับไปวิเคราะห์ใหม่
          </Button>
        </div>
      </div>
    )
  }

  const om = record.om_value ?? 0
  const p = record.p_value ?? 0
  const k = record.k_value ?? 0
  const ph = record.ph_value ?? 6.0
  const province = record.province ?? "ไม่ระบุ"

  const classify = (val: number, low: number, high: number) => {
    if (val < low)  return { label: "ต่ำ",      textColor: "#ff000d", barColor: "#ff000d", pct: 30 }
    if (val > high) return { label: "สูง",      textColor: "#4a9e52", barColor: "#85c98a", pct: 90 }
    return            { label: "ปานกลาง", textColor: "#c47f17", barColor: "#ffd188", pct: 60 }
  }
  const omLevel = classify(om, 1, 3)
  const pLevel  = classify(p, 15, 45)
  const kLevel  = classify(k, 50, 100)

  // Group crops by type for the dropdown
  const cropsByType = crops.reduce<Record<string, CropOption[]>>((acc, c) => {
    (acc[c.crop_type_name] = acc[c.crop_type_name] ?? []).push(c)
    return acc
  }, {})

  return (
    <div className="font-thai pb-24 relative pt-6 px-4 max-w-2xl mx-auto">

      <div className="space-y-4">
        {/* NPK card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-medium text-text-primary">ระดับธาตุอาหารหลัก</h2>
            <div className="px-3 py-1 bg-green-100 text-gray-700 text-xs font-medium rounded-full">
              {record.input_mode === "image_upload" ? "อัปโหลดรูป" : "กรอกค่าเอง"}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-text-secondary">อินทรียวัตถุ (OM)</span>
                <span className="text-text-secondary">{om}% ({omLevel.label})</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${omLevel.pct}%`, backgroundColor: omLevel.barColor }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-text-secondary">ฟอสฟอรัส (P)</span>
                <span className="text-text-secondary">{p} mg/kg ({pLevel.label})</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pLevel.pct}%`, backgroundColor: pLevel.barColor }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-text-secondary">โพแทสเซียม (K)</span>
                <span className="text-text-secondary">{k} mg/kg ({kLevel.label})</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${kLevel.pct}%`, backgroundColor: kLevel.barColor }}></div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex justify-center gap-4 text-xs text-text-secondary font-medium">
            <span>pH: {ph}</span>
            {record.notes && <><span>|</span><span className="text-gray-500 font-normal">{record.notes}</span></>}
          </div>
        </div>

        {/* Uploaded images */}
        {record.analysis_images && record.analysis_images.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium mb-3 text-gray-800">รูปแผ่นทดสอบที่อัปโหลด</h3>
            <div className="grid grid-cols-3 gap-2">
              {record.analysis_images.map((img: { id: string; nutrient_code: string; public_url: string | null }) => (
                <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
                  {img.public_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.public_url} alt={img.nutrient_code} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-full font-medium">
                    {img.nutrient_code}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {(province !== "ไม่ระบุ" || record.latitude) && (
          <div className="relative rounded-2xl overflow-hidden h-28 shadow-sm bg-gradient-to-r from-green-700 to-green-900">
            <div className="absolute inset-0 flex items-center p-5">
              <div className="text-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-4 h-4 text-green-300" />
                  <span className="text-xs font-medium text-gray-200">พื้นที่เพาะปลูก</span>
                </div>
                <h3 className="text-lg font-medium">{province}</h3>
                {record.latitude && record.longitude && (
                  <p className="text-xs text-gray-300 mt-0.5">{Number(record.latitude).toFixed(4)}, {Number(record.longitude).toFixed(4)}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Crop selection + calculate */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-800">เลือกพืชที่จะปลูก</h3>
          </div>

          <div className="relative">
            <select
              value={selectedCropId}
              onChange={(e) => setSelectedCropId(e.target.value)}
              className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-full px-4 pr-10 h-11 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
            >
              <option value="">-- เลือกพืช --</option>
              {Object.entries(cropsByType).map(([type, list]) => (
                <optgroup key={type} label={type}>
                  {list.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={runCalculation}
            disabled={!selectedCropId || calculating}
            className="w-full h-11 rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {calculating ? <><Loader2 className="w-4 h-4 animate-spin" />กำลังคำนวณ...</> : "คำนวณคำแนะนำปุ๋ย"}
          </button>
        </div>

        {/* Fertilizer recommendation */}
        <div className="bg-[#1A2F2A] rounded-2xl p-5 text-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>

          <h2 className="text-base font-medium mb-4">คำแนะนำการจัดการปุ๋ย</h2>

          {!calculation ? (
            <div className="bg-white/10 rounded-xl p-4 text-center text-sm text-white/70 italic">
              เลือกพืชด้านบนแล้วกด &quot;คำนวณคำแนะนำปุ๋ย&quot;
            </div>
          ) : (
            <div className="bg-white/10 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-white/60 mb-1">N (ไนโตรเจน)</p>
                  <p className="text-2xl font-medium text-accent">{calculation.target_n ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/60 mb-1">P₂O₅ (ฟอสฟอรัส)</p>
                  <p className="text-2xl font-medium text-accent">{calculation.target_p2o5 ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/60 mb-1">K₂O (โพแทสเซียม)</p>
                  <p className="text-2xl font-medium text-accent">{calculation.target_k2o ?? "—"}</p>
                </div>
              </div>
              <div className="text-center text-xs text-white/70 pt-2 border-t border-white/10">
                หน่วย: <span className="font-medium text-white">{calculation.unit}</span>
              </div>
              {calculation.notes.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  {calculation.notes.map((n, i) => (
                    <p key={i} className="text-xs text-orange-200 italic">⚠ {n}</p>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-white/50 italic pt-2 border-t border-white/10">
                * ปริมาณข้างต้นคือธาตุอาหารบริสุทธิ์ ใช้เป็นเกณฑ์เลือกสูตรปุ๋ยที่เหมาะสม
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={() => router.push("/analyze/fertilizer")} className="w-full rounded-full bg-[#1A4D2E] hover:bg-[#143a22] text-white font-medium h-12">
          คำนวณสูตรปุ๋ย
        </Button>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/analyze")} className="text-sm font-medium text-text-secondary px-2 hover:text-primary transition-colors whitespace-nowrap">
            วิเคราะห์ใหม่
          </button>
          <Button variant="outline" className="flex-1 rounded-full border-gray-200 font-medium h-12 text-text-primary bg-white hover:bg-gray-50 flex items-center gap-2">
            <Share2 className="w-4 h-4" /> แชร์ผล
          </Button>
          <Button onClick={() => router.push("/history")} className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white font-medium h-12">
            ดูประวัติ
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AnalyzeResult() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center pt-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A4D2E]" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  )
}
