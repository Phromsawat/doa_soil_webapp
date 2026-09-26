import { notFound } from "next/navigation"
import PrintActions from "./PrintActions"
import { getAnalysis } from "@/lib/supabase/analyses"
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
import type { ReportData } from "@/lib/pdf/reportPdf"

export const dynamic = "force-dynamic"

const PLAN_TITLE: Record<PlanTab, string> = {
  chemical: "กรณีใช้ปุ๋ยเคมี",
  organic70: "กรณีใช้ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์",
}

// สีระดับตาม DESIGN.md — ต่ำ=แดง / ปานกลาง=เหลืองอ่อน / สูง=เขียว
const LEVEL_COLOR: Record<string, string> = {
  low: "#ff000d",
  medium: "#ffd188",
  high: "#16a34a",
}
const LEVEL_PCT: Record<string, number> = { low: 30, medium: 60, high: 90 }

function thaiDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
  })
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
  const [crops, calculation, note, formulas] = await Promise.all([
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
  const plans = PLAN_TABS.filter((t) => (!selectedTab || t === selectedTab) && tabPlan[t]).map(
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
  const area = [record.district, record.amphur, record.province].filter(Boolean).join(" ")
  const coords =
    record.latitude && record.longitude
      ? `${Number(record.latitude).toFixed(5)}, ${Number(record.longitude).toFixed(5)}`
      : null

  const nutrients = [
    { key: "om" as const, label: "อินทรียวัตถุ (OM)", value: record.om_value, unit: "%" },
    { key: "p" as const, label: "ฟอสฟอรัสที่เป็นประโยชน์ (P)", value: record.p_value, unit: "มก./กก." },
    { key: "k" as const, label: "โพแทสเซียมที่แลกเปลี่ยนได้ (K)", value: record.k_value, unit: "มก./กก." },
  ]

  const inputModeText =
    record.input_mode === "image_upload" ? "วิเคราะห์จากรูปแผ่นทดสอบ" : "กรอกค่าเอง"

  // ข้อมูลชุดเดียวกับที่แสดงบนจอ ส่งให้ปุ่มดาวน์โหลดเอาไปสร้างไฟล์ PDF
  const pdfData: ReportData = {
    cropName,
    dateText: thaiDate(record.created_at),
    area,
    coords,
    inputModeText,
    ph: record.ph_value ?? null,
    nutrients: nutrients.map((n) => {
      const lv = classify(n.key, n.value)
      return {
        label: n.label,
        value: n.value,
        unit: n.unit,
        levelText: lv ? LEVEL_LABEL_TH[lv] : null,
        levelColor: lv ? LEVEL_COLOR[lv] : null,
        levelPct: lv ? LEVEL_PCT[lv] : null,
      }
    }),
    target: calculation
      ? {
          n: calculation.target_n,
          p2o5: calculation.target_p2o5,
          k2o: calculation.target_k2o,
          unit: unitTh(calculation.unit),
        }
      : null,
    plans: plans.map((plan) => ({
      title: PLAN_TITLE[plan.tab],
      note: plan.note,
      unit: plan.unit,
      rows: plan.stages.flatMap((s) =>
        s.items.map((it) => ({ stage: s.stage, grade: it.grade, amount: it.amount }))
      ),
    })),
    blend: blend
      ? {
          unitText: `${mass}${basis ? ` ${basis}` : ""}`,
          rows: [...blend.items]
            .sort((a, b) =>
              compareGrade(a.formula.grade ?? a.formula.name, b.formula.grade ?? b.formula.name)
            )
            .map((it) => ({
              name: `${it.formula.name}${it.formula.grade ? ` (${it.formula.grade})` : ""}`,
              amount: it.kg,
            })),
        }
      : null,
    note: note ? { lines: note.note.split("\n").filter(Boolean), source: note.source ?? null } : null,
  }

  const pdfFilename = `ผลวิเคราะห์ดิน-${cropName}-${record.created_at.slice(0, 10)}.pdf`

  return (
    <div className="report-root font-thai">
      <PrintActions data={pdfData} filename={pdfFilename} />

      <div className="sheet">
        {/* ---------- หัวรายงาน ---------- */}
        <header className="head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/doa-logo.svg" alt="" className="logo" />
          <div>
            <h1>ผลวิเคราะห์ดินและคำแนะนำการใช้ปุ๋ย</h1>
            <p className="sub">DOA-Soil Test Kit · กรมวิชาการเกษตร</p>
          </div>
        </header>

        {/* ---------- ข้อมูลตัวอย่าง ---------- */}
        <section className="meta">
          <div><span>พืชที่ปลูก</span><strong>{cropName}</strong></div>
          <div><span>วันที่วิเคราะห์</span><strong>{thaiDate(record.created_at)}</strong></div>
          <div><span>พื้นที่เก็บตัวอย่าง</span><strong>{area || "ไม่ระบุ"}</strong></div>
          <div>
            <span>วิธีได้มา</span>
            <strong>{record.input_mode === "image_upload" ? "วิเคราะห์จากรูปแผ่นทดสอบ" : "กรอกค่าเอง"}</strong>
          </div>
          {coords && <div><span>พิกัด</span><strong>{coords}</strong></div>}
          {record.ph_value != null && <div><span>ความเป็นกรด-ด่าง (pH)</span><strong>{record.ph_value}</strong></div>}
        </section>

        {/* ---------- ระดับธาตุอาหาร ---------- */}
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
                    {lv && <b style={{ color: LEVEL_COLOR[lv] }}>({LEVEL_LABEL_TH[lv]})</b>}
                  </span>
                </div>
                <div className="bar">
                  {lv && <i style={{ width: `${LEVEL_PCT[lv]}%`, background: LEVEL_COLOR[lv] }} />}
                </div>
              </div>
            )
          })}
        </div>

        {/* ---------- ธาตุอาหารที่พืชต้องการ ---------- */}
        {calculation && (
          <>
            <h2 className="h2">ปริมาณธาตุอาหารที่พืชต้องการ</h2>
            <div className="npk">
              {[
                ["N (ไนโตรเจน)", calculation.target_n],
                ["P₂O₅ (ฟอสฟอรัส)", calculation.target_p2o5],
                ["K₂O (โพแทสเซียม)", calculation.target_k2o],
              ].map(([label, v]) => (
                <div key={label as string}>
                  <span>{label as string}</span>
                  <strong>{(v as number | null) ?? "–"}</strong>
                </div>
              ))}
            </div>
            <p className="unit-note">หน่วย: {unitTh(calculation.unit)}</p>
          </>
        )}

        {/* ---------- แผนการใส่ปุ๋ยตามระยะ ---------- */}
        {plans.length > 0 && (
          <>
            <h2 className="h2">แผนการใส่ปุ๋ยตามระยะการเจริญเติบโต</h2>
            {plans.map((plan) => (
              <div className="plan" key={plan.tab}>
                <h3 className="h3">{PLAN_TITLE[plan.tab]}</h3>
                {plan.note && <p className="plan-note">{plan.note}</p>}
                <table className="tbl">
                  <thead>
                    <tr><th>ระยะ</th><th>สูตรปุ๋ย</th><th className="right">ปริมาณ ({plan.unit})</th></tr>
                  </thead>
                  <tbody>
                    {plan.stages.map((s) =>
                      s.items.map((it, i) => (
                        <tr key={`${s.stage}-${it.grade}`}>
                          {i === 0 && <td rowSpan={s.items.length} className="stage">{s.stage}</td>}
                          <td>{it.grade}</td>
                          <td className="right"><strong>{it.amount.toLocaleString()}</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}

        {/* ---------- ปริมาณปุ๋ยที่ต้องใช้ (วางหลังตารางแผน) ---------- */}
        {blend && (
          <>
            <h2 className="h2">ปริมาณปุ๋ยที่ต้องใช้ (จากสูตรที่เลือก)</h2>
            <table className="tbl">
              <thead>
                <tr>
                  <th>สูตรปุ๋ย</th>
                  <th className="right">ปริมาณ ({mass}{basis ? ` ${basis}` : ""})</th>
                </tr>
              </thead>
              <tbody>
                {[...blend.items]
                  .sort((a, b) =>
                    compareGrade(
                      a.formula.grade ?? a.formula.name,
                      b.formula.grade ?? b.formula.name
                    )
                  )
                  .map((it) => (
                    <tr key={it.formula.id}>
                      <td>
                        {it.formula.name}
                        {it.formula.grade ? ` (${it.formula.grade})` : ""}
                      </td>
                      <td className="right">
                        <strong>{Math.ceil(it.kg).toLocaleString()}</strong>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
      </div>
    </div>
  )
}
