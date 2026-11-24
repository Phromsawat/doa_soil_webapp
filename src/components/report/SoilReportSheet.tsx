import PrintActions from "@/components/report/PrintActions"
import A4Sheet from "@/components/report/A4Sheet"
import type { FertilizerPlan } from "@/lib/supabase/fertilizerPlan"
import type { SoilReportData } from "@/lib/report/soilReport"
import type { PlanTab } from "@/lib/fertilizer/chemicalPlan"
import { unitTh } from "@/lib/fertilizer/unit"
import { compareGrade } from "@/lib/fertilizer/blend"
import { classify, scoreFromLevels, LEVEL_LABEL_TH } from "@/lib/soil/grid"

// แผ่นรายงานผลวิเคราะห์ดิน — ใช้ทั้งผลที่บันทึกแล้ว (หน้า server) และผลของผู้ที่ไม่ได้ล็อกอิน (GuestReport)
// ไม่มี state ของตัวเอง ข้อมูลมาจาก buildSoilReport (lib/report/soilReport.ts)

const PLAN_TITLE: Record<PlanTab, string> = {
  chemical: "กรณีใช้ปุ๋ยเคมี",
  organic70: "กรณีใช้ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์",
}

// สีระดับตาม DESIGN.md — ต่ำ=แดง / ปานกลาง=เหลืองอ่อน / สูง=เขียว (ใช้กับแถบ)
const LEVEL_COLOR: Record<string, string> = {
  low: "#ff000d",
  medium: "#ffd188",
  high: "#16a34a",
}
// สีตัวอักษรระดับ — โทนเดียวกันแต่เข้มกว่า (เหลืองอ่อนบนพื้นขาวอ่านไม่ออกตอนพิมพ์)
const LEVEL_TEXT: Record<string, string> = {
  low: "#dc2626",
  medium: "#b45309",
  high: "#15803d",
}
const LEVEL_PCT: Record<string, number> = { low: 30, medium: 60, high: 90 }
// พื้น/ขอบของแถบความอุดมสมบูรณ์ — โทนอ่อนของสีระดับ
const FERT_TONE: Record<string, React.CSSProperties> = {
  low: { background: "#fef2f2", borderColor: "#fecaca" },
  medium: { background: "#fffbeb", borderColor: "#fde68a" },
  high: { background: "#ecfdf3", borderColor: "#bbf7d0" },
}

function thaiDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
  })
}

/**
 * แผนตามระยะแบบตารางไขว้: แถว = ระยะ, คอลัมน์ = สูตรปุ๋ย
 * สั้นกว่าแบบแถวละสูตร (10 แถว -> 4 แถว) รายงานจึงพอดี A4 หน้าเดียวโดยไม่ต้องย่อตัวอักษร
 * หน่วยต่างกันได้ในแผนเดียว (ปุ๋ยเคมีเป็นกรัม ปุ๋ยอินทรีย์เป็น กก.) — ถ้าต่างจะแสดงหน่วยรายคอลัมน์
 */
function pivotPlan(plan: FertilizerPlan) {
  const unitOf = new Map<string, string>()
  for (const s of plan.stages) for (const it of s.items) if (!unitOf.has(it.grade)) unitOf.set(it.grade, it.unit)
  const grades = [...unitOf.keys()].sort(compareGrade).map((grade) => ({ grade, unit: unitOf.get(grade)! }))
  const sameUnit = grades.every((g) => g.unit === grades[0]?.unit)
  return { grades, sameUnit, unit: grades[0]?.unit ?? plan.unit }
}

/**
 * หน้ารายงาน — ผลเดียว หรือหลายผล (รายงานรวม) ต่อกันผลละแผ่น A4
 * ปุ่มดาวน์โหลดถ่ายทุกแผ่นบนหน้าลงไฟล์ PDF เดียว
 */
export default function SoilReportSheet({
  data,
  ownerName,
  notice,
}: {
  data: SoilReportData | SoilReportData[]
  ownerName: string
  /** ข้อความแจ้งเหนือแผ่น (แสดงบนจอเท่านั้น ไม่ติดไปใน PDF) */
  notice?: React.ReactNode
}) {
  const reports = Array.isArray(data) ? data : [data]
  const first = reports[0]
  const pdfFilename =
    reports.length === 1
      ? `ผลวิเคราะห์ดิน-${first.cropName}-${first.record.created_at.slice(0, 10)}.pdf`
      : // วันที่ออกรายงานตามเวลาไทย (หน้านี้ render บนเซิร์ฟเวอร์ซึ่งเป็น UTC)
        `ผลวิเคราะห์ดิน-รวม-${reports.length}-รายการ-${new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })}.pdf`

  return (
    <div className="report-root font-thai">
      <PrintActions filename={pdfFilename} count={reports.length} />

      {notice && <p className="no-print mx-auto mb-3 max-w-[210mm] px-4 text-xs text-gray-500">{notice}</p>}

      {reports.map((r, i) => (
        <ReportPage key={i} data={r} ownerName={ownerName} />
      ))}
    </div>
  )
}

/** แผ่นรายงานของผลหนึ่งรายการ (A4 หนึ่งแผ่น) */
function ReportPage({ data, ownerName }: { data: SoilReportData; ownerName: string }) {
  const { record, cropName, calculation, note, plans } = data

  const area = [record.district, record.amphur, record.province].filter(Boolean).join(", ")
  const coords =
    record.latitude && record.longitude
      ? `${Number(record.latitude).toFixed(5)}, ${Number(record.longitude).toFixed(5)}`
      : null

  const nutrients = [
    { key: "om" as const, label: "อินทรียวัตถุ (OM)", value: record.om_value, unit: "%" },
    { key: "p" as const, label: "ฟอสฟอรัสที่เป็นประโยชน์ (P)", value: record.p_value, unit: "มก./กก." },
    { key: "k" as const, label: "โพแทสเซียมที่แลกเปลี่ยนได้ (K)", value: record.k_value, unit: "มก./กก." },
  ].map((n) => ({
    ...n,
    // ระดับตามช่วงของพืช (เหมือนหน้ากรอกค่า/หน้าผล) — ไม่มีก็ใช้เกณฑ์ทั่วไป
    level: n.value == null ? null : calculation?.levels?.[n.key] ?? classify(n.key, n.value),
  }))

  // ความอุดมสมบูรณ์ — คะแนนจากระดับที่แสดงด้านบน วิธีเดียวกับแผนที่ "ความอุดมสมบูรณ์รวม"
  // (ต่ำ 1 / ปานกลาง 2 / สูง 3 รวม 3–4 ต่ำ, 5–6 ปานกลาง, 7–9 สูง) — รายงานแสดงแค่ระดับ ค่าไม่ครบ = "-"
  const [om, p, k] = nutrients.map((n) => n.level)
  const fertScore = scoreFromLevels(om, p, k)
  const fertLevel = fertScore == null ? null : classify("sum", fertScore)

  return (
      // แผ่นรายงานขนาด A4 พอดี — ไฟล์ PDF ถ่ายจากแผ่นนี้ตรง ๆ จึงหน้าตาเหมือนที่เห็นบนจอ
      <A4Sheet>
        {/* soil-page: ท้ายกระดาษชิดล่างของหน้าเสมอ เนื้อหาสั้นก็ไม่ลอยกลางหน้า */}
        <div className="soil-page">
          {/* ---------- หัวรายงาน ---------- */}
          <header className="head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/site-logo" alt="" className="logo" />
            <div>
              <h1>ผลวิเคราะห์ดินและคำแนะนำการใช้ปุ๋ย</h1>
              <p className="sub">กรมวิชาการเกษตร</p>
            </div>
          </header>

          {/* ---------- ข้อมูลผู้ขอและตัวอย่าง ---------- */}
          <section className="meta">
            <div><span>ชื่อ</span><strong>{ownerName}</strong></div>
            <div><span>วันที่วิเคราะห์</span><strong>{thaiDate(record.created_at)}</strong></div>
            <div><span>พืชที่ปลูก</span><strong>{cropName}</strong></div>
            <div><span>พื้นที่เก็บตัวอย่าง</span><strong>{area || "-"}</strong></div>
            {coords && <div><span>พิกัด</span><strong>{coords}</strong></div>}
            {/* แสดงเสมอ — ไม่ได้กรอก pH ก็บอกไว้ ไม่ให้ดูเหมือนข้อมูลหาย */}
            <div><span>ความเป็นกรด-ด่าง (pH)</span><strong>{record.ph_value ?? "-"}</strong></div>
          </section>

          {/* ---------- ระดับธาตุอาหาร | ธาตุอาหารที่พืชต้องการ (วางคู่กันประหยัดพื้นที่) ---------- */}
          <div className={calculation ? "duo" : undefined}>
            <section>
              <h2 className="h2">ระดับธาตุอาหารในดิน</h2>
              <div className="levels">
                {nutrients.map((n) => {
                  const lv = n.level
                  return (
                    <div className="level" key={n.key}>
                      <div className="level-top">
                        <span className="level-label">{n.label}</span>
                        <span className="level-val">
                          {n.value ?? "–"} <em>{n.unit}</em>
                          {lv && <b style={{ color: LEVEL_TEXT[lv] }}>({LEVEL_LABEL_TH[lv]})</b>}
                        </span>
                      </div>
                      <div className="bar">
                        {lv && <i style={{ width: `${LEVEL_PCT[lv]}%`, background: LEVEL_COLOR[lv] }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {calculation && (
              <section>
                <h2 className="h2">
                  ปริมาณธาตุอาหารที่พืชต้องการ
                  <span className="h2-unit">{unitTh(calculation.unit)}</span>
                </h2>
                <div className="npk">
                  {[
                    ["N", "ไนโตรเจน", calculation.target_n],
                    ["P₂O₅", "ฟอสฟอรัส", calculation.target_p2o5],
                    ["K₂O", "โพแทสเซียม", calculation.target_k2o],
                  ].map(([sym, name, v]) => (
                    <div key={sym as string}>
                      <span>
                        <b>{sym as string}</b> {name as string}
                      </span>
                      <strong>{(v as number | null) ?? "–"}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ---------- ความอุดมสมบูรณ์ของดิน (เต็มความกว้าง ใต้ระดับธาตุอาหาร) — แสดงแค่ระดับ ไม่แสดงคะแนน ---------- */}
          <section className="fert" style={fertLevel ? FERT_TONE[fertLevel] : undefined}>
            <span>ความอุดมสมบูรณ์ของดิน</span>
            <strong style={{ color: fertLevel ? LEVEL_TEXT[fertLevel] : undefined }}>
              {fertLevel ? LEVEL_LABEL_TH[fertLevel] : "-"}
            </strong>
          </section>

          {/* ---------- แผนการใส่ปุ๋ยตามระยะ ---------- */}
          {plans.length > 0 && (
            <>
              <h2 className="h2">แผนการใส่ปุ๋ยตามระยะการเจริญเติบโต</h2>
              {plans.map((plan) => {
                const pv = pivotPlan(plan)
                return (
                  <div className="plan" key={plan.tab}>
                    <h3 className="h3">
                      {PLAN_TITLE[plan.tab]}
                      {pv.sameUnit && <span className="h3-unit">หน่วย: {pv.unit}</span>}
                    </h3>
                    {plan.note && <p className="plan-note">{plan.note}</p>}
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>ระยะ</th>
                          {pv.grades.map((g) => (
                            <th key={g.grade} className="num">
                              {g.grade}
                              {!pv.sameUnit && <small> ({g.unit})</small>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {plan.stages.map((s) => (
                          <tr key={s.stage}>
                            <td className="stage">{s.stage}</td>
                            {pv.grades.map((g) => {
                              const it = s.items.find((x) => x.grade === g.grade)
                              return (
                                <td key={g.grade} className="num">
                                  {it ? <strong>{it.amount.toLocaleString()}</strong> : <span className="dash">–</span>}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </>
          )}

          {/* ไม่พิมพ์ "ปริมาณปุ๋ยที่ต้องใช้" (ยอดรวมทั้งปีของปุ๋ยที่เลือก) — ตารางแผนตามระยะบอกปริมาณอยู่แล้ว
              ยังดูได้บนหน้าผล */}

          {/* ---------- หมายเหตุ ---------- */}
          {note && (
            <div className="note">
              <h3>หมายเหตุ</h3>
              {note.note.split("\n").filter(Boolean).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              {note.source && <p className="src">ที่มา: {note.source}</p>}
            </div>
          )}

          <footer className="foot">
            <span>ออกรายงานเมื่อ {thaiDate(new Date().toISOString())}</span>
            <span>DOA-Soil Test Kit</span>
          </footer>
        </div>
      </A4Sheet>
  )
}
