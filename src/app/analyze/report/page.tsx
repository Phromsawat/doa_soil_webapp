"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Printer, ArrowLeft } from "lucide-react"
import { getAnalysis } from "@/lib/supabase/analyses"
import { phAdvice } from "@/lib/soil/advice"
import { FERT_MODE_LABEL } from "@/lib/fertilizer/stagePlan"
import { fullAddress, REPORT_STORAGE_KEY, thaiDate, type ReportData } from "@/lib/report"
import StagePlanTable from "@/components/fertilizer/StagePlanTable"

const fmt = (v: number | null | undefined, d = 2) =>
  v == null ? "—" : v.toLocaleString("th-TH", { maximumFractionDigits: d })

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="print-section mt-6">
      <h2 className="mb-2 flex items-center gap-2 border-b-2 border-[#1A4D2E] pb-1 text-lg font-bold text-[#1A4D2E] print:border-black print:text-black">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A4D2E] text-sm text-white print:bg-black">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

const th = "border border-gray-400 bg-gray-100 px-3 py-2 text-left text-[15px] font-bold text-gray-900"
const td = "border border-gray-400 px-3 py-2 text-[15px] text-gray-900"

function Report({ r }: { r: ReportData }) {
  const ph = phAdvice(r.soil.ph)
  const address = fullAddress(r.farmer)
  const [massUnit, basis] = r.plan.unit.split("/")

  return (
    <article className="print-page mx-auto my-6 max-w-[210mm] bg-white px-8 py-8 shadow-lg ring-1 ring-gray-200">
      {/* หัวรายงาน — โลโก้ + ชื่อหน่วยงาน (ไม่มีชื่อชุดตรวจ) */}
      <div className="flex items-center gap-4 border-b border-gray-300 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/ตรากรมวิชาการเกษตร.svg" alt="กรมวิชาการเกษตร" className="h-20 w-20 object-contain" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold leading-tight text-gray-900">รายงานผลการวิเคราะห์ดินและคำแนะนำการใช้ปุ๋ย</h1>
          <p className="text-base text-gray-700">กรมวิชาการเกษตร กระทรวงเกษตรและสหกรณ์</p>
        </div>
        <div className="text-right text-sm text-gray-600">
          <p>วันที่ {thaiDate(r.created_at)}</p>
          {r.analysis_id && <p>เลขที่ {r.analysis_id.slice(0, 8).toUpperCase()}</p>}
        </div>
      </div>

      {/* 1. ข้อมูลเกษตรกร/พื้นที่ปลูก — merge คอลัมน์ให้ข้อมูลยาวอยู่แถวเดียว */}
      <Section n={1} title="ข้อมูลเกษตรกรและพื้นที่ปลูก">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <th className={`${th} w-[18%]`}>ชื่อ-นามสกุล</th>
              <td className={td}>{r.farmer.name || "—"}</td>
              <th className={`${th} w-[16%]`}>โทรศัพท์</th>
              <td className={td}>{r.farmer.phone || "—"}</td>
            </tr>
            <tr>
              <th className={th}>ที่อยู่</th>
              <td className={td} colSpan={3}>{address || "—"}</td>
            </tr>
            <tr>
              <th className={th}>ชื่อแปลง</th>
              <td className={td}>{r.farmer.plot || "—"}</td>
              <th className={th}>พิกัด</th>
              <td className={`${td} tabular-nums`}>{r.farmer.lat && r.farmer.lng ? `${r.farmer.lat}, ${r.farmer.lng}` : "—"}</td>
            </tr>
            <tr>
              <th className={th}>พืชที่ปลูก</th>
              <td className={td} colSpan={3}>
                <b>{r.crop.name}</b> <span className="text-gray-600">({r.crop.type})</span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* 2. ผลวิเคราะห์ดิน + pH + คำแนะนำ */}
      <Section n={2} title="ผลการวิเคราะห์ดิน">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>รายการ</th>
              <th className={`${th} text-right`}>ค่าที่วิเคราะห์ได้</th>
              <th className={th}>หน่วย</th>
              <th className={th}>ระดับ</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["อินทรียวัตถุ (OM)", r.soil.om, "%", r.levels.om],
              ["ฟอสฟอรัสที่เป็นประโยชน์ (P)", r.soil.p, "มก./กก.", r.levels.p],
              ["โพแทสเซียมที่แลกเปลี่ยนได้ (K)", r.soil.k, "มก./กก.", r.levels.k],
              ["ความเป็นกรด-ด่าง (pH)", r.soil.ph, "—", ph?.label ?? null],
            ].map(([label, v, unit, level]) => (
              <tr key={label as string}>
                <td className={td}>{label as string}</td>
                <td className={`${td} text-right font-bold tabular-nums`}>{fmt(v as number | null)}</td>
                <td className={td}>{unit as string}</td>
                <td className={`${td} font-semibold`}>{(level as string | null) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 rounded border border-gray-400 bg-gray-50 px-3 py-2 text-[15px]">
          <b>คำแนะนำค่า pH:</b>{" "}
          {ph ? `ดิน${ph.label} — ${ph.advice}` : "ไม่ได้ระบุค่า pH (ควรตรวจวัดเพื่อประเมินความจำเป็นในการปรับปรุงดิน)"}
        </div>
      </Section>

      {/* 3. ธาตุอาหารที่พืชต้องการ */}
      <Section n={3} title="ปริมาณธาตุอาหารที่พืชต้องการ">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} text-center`}>ไนโตรเจน (N)</th>
              <th className={`${th} text-center`}>ฟอสฟอรัส (P₂O₅)</th>
              <th className={`${th} text-center`}>โพแทสเซียม (K₂O)</th>
              <th className={`${th} text-center`}>หน่วย</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`${td} text-center text-xl font-bold tabular-nums`}>{fmt(r.need.n, 1)}</td>
              <td className={`${td} text-center text-xl font-bold tabular-nums`}>{fmt(r.need.p2o5, 1)}</td>
              <td className={`${td} text-center text-xl font-bold tabular-nums`}>{fmt(r.need.k2o, 1)}</td>
              <td className={`${td} text-center`}>{r.needUnit}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* 4. ปริมาณปุ๋ยที่ต้องใช้ (ตารางรายระยะ, merge คอลัมน์ระยะ) */}
      <Section n={4} title="ปริมาณปุ๋ยที่ต้องใช้">
        <p className="mb-2 text-[15px] text-gray-800">
          รูปแบบ: <b>{FERT_MODE_LABEL[r.mode]}</b> · สูตรปุ๋ย: <b>{r.plan.formulas.map((f) => f.grade ?? f.name).join(" + ")}</b>
          {r.mode === "organic" && r.plan.organic && (
            <>
              {" "}· ปุ๋ยอินทรีย์: <b>{r.plan.organic.name}</b> (N {r.plan.organic.n}%)
            </>
          )}
        </p>
        <StagePlanTable plan={r.plan} printMode />
        <p className="mt-1 text-sm text-gray-600">
          หน่วยปุ๋ยเคมี: {massUnit}
          {basis ? ` ต่อ ${basis}` : ""}
          {r.mode === "organic" ? " · ปุ๋ยอินทรีย์: กิโลกรัม" + (basis ? ` ต่อ ${basis}` : "") : ""}
        </p>
      </Section>

      {/* 5. หมายเหตุ */}
      <Section n={5} title="หมายเหตุ">
        <ul className="list-disc space-y-1 pl-6 text-[15px] text-gray-800">
          <li>ปริมาณปุ๋ยคำนวณตามคำแนะนำการใช้ปุ๋ยตามค่าวิเคราะห์ดินของกรมวิชาการเกษตร</li>
          <li>ควรใส่ปุ๋ยเมื่อดินมีความชื้น และกลบหรือพรวนดินหลังใส่ปุ๋ยเพื่อลดการสูญเสีย</li>
          {r.mode === "organic" && <li>ปริมาณปุ๋ยอินทรีย์คำนวณจาก %N ของปุ๋ยอินทรีย์ที่ใช้ หากมีผลวิเคราะห์ปุ๋ยอินทรีย์ควรใช้ค่าจริง</li>}
          <li>ควรตรวจวิเคราะห์ดินซ้ำทุก 1–2 ปี เพื่อปรับการใช้ปุ๋ยให้เหมาะสม</li>
        </ul>
      </Section>
    </article>
  )
}

function ReportContent() {
  const params = useSearchParams()
  const id = params.get("id")
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        if (id) {
          const rec = await getAnalysis(id)
          const saved = rec?.analysis_results?.[0]?.fertilizer_plan as ReportData | null | undefined
          if (saved?.plan) {
            setReport({ ...saved, analysis_id: id })
            return
          }
        }
        const raw = sessionStorage.getItem(REPORT_STORAGE_KEY)
        if (raw) setReport(JSON.parse(raw))
        else setError(id ? "รายการนี้ยังไม่มีข้อมูลรายงาน (บันทึกก่อนมีฟีเจอร์รายงาน)" : "ไม่พบข้อมูลรายงาน — กลับไปคำนวณปุ๋ยก่อน")
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center pt-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A4D2E]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24 font-thai print:bg-white print:pb-0">
      <div className="no-print sticky top-11 z-30 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur lg:top-16">
        <button onClick={() => (window.history.length > 1 ? window.history.back() : window.close())} className="flex items-center gap-1 text-[15px] text-gray-600 hover:text-[#1A4D2E]">
          <ArrowLeft className="h-4 w-4" /> กลับ
        </button>
        <p className="hidden text-[15px] font-semibold text-gray-800 sm:block">ตัวอย่างก่อนพิมพ์ (A4)</p>
        <button
          onClick={() => window.print()}
          disabled={!report}
          className="flex items-center gap-2 rounded-full bg-[#1A4D2E] px-5 h-10 text-[15px] font-bold text-white hover:bg-[#143a22] disabled:opacity-50"
        >
          <Printer className="h-4 w-4" /> พิมพ์ / บันทึก PDF
        </button>
      </div>
      {error && <p className="mx-auto mt-8 max-w-md rounded-xl bg-red-50 p-4 text-center text-red-700">{error}</p>}
      {report && <Report r={report} />}
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportContent />
    </Suspense>
  )
}
