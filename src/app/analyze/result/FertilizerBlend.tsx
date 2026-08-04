"use client"

import { useEffect, useMemo, useState } from "react"
import {
  listFertilizerFormulas,
  type FertilizerFormulaRow,
} from "@/lib/supabase/fertilizerFormulas"
import { blendFertilizer, type Formula } from "@/lib/fertilizer/blend"
import BlendResultCard from "@/components/fertilizer/BlendResultCard"

interface Target {
  n: number | null
  p2o5: number | null
  k2o: number | null
}

/**
 * แสดง "ปุ๋ยที่เลือกใช้" ของการวิเคราะห์ครั้งนี้ — อ่านอย่างเดียว
 * หน้า result คือผลที่บันทึกแล้ว จึงไม่มีช่องให้เลือกปุ๋ยใหม่
 * ถ้ายังไม่มีปุ๋ยที่บันทึกไว้ → ไม่แสดงอะไรเลย
 */
export default function FertilizerBlend({
  target,
  unit,
  picked,                   // fertilizer_formulas.id ที่บันทึกไว้กับ record นี้
  embedded = false,         // true = ไม่มีการ์ด/หัวข้อของตัวเอง (ใช้ตอนฝังในหน้าที่มีหัวข้ออยู่แล้ว)
}: {
  target: Target
  unit: string
  picked?: string[]
  embedded?: boolean
}) {
  const [formulas, setFormulas] = useState<FertilizerFormulaRow[]>([])
  const [loading, setLoading] = useState(true)

  const pickedIds = useMemo(() => (picked ?? []).filter(Boolean), [picked])

  useEffect(() => {
    if (pickedIds.length === 0) { setLoading(false); return }
    listFertilizerFormulas()
      .then(setFormulas)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pickedIds])

  const tgt = {
    n: target.n ?? 0,
    p2o5: target.p2o5 ?? 0,
    k2o: target.k2o ?? 0,
  }
  const hasTarget = tgt.n > 0 || tgt.p2o5 > 0 || tgt.k2o > 0

  const selectedFormulas = useMemo<Formula[]>(
    () =>
      pickedIds
        .map((id) => formulas.find((f) => f.id === id))
        .filter((f): f is FertilizerFormulaRow => !!f)
        .map((f) => ({
          id: f.id,
          name: f.name,
          grade: f.grade,
          n: f.n_percent,
          p2o5: f.p2o5_percent,
          k2o: f.k2o_percent,
        })),
    [pickedIds, formulas]
  )

  const result = useMemo(
    () =>
      hasTarget && selectedFormulas.length > 0
        ? blendFertilizer(tgt, selectedFormulas)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFormulas, hasTarget, tgt.n, tgt.p2o5, tgt.k2o]
  )

  // ไม่มีเป้าธาตุอาหาร / ยังโหลดไม่เสร็จ / ไม่เคยบันทึกปุ๋ยไว้ → ซ่อนทั้งบล็อก
  if (!hasTarget || loading || selectedFormulas.length === 0) return null

  return (
    <div
      className={
        embedded
          ? ""
          : "mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      }
    >
      {!embedded && (
        <h2 className="mb-3 text-base font-semibold text-gray-800">ปุ๋ยที่เลือกใช้</h2>
      )}

      <div className="space-y-1.5">
        {selectedFormulas.map((f) => (
          <div key={f.id} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1A4D2E]" />
            <span className="font-medium">{f.name}</span>
            {f.grade && <span className="text-xs text-gray-400">({f.grade})</span>}
          </div>
        ))}
      </div>

      {result && <div className="mt-4"><BlendResultCard result={result} unit={unit} /></div>}
    </div>
  )
}
