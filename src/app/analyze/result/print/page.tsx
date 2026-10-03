import Link from "next/link"
import { notFound } from "next/navigation"
import PrintActions from "./PrintActions"
import A4Sheet from "./A4Sheet"
import { getAnalysis } from "@/lib/supabase/analyses"
import { getMyProfile } from "@/lib/supabase/profile"
import { listCrops, calculateFertilizer } from "@/lib/supabase/fertilizer"
import {
  getFertilizerPlan,
  getCropStageSplit,
  getCropNote,
  type UseType,
  type FertilizerPlan,
} from "@/lib/supabase/fertilizerPlan"
import { chooseChemicalPlan, missingGradesNote, parsePlanTab, PLAN_TABS, type PlanTab } from "@/lib/fertilizer/chemicalPlan"
import { unitTh } from "@/lib/fertilizer/unit"
import { listFertilizerFormulas } from "@/lib/supabase/fertilizerFormulas"
import { blendFertilizer, compareGrade, type Formula } from "@/lib/fertilizer/blend"
import { classify, LEVEL_LABEL_TH } from "@/lib/soil/grid"

export const dynamic = "force-dynamic"

const SHEET_ID = "report-sheet"

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

/** แปลงหน่วยของ target ("g/tree/year", "kg/rai") เป็นคำไทย — เกณฑ์เดียวกับ BlendResultCard */
function unitParts(unit: string) {
  const mass = unit.toLowerCase().startsWith("kg") ? "กก." : "กรัม"
  const basis = /rai|ไร่/i.test(unit) ? "ต่อไร่" : /tree|ต้น/i.test(unit) ? "ต่อต้น" : ""
  return { mass, basis }
}

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; use?: string }>
}) {
  const { id, use } = await searchParams
  if (!id) notFound()

  // แถบที่ผู้ใช้เลือกอยู่บนหน้าผล — รายงานจะพิมพ์เฉพาะแถบนี้
  // ไม่ได้ส่งมา (เช่นเปิดลิงก์ตรง ๆ) = พิมพ์ทุกแถบที่มีข้อมูล
  const selectedTab = parsePlanTab(use)

  const record = await getAnalysis(id).catch(() => null)
  if (!record) notFound()

  const cropId: string | null = record.crop_id
  const [crops, calculation, note, formulas, profile] = await Promise.all([
    listCrops().catch(() => []),
    cropId
      ? calculateFertilizer({
          crop_id: cropId,
          om_value: record.om_value,
          p_value: record.p_value,
          k_value: record.k_value,
        }).catch(() => null)
      : Promise.resolve(null),
    cropId ? getCropNote(cropId).catch(() => null) : Promise.resolve(null),
    listFertilizerFormulas().catch(() => []),
    getMyProfile().catch(() => null),
  ])
  const splitRows = cropId ? await getCropStageSplit(cropId).catch(() => []) : []

  // ปุ๋ยที่ผู้ใช้เลือกไว้ + ปริมาณที่ต้องใช้ (ต้องคำนวณก่อน เพราะแถบ "ปุ๋ยเคมี"
  // ใช้สูตรที่เลือกตัดสินว่าจะยึดตารางไหน และไม้ผลอาจต้องแบ่งจากค่านี้ตามระยะ)
  const pickedIds: string[] = (record.blend_formula_ids ?? []).filter(Boolean)
  const picked: Formula[] = pickedIds
    .map((fid) => formulas.find((f) => f.id === fid))
    .filter((f): f is (typeof formulas)[number] => !!f)
    .map((f) => ({
      id: f.id, name: f.name, grade: f.grade,
      n: f.n_percent, p2o5: f.p2o5_percent, k2o: f.k2o_percent,
    }))
  const target = {
    n: calculation?.target_n ?? 0,
    p2o5: calculation?.target_p2o5 ?? 0,
    k2o: calculation?.target_k2o ?? 0,
  }
  const blend =
    picked.length > 0 && (target.n > 0 || target.p2o5 > 0 || target.k2o > 0)
      ? blendFertilizer(target, picked)
      : null

  const { mass, basis } = unitParts(calculation?.unit ?? "")

  // ตารางตายตัวตามค่าดินทั้ง 3 ชนิด แล้วเลือกแบบเดียวกับหน้าจอ (chooseChemicalPlan)
  const getPlan = (use_type: UseType) =>
    cropId
      ? getFertilizerPlan({
          crop_id: cropId,
          om: record.om_value,
          p: record.p_value,
          k: record.k_value,
          use_type,
        }).catch(() => null)
      : Promise.resolve(null)
  const [straightPlan, compoundPlan, organicPlan] = await Promise.all([
    getPlan("straight"),
    getPlan("compound"),
    getPlan("organic70"),
  ])
  const chemical = chooseChemicalPlan({
    straight: straightPlan,
    compound: compoundPlan,
    splitRows,
    blend,
    pickedGrades: picked.map((f) => f.grade ?? ""),
    massUnit: mass,
  })

  // พิมพ์เฉพาะแถบที่เลือกมา และเฉพาะที่มีข้อมูลจริง
  // (ไม่พิมพ์ตารางเปล่าที่เต็มไปด้วย "-" เหมือนรายงานแบบเดิม)
  const tabPlan: Record<PlanTab, FertilizerPlan | null> = {
    chemical: chemical?.plan ?? null,
    organic70: organicPlan && organicPlan.stages.length > 0 ? organicPlan : null,
  }
  const wanted = PLAN_TABS.filter((t) => (!selectedTab || t === selectedTab) && tabPlan[t])
  const plans = (wanted.length > 0 ? wanted : PLAN_TABS.filter((t) => tabPlan[t])).map(
    (t) => ({
      tab: t,
      ...(tabPlan[t] as FertilizerPlan),
      note:
        t === "chemical" && chemical && chemical.missingGrades.length > 0
          ? missingGradesNote(chemical.missingGrades)
          : null,
    })
  )

  const cropName = crops.find((c) => c.id === cropId)?.name ?? "ไม่ระบุ"
  const area = [record.district, record.amphur, record.province].filter(Boolean).join(", ")
  const coords =
    record.latitude && record.longitude
      ? `${Number(record.latitude).toFixed(5)}, ${Number(record.longitude).toFixed(5)}`
      : null

  // ชื่อเจ้าของผล — getAnalysis คืนเฉพาะผลของผู้ที่ล็อกอินอยู่ จึงใช้โปรไฟล์ของตัวเอง
  // ยังไม่ได้ตั้งชื่อ-นามสกุลในโปรไฟล์ -> ใช้ชื่อเล่น แล้วอีเมล (ระบุตัวเจ้าของได้ดีกว่า "ไม่ระบุ")
  const hasFullName = !!profile?.full_name?.trim()
  const ownerName = profile?.full_name?.trim() || profile?.nickname?.trim() || profile?.email || "ไม่ระบุ"

  const nutrients = [
    { key: "om" as const, label: "อินทรียวัตถุ (OM)", value: record.om_value, unit: "%" },
    { key: "p" as const, label: "ฟอสฟอรัสที่เป็นประโยชน์ (P)", value: record.p_value, unit: "มก./กก." },
    { key: "k" as const, label: "โพแทสเซียมที่แลกเปลี่ยนได้ (K)", value: record.k_value, unit: "มก./กก." },
  ]

  const pdfFilename = `ผลวิเคราะห์ดิน-${cropName}-${record.created_at.slice(0, 10)}.pdf`

  return (
    <div className="report-root font-thai">
      <PrintActions sheetId={SHEET_ID} filename={pdfFilename} />

      {/* แจ้งเฉพาะบนจอ (อยู่นอกแผ่น ไม่ติดไปใน PDF) */}
      {!hasFullName && (
        <p className="no-print mx-auto mb-3 max-w-[210mm] px-4 text-xs text-gray-500">
          รายงานยังไม่มีชื่อ-นามสกุล ·{" "}
          <Link href="/profile" className="font-medium text-[#1A4D2E] underline">
            ใส่ชื่อในหน้าโปรไฟล์
          </Link>{" "}
          แล้วเปิดรายงานใหม่
        </p>
      )}

      {/* แผ่นรายงานขนาด A4 พอดี — ไฟล์ PDF ถ่ายจากแผ่นนี้ตรง ๆ จึงหน้าตาเหมือนที่เห็นบนจอ */}
      <A4Sheet id={SHEET_ID}>
        {/* ---------- หัวรายงาน ---------- */}
        <header className="head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/doa-logo.svg" alt="" className="logo" />
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
          <div><span>พื้นที่เก็บตัวอย่าง</span><strong>{area || "ไม่ระบุ"}</strong></div>
          {coords && <div><span>พิกัด</span><strong>{coords}</strong></div>}
          {record.ph_value != null && <div><span>ความเป็นกรด-ด่าง (pH)</span><strong>{record.ph_value}</strong></div>}
        </section>

        {/* ---------- ระดับธาตุอาหาร | ธาตุอาหารที่พืชต้องการ (วางคู่กันประหยัดพื้นที่) ---------- */}
        <div className={calculation ? "duo" : undefined}>
          <section>
            <h2 className="h2">ระดับธาตุอาหารในดิน</h2>
            <div className="levels">
              {nutrients.map((n) => {
                const lv = classify(n.key, n.value)
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

        {/* ---------- ปริมาณปุ๋ยที่ต้องใช้ (วางหลังตารางแผน) ---------- */}
        {blend && (
          <>
            <h2 className="h2">ปริมาณปุ๋ยที่ต้องใช้</h2>
            {/* การ์ดเรียงแนวนอน (1–3 สูตร) — เตี้ยกว่าตาราง */}
            <div className="blend" style={{ gridTemplateColumns: `repeat(${blend.items.length}, minmax(0, 1fr))` }}>
              {[...blend.items]
                .sort((a, b) =>
                  compareGrade(a.formula.grade ?? a.formula.name, b.formula.grade ?? b.formula.name)
                )
                .map((it) => (
                  <div key={it.formula.id}>
                    <span>
                      {it.formula.name}
                      {/* สูตรห้ามตัดกลางบรรทัด (ขีดใน 18-46-0 เป็นจุดตัดคำของเบราว์เซอร์) */}
                      {it.formula.grade && !it.formula.name.includes(it.formula.grade) && (
                        <span className="grade"> ({it.formula.grade})</span>
                      )}
                    </span>
                    <strong>
                      {Math.ceil(it.kg).toLocaleString()} <em>{mass}{basis ? ` ${basis}` : ""}</em>
                    </strong>
                  </div>
                ))}
            </div>
          </>
        )}

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
      </A4Sheet>
    </div>
  )
}
