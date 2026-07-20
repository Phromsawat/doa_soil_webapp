"use client"

import {
  getFruitStages,
  STAGE_ORDER,
  STAGE_LABEL,
} from "@/lib/fertilizer/fruitStages"

/**
 * ตารางแบ่งใส่ปุ๋ยตามระยะการเจริญเติบโต (เฉพาะไม้ผล 9 ชนิดที่มีตารางของกรมฯ)
 * ไม่แสดงอะไรเลยถ้าพืชไม่มีตาราง หรือค่าดินไม่ครบ
 */
export default function FruitStageTable({
  cropName,
  om,
  p,
  k,
}: {
  cropName: string | null | undefined
  om: number | null
  p: number | null
  k: number | null
}) {
  const data = getFruitStages(cropName, om, p, k)
  if (!data) return null

  const cols = [
    { key: "urea" as const, label: "ยูเรีย", grade: "46-0-0" },
    { key: "dap" as const, label: "DAP", grade: "18-46-0" },
    { key: "kcl" as const, label: "KCl", grade: "0-0-60" },
  ]

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <h3 className="mb-2 text-sm font-semibold text-gray-800">
        แบ่งใส่ตามระยะการเจริญเติบโต
      </h3>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[26rem] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ระยะ</th>
              {cols.map((c) => (
                <th key={c.key} className="px-3 py-2 text-right font-medium">
                  {c.label}
                  <span className="block text-[10px] font-normal text-gray-400">
                    {c.grade}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAGE_ORDER.map((s) => (
              <tr key={s} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-700">{STAGE_LABEL[s]}</td>
                {cols.map((c) => (
                  <td
                    key={c.key}
                    className="px-3 py-2 text-right tabular-nums text-gray-800"
                  >
                    {data.stages[s][c.key].toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 bg-[#F1F7F2] font-semibold">
              <td className="px-3 py-2 text-[#1A4D2E]">รวมทั้งปี</td>
              {cols.map((c) => (
                <td
                  key={c.key}
                  className="px-3 py-2 text-right tabular-nums text-[#1A4D2E]"
                >
                  {data.total[c.key].toLocaleString()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">หน่วย: กรัมต่อต้น</p>
    </div>
  )
}
