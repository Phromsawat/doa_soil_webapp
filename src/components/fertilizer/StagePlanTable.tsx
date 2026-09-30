import type { StagePlanResult } from "@/lib/fertilizer/stagePlan"

// ตารางปริมาณปุ๋ยรายระยะ — ใช้ทั้งหน้าคำนวณและหน้าพิมพ์รายงาน
// คอลัมน์ "ระยะ" merge (rowSpan) ตามจำนวนปุ๋ยในระยะนั้น ให้อ่านเป็นกลุ่มชัดเจน

const fmt = (v: number) => v.toLocaleString("th-TH", { maximumFractionDigits: 1 })
// ชื่อเสริมหลังสูตร เช่น "46-0-0 (ยูเรีย)" — ไม่แสดงถ้าชื่อซ้ำกับสูตร เช่น "ปุ๋ยเคมี 15-15-15"
const subName = (grade: string, name: string) => (name === grade || name.includes(grade) ? undefined : name)
const organicLabel = (name: string) =>
  name.startsWith("ปุ๋ยอินทรีย์") ? { label: name, sub: undefined } : { label: "ปุ๋ยอินทรีย์", sub: name }

export default function StagePlanTable({
  plan,
  printMode = false,
}: {
  plan: StagePlanResult
  printMode?: boolean
}) {
  const [massUnit, basis] = plan.unit.split("/") // "กรัม/ต้น" -> ["กรัม", "ต้น"]
  const perBasis = basis ? `/${basis}` : ""
  const organic = plan.mode === "organic" && plan.organic

  const th = printMode
    ? "border border-gray-500 bg-gray-200 px-3 py-2 text-left text-[15px] font-bold text-black"
    : "border border-[#1A4D2E]/20 bg-[#1A4D2E] px-3 py-2.5 text-left text-[15px] font-bold text-white"
  const td = printMode
    ? "border border-gray-500 px-3 py-1.5 text-[15px] text-black"
    : "border border-gray-200 px-3 py-2 text-[15px] text-gray-800"
  const stageTd = printMode
    ? "border border-gray-500 bg-gray-50 px-3 py-1.5 align-middle text-[15px] font-bold text-black"
    : "border border-gray-200 bg-[#F1F7F2] px-3 py-2 align-middle text-[15px] font-bold text-[#1A4D2E]"

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-[38%]`}>ระยะการใส่ปุ๋ย</th>
            <th className={th}>ชนิดปุ๋ย / สูตร</th>
            <th className={`${th} text-right`}>
              ปริมาณ ({massUnit}
              {perBasis})
            </th>
          </tr>
        </thead>
        <tbody>
          {plan.stages.map((s) => {
            const rows: { label: string; sub?: string; amount: string }[] = s.items.map((it) => ({
              label: it.grade,
              sub: subName(it.grade, it.name),
              amount: fmt(it.amount),
            }))
            if (organic && s.organicKg != null && s.organicKg > 0) {
              rows.push({
                ...organicLabel(plan.organic!.name),
                amount: `${fmt(s.organicKg)} กก.${perBasis}`,
              })
            }
            for (const n of s.notes) rows.push({ label: n, amount: "—" })
            if (rows.length === 0) rows.push({ label: "ไม่ต้องใส่ปุ๋ยในระยะนี้", amount: "—" })

            return rows.map((r, i) => (
              <tr key={`${s.stage}-${i}`} className={printMode ? "break-inside-avoid" : ""}>
                {i === 0 && (
                  <td rowSpan={rows.length} className={stageTd}>
                    {s.stage}
                  </td>
                )}
                <td className={td}>
                  <span className="font-semibold">{r.label}</span>
                  {r.sub && <span className={printMode ? "text-gray-700" : "text-gray-500"}> ({r.sub})</span>}
                </td>
                <td className={`${td} text-right font-bold tabular-nums`}>{r.amount}</td>
              </tr>
            ))
          })}
        </tbody>
        <tfoot>
          {plan.total.map((t, i) => (
            <tr key={t.grade}>
              {i === 0 && (
                <td
                  rowSpan={plan.total.length + (organic && plan.organicTotalKg ? 1 : 0)}
                  className={printMode ? `${stageTd} bg-gray-200` : `${stageTd} bg-[#E3EFE6]`}
                >
                  รวมทั้งหมด
                </td>
              )}
              <td className={`${td} font-semibold`}>
                {t.grade}
                {subName(t.grade, t.name) && <span className="font-normal text-gray-500"> ({t.name})</span>}
              </td>
              <td className={`${td} text-right font-bold tabular-nums`}>{fmt(t.amount)}</td>
            </tr>
          ))}
          {organic && plan.organicTotalKg ? (
            <tr>
              {plan.total.length === 0 && <td className={stageTd}>รวมทั้งหมด</td>}
              <td className={`${td} font-semibold`}>
                {organicLabel(plan.organic!.name).label}
                {organicLabel(plan.organic!.name).sub && (
                  <span className="font-normal text-gray-500"> ({organicLabel(plan.organic!.name).sub})</span>
                )}
              </td>
              <td className={`${td} text-right font-bold tabular-nums`}>
                {fmt(plan.organicTotalKg)} กก.{perBasis}
              </td>
            </tr>
          ) : null}
        </tfoot>
      </table>
    </div>
  )
}
