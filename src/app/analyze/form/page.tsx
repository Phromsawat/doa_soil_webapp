"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Sprout, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { saveManualAnalysis } from "@/lib/supabase/analyses"
import { calculateAndSave, listCrops, type CropOption } from "@/lib/supabase/fertilizer"
import { ensureSession } from "@/lib/supabase/auth"

const formSchema = z.object({
  crop_id: z.string().uuid("กรุณาเลือกพืช"),
  organicMatter: z.number().min(0).max(100),
  phosphorus: z.number().min(0).max(10000),
  potassium: z.number().min(0).max(10000),
})

type FormValues = z.infer<typeof formSchema>

export default function AnalyzeForm() {
  const router = useRouter()
  const [crops, setCrops] = useState<CropOption[]>([])
  const [cropsLoading, setCropsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      crop_id: "",
      organicMatter: 1.5,
      phosphorus: 0,
      potassium: 0,
    },
  })

  useEffect(() => {
    listCrops()
      .then(setCrops)
      .catch((e) => setSubmitError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCropsLoading(false))
  }, [])

  const omValue = watch("organicMatter") as number
  const pValue  = watch("phosphorus") as number
  const kValue  = watch("potassium") as number

  const getBadge = (value: number, lowMax: number, highMin: number) => {
    if (value < lowMax)  return { label: "ต่ำ",      className: "bg-red-100 text-red-600" }
    if (value > highMin) return { label: "สูง",      className: "bg-green-100 text-primary" }
    return                       { label: "ปานกลาง", className: "bg-orange-100 text-orange-600" }
  }

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      await ensureSession()
      const crop = crops.find((c) => c.id === data.crop_id)

      const analysisId = await saveManualAnalysis({
        crop_id: data.crop_id,
        om_value: data.organicMatter,
        p_value: data.phosphorus,
        k_value: data.potassium,
        ph_value: null,
        province: null,
        amphur: null,
        district: null,
        notes: crop ? `พืช: ${crop.name}` : null,
      })

      try {
        await calculateAndSave({
          analysis_id: analysisId,
          crop_id: data.crop_id,
          om_value: data.organicMatter,
          p_value: data.phosphorus,
          k_value: data.potassium,
        })
      } catch (calcErr) {
        console.warn("calculateAndSave failed:", calcErr)
      }

      router.push(`/analyze/result?id=${analysisId}`)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const cropsByType = crops.reduce<Record<string, CropOption[]>>((acc, c) => {
    (acc[c.crop_type_name] = acc[c.crop_type_name] ?? []).push(c)
    return acc
  }, {})

  const omBadge = getBadge(omValue, 1, 3)
  const pBadge  = getBadge(pValue,  15, 45)
  const kBadge  = getBadge(kValue,  50, 100)

  return (
    <div className="font-thai pb-24">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-4 mx-4 max-w-3xl lg:mx-auto">
        <h2 className="text-lg font-semibold text-gray-800 text-center mb-6">กรอกผลการวิเคราะห์ทางเคมี</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Crop selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Sprout className="w-4 h-4 text-[#1A4D2E]" /> เลือกพืชที่จะปลูก
            </label>
            {cropsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 px-4 h-11 bg-gray-50 rounded-full border border-gray-100">
                <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดรายการพืช...
              </div>
            ) : (
              <select
                {...register("crop_id")}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-11 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              >
                <option value="">-- เลือกพืช --</option>
                {Object.entries(cropsByType).map(([type, list]) => (
                  <optgroup key={type} label={type}>
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            {errors.crop_id && (
              <p className="text-xs text-red-500 pl-2">{errors.crop_id.message}</p>
            )}
          </div>

          {/* Chemical analysis values */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <label className="text-sm font-semibold text-gray-700">ค่าวิเคราะห์จากชุดทดสอบดิน</label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  อินทรียวัตถุ (OM) <span className="text-gray-400">— %</span>
                </label>
                <input
                  type="number" step="any" min="0" max="100"
                  {...register("organicMatter", { valueAsNumber: true })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
                />
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${omBadge.className}`}>{omBadge.label}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  ฟอสฟอรัส (P) <span className="text-gray-400">— mg/kg</span>
                </label>
                <input
                  type="number" step="any" min="0"
                  {...register("phosphorus", { valueAsNumber: true })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
                />
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${pBadge.className}`}>{pBadge.label}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  โพแทสเซียม (K) <span className="text-gray-400">— mg/kg</span>
                </label>
                <input
                  type="number" step="any" min="0"
                  {...register("potassium", { valueAsNumber: true })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
                />
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${kBadge.className}`}>{kBadge.label}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 italic pt-1">
              💡 ระบบจะคำนวณ N, P₂O₅, K₂O ที่ต้องใส่ให้คุณเอง — กรอกแค่ค่าจากผลวิเคราะห์ดิน
            </p>
          </div>

          {submitError && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{submitError}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 h-11 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full font-medium text-[15px] shadow-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> รีเฟรช
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-[2] h-11 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-medium text-[15px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</>)
                          : "บันทึก + คำนวณสูตรปุ๋ย"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
