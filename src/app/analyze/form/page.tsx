"use client"

import { useEffect, useState } from "react"
import { Loader2, Sprout, Check, History, Calculator } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { saveManualAnalysis } from "@/lib/supabase/analyses"
import {
  calculateFertilizer,
  calculateAndSave,
  listCrops,
  type CropOption,
  type FertilizerResult,
} from "@/lib/supabase/fertilizer"
import {
  listFertilizerFormulas,
  type FertilizerFormulaRow,
} from "@/lib/supabase/fertilizerFormulas"
import { ensureSession } from "@/lib/supabase/auth"
import { useUser } from "@/lib/supabase/useUser"
import { classify, LEVEL_COLORS, LEVEL_LABEL_TH } from "@/lib/soil/grid"
import { blendFertilizer, type BlendResult } from "@/lib/fertilizer/blend"
import CropPicker from "@/components/fertilizer/CropPicker"
import FertilizerPicker from "@/components/fertilizer/FertilizerPicker"
import BlendResultCard from "@/components/fertilizer/BlendResultCard"
import FertilizerPlanTable from "@/components/fertilizer/FertilizerPlanTable"

/** ช่องกรอกตัวเลข + ป้ายระดับ (ต่ำ/ปานกลาง/สูง) */
function NutrientInput({
  label,
  unit,
  value,
  onChange,
  level,
  placeholder,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  level?: ReturnType<typeof classify>
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">
        {label} <span className="text-gray-400">— {unit}</span>
      </label>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm focus:border-[#1A4D2E] focus:bg-white focus:outline-none"
      />
      {level && (
        <span
          className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-gray-800"
          style={{ background: LEVEL_COLORS[level] }}
        >
          {LEVEL_LABEL_TH[level]}
        </span>
      )}
    </div>
  )
}

function StepHeader({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1A4D2E] text-xs font-bold text-white">
        {n}
      </span>
      <div>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  )
}

export default function AnalyzeForm() {
  const [crops, setCrops] = useState<CropOption[]>([])
  const [cropsLoading, setCropsLoading] = useState(true)

  const [cropId, setCropId] = useState("")
  const [om, setOm] = useState("")
  const [p, setP] = useState("")
  const [k, setK] = useState("")
  const [ph, setPh] = useState("") // เก็บลง DB เฉยๆ ยังไม่นำมาคำนวณ

  const [formulas, setFormulas] = useState<FertilizerFormulaRow[]>([])
  const [formulasLoading, setFormulasLoading] = useState(true)
  const [picked, setPicked] = useState<string[]>([""]) // สูตรปุ๋ยที่เลือก (สูงสุด 3)

  const [calc, setCalc] = useState<FertilizerResult | null>(null)
  const [blendResult, setBlendResult] = useState<BlendResult | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // บันทึกได้เฉพาะคน login จริง (ไม่ใช่ anonymous) — ผู้ไม่ล็อกอินแค่คำนวณดูผล ไม่เก็บข้อมูล
  const { isAuthenticated, loading: userLoading } = useUser()

  useEffect(() => {
    listCrops()
      .then(setCrops)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCropsLoading(false))
    listFertilizerFormulas()
      .then(setFormulas)
      .catch(() => {})
      .finally(() => setFormulasLoading(false))
  }, [])

  const num = (s: string) => (s.trim() === "" ? null : Number(s))
  const omN = num(om)
  const pN = num(p)
  const kN = num(k)

  const omLevel = classify("om", omN)
  const pLevel = classify("p", pN)
  const kLevel = classify("k", kN)

  const hasSoil = omN != null || pN != null || kN != null
  const ready = !!cropId && hasSoil

  // กดปุ่ม "คำนวณ" ก่อน ถึงจะแสดงผล (ไม่คำนวณอัตโนมัติทันทีที่กรอก)
  // ล้างผลเก่าทิ้งก่อนเสมอ แล้วคำนวณใหม่ทั้งชุด (ธาตุอาหาร + ปริมาณปุ๋ย) กันค่าตกค้าง
  async function handleCalculate() {
    if (!ready) return
    setError(null)
    setCalc(null)
    setBlendResult(null)
    setCalcLoading(true)
    try {
      const r = await calculateFertilizer({
        crop_id: cropId,
        om_value: omN,
        p_value: pN,
        k_value: kN,
      })
      setCalc(r)

      // คำนวณปริมาณปุ๋ยจากสูตรที่เลือก (ถ้ามีเป้าหมาย + เลือกปุ๋ยไว้)
      const target = {
        n: r.target_n ?? 0,
        p2o5: r.target_p2o5 ?? 0,
        k2o: r.target_k2o ?? 0,
      }
      const selected = picked
        .map((id) => formulas.find((f) => f.id === id))
        .filter((f): f is FertilizerFormulaRow => !!f)
        .map((f) => ({
          id: f.id,
          name: f.name,
          grade: f.grade,
          n: f.n_percent,
          p2o5: f.p2o5_percent,
          k2o: f.k2o_percent,
        }))
      const hasTarget = target.n > 0 || target.p2o5 > 0 || target.k2o > 0
      setBlendResult(
        hasTarget && selected.length > 0 ? blendFertilizer(target, selected) : null
      )
    } catch (e) {
      setCalc(null)
      setBlendResult(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCalcLoading(false)
    }
  }

  // เปลี่ยนพืช/ค่าดิน/ปุ๋ย = ผลคำนวณ+ผลที่บันทึกไว้ไม่ตรงแล้ว -> ล้าง ให้กดคำนวณใหม่
  function invalidate() {
    setCalc(null)
    setBlendResult(null)
    setSavedId(null)
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      await ensureSession()
      const crop = crops.find((c) => c.id === cropId)
      const analysisId = await saveManualAnalysis({
        crop_id: cropId,
        om_value: omN,
        p_value: pN,
        k_value: kN,
        ph_value: num(ph),
        province: null,
        amphur: null,
        district: null,
        notes: crop ? `พืช: ${crop.name}` : null,
      })
      try {
        await calculateAndSave({
          analysis_id: analysisId,
          crop_id: cropId,
          om_value: omN,
          p_value: pN,
          k_value: kN,
        })
      } catch (e) {
        console.warn("calculateAndSave failed:", e)
      }
      setSavedId(analysisId)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[46rem] px-4 py-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="mb-5 text-center text-lg font-bold text-gray-800">
          คำนวณปุ๋ยตามค่าวิเคราะห์ดิน
        </h1>

        {/* ① เลือกพืช */}
        <StepHeader n={1} title="เลือกพืชที่จะปลูก" hint="เลือกประเภทก่อน แล้วเลือกพืช" />
        {cropsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายการพืช…
          </div>
        ) : (
          <CropPicker crops={crops} value={cropId} onChange={(id) => { setCropId(id); invalidate() }} />
        )}

        {/* ② ค่าวิเคราะห์ดิน */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <StepHeader
            n={2}
            title="ค่าวิเคราะห์ดิน"
            hint="กรอกค่าจากชุดตรวจดินหรือผลแล็บ"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NutrientInput label="อินทรียวัตถุ (OM)" unit="%" value={om} onChange={(v) => { setOm(v); invalidate() }} level={omLevel} placeholder="เช่น 1.5" />
            <NutrientInput label="ฟอสฟอรัส (P)" unit="mg/kg" value={p} onChange={(v) => { setP(v); invalidate() }} level={pLevel} placeholder="เช่น 20" />
            <NutrientInput label="โพแทสเซียม (K)" unit="mg/kg" value={k} onChange={(v) => { setK(v); invalidate() }} level={kLevel} placeholder="เช่น 80" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NutrientInput label="ความเป็นกรด-ด่าง (pH)" unit="0–14" value={ph} onChange={(v) => { setPh(v); setSavedId(null) }} placeholder="เช่น 6.5" />
          </div>

        </div>

        {/* ③ เลือกปุ๋ยที่จะใช้ (input ก่อนกดคำนวณ) */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <StepHeader
            n={3}
            title="เลือกปุ๋ยที่จะใช้"
            hint="เลือกปุ๋ยที่หาซื้อได้ 1–3 สูตร (จะคำนวณปริมาณให้ตอนกดคำนวณ)"
          />
          <FertilizerPicker
            formulas={formulas}
            loading={formulasLoading}
            picked={picked}
            onChange={(p) => { setPicked(p); invalidate() }}
          />
        </div>

        {/* ปุ่มคำนวณ — ต้องกดก่อนถึงจะแสดงผล */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <Button
            onClick={handleCalculate}
            disabled={!ready || calcLoading}
            className="h-12 w-full rounded-full bg-[#1A4D2E] font-medium text-white hover:bg-[#143a22] disabled:opacity-50"
          >
            {calcLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังคำนวณ…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Calculator className="h-4 w-4" /> {calc ? "คำนวณใหม่" : "คำนวณ"}
              </span>
            )}
          </Button>
          {!ready && (
            <p className="mt-2 text-center text-xs text-gray-400">
              เลือกพืชและกรอกค่าดินอย่างน้อย 1 ค่า แล้วกดคำนวณ
            </p>
          )}
        </div>

        {/* ④ ธาตุอาหารที่ต้องการ — แสดงหลังกดคำนวณ */}
        {calc && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <StepHeader n={4} title="ธาตุอาหารที่พืชต้องการ" hint="จากค่าดิน + ชนิดพืช" />
            <div className="rounded-xl bg-[#1A2F2A] p-4 text-white">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["N (ไนโตรเจน)", calc.target_n],
                  ["P₂O₅ (ฟอสฟอรัส)", calc.target_p2o5],
                  ["K₂O (โพแทสเซียม)", calc.target_k2o],
                ].map(([label, v]) => (
                  <div key={label as string} className="text-center">
                    <p className="mb-1 text-[11px] text-white/60">{label as string}</p>
                    <p className="text-2xl font-medium text-accent">{(v as number | null) ?? "—"}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 border-t border-white/10 pt-2 text-center text-xs text-white/70">
                หน่วย: <span className="font-medium text-white">{calc.unit}</span>
              </p>
              {calc.notes.length > 0 && (
                <div className="mt-2 border-t border-white/10 pt-2">
                  {calc.notes.map((n, i) => (
                    <p key={i} className="text-[11px] italic text-orange-200">⚠ {n}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ⑤ แผนใส่ปุ๋ยตามระยะ (คำแนะนำกรมฯ ตายตัว) — ตัวหลัก */}
        {calc && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <StepHeader
              n={5}
              title="แผนการใส่ปุ๋ยตามระยะ"
              hint="คำแนะนำตายตัวของกรมวิชาการเกษตร ตามช่วงค่าดิน"
            />
            <FertilizerPlanTable cropId={cropId} om={omN} p={pN} k={kN} />
          </div>
        )}

        {/* ⑥ ทางเลือก: เลือกปุ๋ยเอง (solver) — จากสูตรที่เลือกไว้ในขั้นที่ 3 */}
        {calc && blendResult && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <StepHeader
              n={6}
              title="ทางเลือก: เลือกปุ๋ยเอง"
              hint="กรณีหาปุ๋ยตามตารางไม่ได้ — คำนวณจากสูตรที่เลือกในขั้นที่ 3"
            />
            <BlendResultCard result={blendResult} unit={calc.unit} />
          </div>
        )}

        {/* บันทึก */}
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        {/* บันทึก — เฉพาะผู้ล็อกอินจริง (ไม่ใช่ anonymous) */}
        {!userLoading && isAuthenticated && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            {savedId ? (
              <div className="flex flex-col items-center gap-3 rounded-xl bg-emerald-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Check className="h-4 w-4" /> บันทึกลงประวัติแล้ว
                </p>
                <div className="flex gap-2">
                  <Link
                    href="/history"
                    className="flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <History className="h-4 w-4" /> ดูประวัติ
                  </Link>
                  <Link
                    href={`/analyze/result?id=${savedId}`}
                    className="rounded-full bg-[#1A4D2E] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    เปิดผลที่บันทึก
                  </Link>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!ready || !calc || saving}
                className="h-12 w-full rounded-full bg-[#1A4D2E] font-medium text-white hover:bg-[#143a22] disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sprout className="h-4 w-4" /> บันทึกลงประวัติ
                  </span>
                )}
              </Button>
            )}
          </div>
        )}

        {/* ผู้ไม่ล็อกอิน: แค่คำนวณดูผล ไม่เก็บข้อมูล/ไม่บันทึก */}
        {!userLoading && !isAuthenticated && calc && (
          <div className="mt-6 border-t border-gray-100 pt-5 text-center">
            <p className="text-xs text-gray-400">
              คำนวณดูผลได้เลยโดยไม่ต้องบันทึก ·{" "}
              <Link href="/login" className="font-medium text-[#1A4D2E] hover:underline">
                เข้าสู่ระบบ
              </Link>{" "}
              เพื่อบันทึกผลลงประวัติ
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
