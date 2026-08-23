"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  getSoilRecommendationTable,
  type RecNutrient,
  type SoilRecTable,
} from "@/lib/supabase/soilRecommendation"
import { getSoilRecMeta } from "@/lib/soil/soilRecMeta"

const NUTRIENT_META: Record<RecNutrient, { title: string; method: string; symbol: string }> = {
  om: { title: "อินทรียวัตถุ (OM, %)", method: "Walkley and Black", symbol: "N" },
  p: { title: "ฟอสฟอรัสที่เป็นประโยชน์ (P, มก./กก.)", method: "Bray II", symbol: "P₂O₅" },
  k: { title: "โพแทสเซียมที่เป็นประโยชน์ (K, มก./กก.)", method: "NH₄OAc, pH7", symbol: "K₂O" },
}

/** "1,920 กรัม N ต่อต้นต่อปี" / "15 กก. N ต่อไร่" */
function amountText(amount: number | null, unit: string, symbol: string): string {
  if (amount === null) return "—"
  const n = amount.toLocaleString("th-TH")
  return /kg|กก/i.test(unit)
    ? `${n} กก. ${symbol} ต่อไร่`
    : `${n} กรัม ${symbol} ต่อต้นต่อปี`
}

/**
 * ตาราง "การใช้ปุ๋ยตามค่าวิเคราะห์ดิน" ของพืชที่เลือก (ขั้นที่ 3 ในฟอร์ม)
 * แสดงอย่างเดียว ไม่ผูกกับค่าดินที่ผู้ใช้กรอก
 * ตัวเลขมาจาก fertilizer_recommendations ซึ่งเป็นตารางเดียวกับที่ใช้คำนวณในขั้นถัดไป
 * ยังไม่เลือกพืช / พืชนี้ไม่มีตาราง -> ขึ้นขีด -
 */
export default function SoilRecommendationTable({
  cropId,
  cropName,
}: {
  cropId: string
  cropName: string
}) {
  const [table, setTable] = useState<SoilRecTable | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!cropId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const t = await getSoilRecommendationTable(cropId, getSoilRecMeta(cropName).decimals)
        if (!cancelled) setTable(t)
      } catch {
        if (!cancelled) setTable(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [cropId, cropName])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดตารางคำแนะนำ…
      </div>
    )
  }

  if (!cropId || !table) {
    return (
      <p className="rounded-xl border border-gray-100 bg-gray-50 py-6 text-center text-sm text-gray-400">
        -
      </p>
    )
  }

  const meta = getSoilRecMeta(cropName)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="bg-[#F1F7F2] px-4 py-2">
        <p className="text-sm font-semibold text-[#1A4D2E]">
          การใช้ปุ๋ยตามค่าวิเคราะห์ดินสำหรับ{cropName}
        </p>
        {meta.basis && (
          <p className="text-[11px] text-[#1A4D2E]/60">อัตราแนะนำสำหรับ{meta.basis}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70 text-left">
              <th className="px-4 py-2 font-medium text-gray-600">รายการวิเคราะห์</th>
              <th className="px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
                ค่าวิเคราะห์
              </th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">
                ปริมาณธาตุอาหารอัตราแนะนำ
              </th>
            </tr>
          </thead>
          <tbody>
            {table.sections.map((s, si) => {
              const nm = NUTRIENT_META[s.nutrient]
              return s.bands.map((b, bi) => (
                <tr
                  key={`${s.nutrient}-${bi}`}
                  className={`border-t ${bi === 0 ? "border-gray-200" : "border-gray-100"}`}
                >
                  {bi === 0 && (
                    <td
                      rowSpan={s.bands.length}
                      className="border-r border-gray-100 px-4 py-2 align-top"
                    >
                      <span className="text-gray-700">
                        {si + 1}) {nm.title}
                      </span>
                      <span className="block text-[11px] text-gray-400">({nm.method})</span>
                    </td>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">{b.range}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap text-gray-700">
                    {amountText(b.amount, table.unit, nm.symbol)}
                  </td>
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
