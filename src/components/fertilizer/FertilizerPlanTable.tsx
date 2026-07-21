"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  getCropPlanUseTypes,
  getFertilizerPlan,
  type FertilizerPlan,
  type UseType,
} from "@/lib/supabase/fertilizerPlan"

const USE_TYPE_LABEL: Record<UseType, string> = {
  straight: "แม่ปุ๋ย",
  compound: "ปุ๋ยเชิงประกอบ",
}

/**
 * แผนการใส่ปุ๋ยตายตัวตามค่าวิเคราะห์ดิน (คำแนะนำกรมวิชาการเกษตร)
 * แสดงปริมาณปุ๋ยแต่ละสูตร แยกตามระยะ + สลับโหมดแม่ปุ๋ย/เชิงประกอบ
 * คืน null (ไม่แสดงอะไร) ถ้าพืชนี้ไม่มีตารางในฐานข้อมูล
 */
export default function FertilizerPlanTable({
  cropId,
  om,
  p,
  k,
}: {
  cropId: string
  om: number | null
  p: number | null
  k: number | null
}) {
  const [types, setTypes] = useState<UseType[] | null>(null)
  const [useType, setUseType] = useState<UseType>("straight")
  const [plan, setPlan] = useState<FertilizerPlan | null>(null)
  const [loading, setLoading] = useState(true)

  // โหมดที่พืชนี้มี — ตั้ง useType เริ่มต้นเป็นตัวแรกที่มี
  useEffect(() => {
    let cancelled = false
    getCropPlanUseTypes(cropId)
      .then((t) => {
        if (cancelled) return
        setTypes(t)
        if (t.length > 0) setUseType((prev) => (t.includes(prev) ? prev : t[0]))
      })
      .catch(() => !cancelled && setTypes([]))
    return () => { cancelled = true }
  }, [cropId])

  // ดึงแผนตามค่าดิน + โหมด
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const r = await getFertilizerPlan({ crop_id: cropId, om, p, k, use_type: useType })
        if (!cancelled) setPlan(r)
      } catch {
        if (!cancelled) setPlan(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [cropId, om, p, k, useType])

  // พืชนี้ไม่มีตารางในฐานข้อมูล -> ไม่แสดงอะไร
  if (types !== null && types.length === 0) return null

  return (
    <div>
      {/* สลับโหมด (เฉพาะพืชที่มีมากกว่า 1 โหมด) */}
      {types && types.length > 1 && (
        <div className="mb-3 inline-flex rounded-full bg-gray-100 p-0.5">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setUseType(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                useType === t ? "bg-[#1A4D2E] text-white shadow" : "text-gray-600"
              }`}
            >
              {USE_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดแผนปุ๋ย…
        </div>
      ) : !plan || plan.stages.length === 0 ? (
        <p className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-600">
          {plan && (om === null || p === null || k === null)
            ? "กรอกค่าดินให้ครบทั้ง OM, P, K เพื่อดูแผนใส่ปุ๋ยตามระยะ"
            : "ไม่พบแผนที่ตรงกับช่วงค่าดินนี้"}
        </p>
      ) : (
        <div className="space-y-2">
          {plan.stages.map((s) => (
            <div key={s.stage} className="overflow-hidden rounded-xl border border-gray-200">
              <div className="bg-[#F1F7F2] px-4 py-2 text-sm font-semibold text-[#1A4D2E]">
                {s.stage}
              </div>
              <div className="divide-y divide-gray-100">
                {s.items.map((it) => (
                  <div
                    key={it.grade}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="text-gray-700">{it.grade}</span>
                    <span className="font-bold text-gray-900">
                      {it.amount.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-gray-400">{plan.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="pt-1 text-center text-[11px] text-gray-400">
            ที่มา: คำแนะนำการใช้ปุ๋ยตามค่าวิเคราะห์ดิน กรมวิชาการเกษตร
          </p>
        </div>
      )}
    </div>
  )
}
