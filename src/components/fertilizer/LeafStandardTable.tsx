"use client"

import { getLeafStandard } from "@/lib/soil/leafStandards"

/**
 * ตาราง "ค่ามาตรฐานความเข้มข้นของธาตุอาหาร" ของพืชที่เลือก (ขั้นที่ 2 ในฟอร์ม)
 * เป็นตารางอ้างอิงล้วน ๆ ไว้เทียบกับผลวิเคราะห์ใบ — ไม่เกี่ยวกับการคำนวณปุ๋ย
 * ยังไม่เลือกพืช / พืชนี้ไม่มีตารางในเอกสาร -> ขึ้นขีด -
 */
export default function LeafStandardTable({ cropName }: { cropName: string }) {
  const std = cropName ? getLeafStandard(cropName) : null
  if (!std) {
    return (
      <p className="rounded-xl border border-gray-100 bg-gray-50 py-6 text-center text-sm text-gray-400">
        -
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="bg-[#F1F7F2] px-4 py-2">
        <p className="text-sm font-semibold text-[#1A4D2E]">{std.title}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70 text-left">
              <th className="px-4 py-2 font-medium text-gray-600">ธาตุอาหาร</th>
              {std.columns.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {std.rows.map((r) => (
              <tr key={r.nutrient}>
                <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{r.nutrient}</td>
                {r.values.map((v, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 text-right whitespace-nowrap ${
                      i === 0 ? "font-semibold text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
