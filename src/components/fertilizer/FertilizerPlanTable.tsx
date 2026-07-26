"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  getCropPlanUseTypes,
  getCropStageSplit,
  getFertilizerPlan,
  type FertilizerPlan,
  type UseType,
} from "@/lib/supabase/fertilizerPlan"
import {
  splitBlendByStage,
  type StageSplitRow,
} from "@/lib/fertilizer/stageSplit"
import type { BlendResult } from "@/lib/fertilizer/blend"

const USE_TYPE_LABEL: Record<UseType, string> = {
  straight: "แม่ปุ๋ย",
  compound: "ปุ๋ยผสม 100%",
  organic70: "70% + อินทรีย์",
}
// แสดง 3 แถบตายตัวเสมอ ตามลำดับนี้ (แม่ปุ๋ยเป็นหลัก)
const ALL_TYPES: UseType[] = ["straight", "compound", "organic70"]

// แถวสำหรับแสดงผล (ใช้ร่วมกันทั้งตารางตายตัว + ตารางคำนวณสด)
interface DisplayStage {
  key: string
  title: string
  subtitle?: string | null
  items: { grade: string; amount: number; unit: string }[]
}

// หน่วยมวลจาก unit ของ target (เช่น "g/tree/year" -> กรัม, "kg/rai" -> กก.)
function massLabel(unit?: string): string {
  if (!unit) return ""
  return /kg|กก/i.test(unit) ? "กก." : "กรัม"
}

/**
 * แผนการใส่ปุ๋ยตามระยะ (คำแนะนำกรมวิชาการเกษตร)
 * - แม่ปุ๋ย / 70%+อินทรีย์ / ปุ๋ยผสม 100% (พืชไร่) = ตารางตายตัวตามค่าดิน (crop_fertilizer_plan)
 * - ปุ๋ยผสม 100% (ไม้ผล) = คำนวณสด: แบ่งผล blend (ปุ๋ยที่ผู้ใช้เลือก) ตามสัดส่วนของพืช (crop_stage_split)
 * คืน null (ไม่แสดงอะไร) ถ้าพืชนี้ไม่มีข้อมูลเลย
 */
export default function FertilizerPlanTable({
  cropId,
  om,
  p,
  k,
  blend,
  unit,
}: {
  cropId: string
  om: number | null
  p: number | null
  k: number | null
  blend?: BlendResult | null
  unit?: string
}) {
  const [types, setTypes] = useState<UseType[] | null>(null)
  const [useType, setUseType] = useState<UseType>("straight")
  const [plan, setPlan] = useState<FertilizerPlan | null>(null)
  const [splitRows, setSplitRows] = useState<StageSplitRow[]>([])
  const [loading, setLoading] = useState(true)

  // โหมดที่พืชนี้มีข้อมูล (ไว้ทำแถบที่ไม่มีข้อมูลให้จาง) + สัดส่วนแบ่งระยะ (ไม้ผลปุ๋ยผสม)
  // แถบเริ่มต้นคงเป็น "แม่ปุ๋ย" เสมอตามที่กำหนด
  useEffect(() => {
    let cancelled = false
    getCropPlanUseTypes(cropId)
      .then((t) => !cancelled && setTypes(t))
      .catch(() => !cancelled && setTypes([]))
    getCropStageSplit(cropId)
      .then((r) => !cancelled && setSplitRows(r))
      .catch(() => !cancelled && setSplitRows([]))
    return () => {
      cancelled = true
    }
  }, [cropId])

  // ดึงแผนตายตัวตามค่าดิน + โหมด
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
    return () => {
      cancelled = true
    }
  }, [cropId, om, p, k, useType])

  // ปุ๋ยผสม 100% ไม้ผล = คำนวณสดจาก blend (ถ้าไม่มีตารางตายตัวแต่มีสัดส่วนแบ่งระยะ)
  const hasStaticPlan = !!plan && plan.stages.length > 0
  const canComputeSplit =
    useType === "compound" && !hasStaticPlan && splitRows.length > 0
  const computedSplit =
    canComputeSplit && blend ? splitBlendByStage(blend, splitRows) : null

  // โหมด compound "มีข้อมูล" ถ้ามีตารางตายตัว หรือมีสัดส่วนแบ่งระยะ
  function hasData(t: UseType): boolean {
    if (t === "compound" && splitRows.length > 0) return true
    return types?.includes(t) ?? false
  }

  // พืชนี้ไม่มีข้อมูลเลย -> ไม่แสดงอะไร
  if (types !== null && types.length === 0 && splitRows.length === 0) return null

  // รวมแถวแสดงผล
  let displayStages: DisplayStage[] | null = null
  if (canComputeSplit) {
    if (computedSplit && computedSplit.length > 0) {
      const m = massLabel(unit ?? splitRows[0]?.unit ?? undefined)
      displayStages = computedSplit.map((s) => ({
        key: `${s.order}`,
        title: s.stage_name,
        subtitle: s.stage_desc,
        items: s.items.map((it) => ({
          grade: it.grade,
          amount: Math.round(it.amount),
          unit: m,
        })),
      }))
    }
  } else if (hasStaticPlan) {
    displayStages = plan!.stages.map((s) => ({
      key: s.stage,
      title: s.stage,
      items: s.items.map((it) => ({ grade: it.grade, amount: it.amount, unit: it.unit })),
    }))
  }

  return (
    <div>
      {/* 3 แถบตายตัวเสมอ — แถบที่ยังไม่มีข้อมูลจะจางลง (แต่กดดูได้) */}
      <div className="mb-3 inline-flex flex-wrap gap-0.5 rounded-full bg-gray-100 p-0.5">
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setUseType(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              useType === t
                ? "bg-[#1A4D2E] text-white shadow"
                : hasData(t)
                  ? "text-gray-600"
                  : "text-gray-400"
            }`}
          >
            {USE_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดแผนปุ๋ย…
        </div>
      ) : displayStages ? (
        <div className="space-y-2">
          {displayStages.map((s) => (
            <div key={s.key} className="overflow-hidden rounded-xl border border-gray-200">
              <div className="bg-[#F1F7F2] px-4 py-2 text-sm font-semibold text-[#1A4D2E]">
                {s.subtitle ? `${s.title} ${s.subtitle}` : s.title}
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
                      <span className="text-xs font-normal text-gray-400">{it.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="pt-1 text-center text-[11px] text-gray-400">
            {canComputeSplit
              ? "คำนวณจากสูตรปุ๋ยที่เลือก แบ่งใส่ตามระยะตามคำแนะนำกรมวิชาการเกษตร"
              : "ที่มา: คำแนะนำการใช้ปุ๋ยตามค่าวิเคราะห์ดิน กรมวิชาการเกษตร"}
          </p>
        </div>
      ) : canComputeSplit && !blend ? (
        <p className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-600">
          เลือกปุ๋ยที่จะใช้แล้วกดคำนวณ เพื่อดูการแบ่งใส่ปุ๋ยผสม 100% ตามระยะ
        </p>
      ) : !plan && !canComputeSplit ? (
        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
          ยังไม่มีข้อมูลโหมด &ldquo;{USE_TYPE_LABEL[useType]}&rdquo; สำหรับพืชนี้
        </p>
      ) : (
        <p className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-600">
          {om === null || p === null || k === null
            ? "กรอกค่าดินให้ครบทั้ง OM, P, K เพื่อดูแผนใส่ปุ๋ยตามระยะ"
            : "ไม่พบแผนที่ตรงกับช่วงค่าดินนี้"}
        </p>
      )}
    </div>
  )
}
