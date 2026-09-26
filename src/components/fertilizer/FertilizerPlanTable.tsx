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
import type { StageSplitRow } from "@/lib/fertilizer/stageSplit"
import type { BlendResult } from "@/lib/fertilizer/blend"
import {
  chooseChemicalPlan,
  missingGradesNote,
  PLAN_TABS,
  PLAN_TAB_LABEL,
  type PlanTab,
} from "@/lib/fertilizer/chemicalPlan"

// หน่วยมวลจาก unit ของ target (เช่น "g/tree/year" -> กรัม, "kg/rai" -> กก.)
function massLabel(unit?: string): string {
  if (!unit) return ""
  return /kg|กก/i.test(unit) ? "กก." : "กรัม"
}

type Plans = Record<UseType, FertilizerPlan | null>

/**
 * แผนการใส่ปุ๋ยตามระยะ (คำแนะนำกรมวิชาการเกษตร) — 2 แถบ
 * - ปุ๋ยเคมี = แม่ปุ๋ย / ปุ๋ยผสม / คำนวณสด ตามปุ๋ยที่เลือก (ดู chooseChemicalPlan)
 * - ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์ = ตารางตายตัวตามค่าดิน (organic70)
 * คืน null (ไม่แสดงอะไร) ถ้าพืชนี้ไม่มีข้อมูลเลย
 */
export default function FertilizerPlanTable({
  cropId,
  om,
  p,
  k,
  blend,
  pickedGrades,
  unit,
  onTabChange,
}: {
  cropId: string
  om: number | null
  p: number | null
  k: number | null
  blend?: BlendResult | null
  /** สูตรของปุ๋ยที่ผู้ใช้เลือก (เช่น "46-0-0") — ใช้ตัดสินว่าจะแสดงตารางแม่ปุ๋ยหรือไม่ */
  pickedGrades: string[]
  unit?: string
  /** แจ้งแถบที่กำลังดูอยู่ให้หน้าแม่ (ใช้ตอนออกรายงานให้ตรงกับที่เห็นบนจอ) */
  onTabChange?: (t: PlanTab) => void
}) {
  const [types, setTypes] = useState<UseType[] | null>(null)
  const [tab, setTab] = useState<PlanTab>("chemical")
  const [plans, setPlans] = useState<Plans | null>(null)
  const [splitRows, setSplitRows] = useState<StageSplitRow[]>([])
  const [loading, setLoading] = useState(true)

  // โหมดที่พืชนี้มีตาราง (ไว้ทำแถบที่ไม่มีข้อมูลให้จาง) + สัดส่วนแบ่งระยะ (ไม้ผล)
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

  // ดึงตารางตายตัวทั้ง 3 ชนิดพร้อมกัน — แถบปุ๋ยเคมีต้องใช้ทั้งแม่ปุ๋ยและปุ๋ยผสมมาเลือก
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const get = (use_type: UseType) =>
        getFertilizerPlan({ crop_id: cropId, om, p, k, use_type }).catch(() => null)
      const [straight, compound, organic70] = await Promise.all([
        get("straight"),
        get("compound"),
        get("organic70"),
      ])
      if (!cancelled) {
        setPlans({ straight, compound, organic70 })
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [cropId, om, p, k])

  // พืชนี้ไม่มีข้อมูลเลย -> ไม่แสดงอะไร
  if (types !== null && types.length === 0 && splitRows.length === 0) return null

  const choice =
    tab === "chemical" && plans
      ? chooseChemicalPlan({
          straight: plans.straight,
          compound: plans.compound,
          splitRows,
          blend: blend ?? null,
          pickedGrades,
          massUnit: massLabel(unit ?? splitRows[0]?.unit ?? undefined),
        })
      : null
  const organic = tab === "organic70" ? plans?.organic70 ?? null : null
  const shown: FertilizerPlan | null =
    tab === "chemical" ? choice?.plan ?? null : organic && organic.stages.length > 0 ? organic : null

  // แถบ organic70 จางลงถ้าพืชนี้ไม่มีตาราง (แต่กดดูได้)
  const hasData = (t: PlanTab) => t === "chemical" || (types?.includes("organic70") ?? false)
  const soilIncomplete = om === null || p === null || k === null

  return (
    <div>
      <div className="mb-3 inline-flex flex-wrap gap-0.5 rounded-full bg-gray-100 p-0.5">
        {PLAN_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); onTabChange?.(t) }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              tab === t
                ? "bg-[#1A4D2E] text-white shadow"
                : hasData(t)
                  ? "text-gray-600"
                  : "text-gray-400"
            }`}
          >
            {PLAN_TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดแผนปุ๋ย…
        </div>
      ) : shown ? (
        <div className="space-y-2">
          {choice && choice.missingGrades.length > 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-700">
              {missingGradesNote(choice.missingGrades)}
            </p>
          )}
          {shown.stages.map((s) => (
            <div key={s.stage} className="overflow-hidden rounded-xl border border-gray-200">
              <div className="bg-[#F1F7F2] px-4 py-2 text-sm font-semibold text-[#1A4D2E]">{s.stage}</div>
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
            {choice?.source === "computed"
              ? "คำนวณจากสูตรปุ๋ยที่เลือก แบ่งใส่ตามระยะตามคำแนะนำกรมวิชาการเกษตร"
              : "ที่มา: คำแนะนำการใช้ปุ๋ยตามค่าวิเคราะห์ดิน กรมวิชาการเกษตร"}
          </p>
        </div>
      ) : tab === "organic70" && !plans?.organic70 ? (
        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
          ยังไม่มีข้อมูล &ldquo;{PLAN_TAB_LABEL[tab]}&rdquo; สำหรับพืชนี้
        </p>
      ) : (
        <p className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-600">
          {soilIncomplete
            ? "กรอกค่าดินให้ครบทั้ง OM, P, K เพื่อดูแผนใส่ปุ๋ยตามระยะ"
            : "ไม่พบแผนที่ตรงกับช่วงค่าดินนี้"}
        </p>
      )}
    </div>
  )
}
