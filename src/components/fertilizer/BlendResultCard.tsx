"use client"

import { compareGrade, type BlendResult } from "@/lib/fertilizer/blend"

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

/**
 * แสดงผลลัพธ์ปริมาณปุ๋ยที่ต้องใช้ (กก./กรัม ต่อไร่/ต้น) + แจ้งส่วนขาด-เกิน
 * เป็นตัวแสดงผลล้วน ๆ — ผู้เรียกเป็นคนตัดสินใจว่าจะ render เมื่อไร
 */
export default function BlendResultCard({
  result,
  unit,
}: {
  result: BlendResult
  unit: string
}) {
  const { mass, basis } = unitParts(unit)

  // เรียง N-P-K ให้ตรงกับตารางแผนปุ๋ย (blend เดิมเรียงตาม P มาก่อน)
  const items = [...result.items].sort((a, b) =>
    compareGrade(a.formula.grade ?? a.formula.name, b.formula.grade ?? b.formula.name)
  )

  if (result.items.length === 0) {
    return (
      <p className="mt-3 text-sm text-amber-600">
        สูตรที่เลือกไม่มีธาตุอาหารที่ต้องการเลย — ลองเลือกสูตรอื่น
      </p>
    )
  }

  return (
    <div className="mt-1 rounded-xl bg-[#F1F7F2] p-4">
      <div className="mb-2 text-sm font-semibold text-[#1A4D2E]">
        ปริมาณปุ๋ยที่ต้องใช้ {basis}
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
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
              <p key={label} className={d < 0 ? "text-amber-600" : "text-sky-600"}>
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
  )
}
