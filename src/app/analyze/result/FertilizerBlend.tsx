"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, X, Loader2 } from "lucide-react"
import {
  listFertilizerFormulas,
  type FertilizerFormulaRow,
} from "@/lib/supabase/fertilizerFormulas"
import { blendFertilizer, type Formula } from "@/lib/fertilizer/blend"

interface Target {
  n: number | null
  p2o5: number | null
  k2o: number | null
}

// แปลงหน่วยของ target (เช่น "g/tree/year", "kg/rai") เป็น label แสดงผล
function unitParts(unit: string) {
  const mass = unit.toLowerCase().startsWith("kg") ? "กก." : "กรัม"
  const basis = /rai|ไร่/i.test(unit)
    ? "ต่อไร่"
    : /tree|ต้น/i.test(unit)
      ? "ต่อต้น"
      : ""
  return { mass, basis }
}

export default function FertilizerBlend({
  target,
  unit,
  embedded = false, // true = ไม่มีการ์ด/หัวข้อของตัวเอง (ใช้ตอนฝังในหน้าที่มีหัวข้ออยู่แล้ว)
}: {
  target: Target
  unit: string
  embedded?: boolean
}) {
  const [formulas, setFormulas] = useState<FertilizerFormulaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [picked, setPicked] = useState<string[]>([""]) // สูงสุด 3 สูตร

  useEffect(() => {
    listFertilizerFormulas()
      .then(setFormulas)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tgt = {
    n: target.n ?? 0,
    p2o5: target.p2o5 ?? 0,
    k2o: target.k2o ?? 0,
  }
  const hasTarget = tgt.n > 0 || tgt.p2o5 > 0 || tgt.k2o > 0

  const selectedFormulas = useMemo<Formula[]>(
    () =>
      picked
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
    [picked, formulas]
  )

  const result = useMemo(
    () =>
      hasTarget && selectedFormulas.length > 0
        ? blendFertilizer(tgt, selectedFormulas)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFormulas, hasTarget, tgt.n, tgt.p2o5, tgt.k2o]
  )

  const { mass, basis } = unitParts(unit)

  function setSlot(i: number, value: string) {
    setPicked((prev) => prev.map((v, idx) => (idx === i ? value : v)))
  }
  function addSlot() {
    setPicked((prev) => (prev.length < 3 ? [...prev, ""] : prev))
  }
  function removeSlot(i: number) {
    setPicked((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  if (!hasTarget) return null

  // ตัวเลือกปุ๋ยที่ยังไม่ถูกเลือกในช่องอื่น
  const optionsFor = (currentId: string) =>
    formulas.filter((f) => f.id === currentId || !picked.includes(f.id))

  return (
    <div
      className={
        embedded
          ? ""
          : "mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      }
    >
      {!embedded && (
        <>
          <h2 className="text-base font-semibold text-gray-800">
            ขั้นที่ 2 · เลือกปุ๋ยที่จะใช้
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            เลือกปุ๋ยที่หาซื้อได้ 1–3 สูตร ระบบจะคำนวณให้ว่าต้องใช้แต่ละตัวเท่าไร
          </p>
        </>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายการปุ๋ย…
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {picked.map((id, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={id}
                  onChange={(e) => setSlot(i, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A4D2E] focus:outline-none"
                >
                  <option value="">— เลือกปุ๋ย —</option>
                  {optionsFor(id).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.grade ? ` (${f.grade})` : ""}
                    </option>
                  ))}
                </select>
                {picked.length > 1 && (
                  <button
                    onClick={() => removeSlot(i)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                    aria-label="ลบปุ๋ย"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {picked.length < 3 && (
            <button
              onClick={addSlot}
              className="mt-2 flex items-center gap-1 text-sm font-medium text-[#1A4D2E] hover:opacity-80"
            >
              <Plus className="h-4 w-4" /> เพิ่มปุ๋ยอีกสูตร
            </button>
          )}

          {/* ผลลัพธ์ */}
          {result && result.items.length > 0 && (
            <div className="mt-4 rounded-xl bg-[#F1F7F2] p-4">
              <div className="mb-2 text-sm font-semibold text-[#1A4D2E]">
                ปริมาณปุ๋ยที่ต้องใช้ {basis}
              </div>
              <div className="space-y-1.5">
                {result.items.map((it) => (
                  <div
                    key={it.formula.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">
                      {it.formula.name}
                      {it.formula.grade ? (
                        <span className="text-gray-400"> ({it.formula.grade})</span>
                      ) : null}
                    </span>
                    <span className="font-bold text-gray-900">
                      {Math.ceil(it.kg).toLocaleString()} {mass}
                    </span>
                  </div>
                ))}
              </div>

              {/* แจ้งส่วนขาด/เกิน ถ้าสูตรที่เลือกให้ตรงเป้าไม่ได้ */}
              {!result.exact && (
                <div className="mt-3 border-t border-[#1A4D2E]/10 pt-2 text-xs">
                  {(
                    [
                      ["N", result.diff.n],
                      ["P₂O₅", result.diff.p2o5],
                      ["K₂O", result.diff.k2o],
                    ] as const
                  )
                    .filter(([, d]) => Math.abs(d) >= 0.5)
                    .map(([label, d]) => (
                      <p
                        key={label}
                        className={d < 0 ? "text-amber-600" : "text-sky-600"}
                      >
                        {d < 0
                          ? `⚠ ยังขาด ${label} ${Math.abs(d).toFixed(1)} ${mass} (สูตรที่เลือกให้ธาตุนี้ไม่พอ)`
                          : `เกิน ${label} ${d.toFixed(1)} ${mass}`}
                      </p>
                    ))}
                  <p className="mt-1 text-gray-400">
                    เพิ่มปุ๋ยที่มีธาตุที่ขาด เพื่อให้ครบตามเป้าหมาย
                  </p>
                </div>
              )}

            </div>
          )}

          {result && result.items.length === 0 && (
            <p className="mt-3 text-sm text-amber-600">
              สูตรที่เลือกไม่มีธาตุอาหารที่ต้องการเลย — ลองเลือกสูตรอื่น
            </p>
          )}
        </>
      )}
    </div>
  )
}
