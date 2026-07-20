"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Sprout, Check, History } from "lucide-react"
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
import { ensureSession } from "@/lib/supabase/auth"
import { classify, soilScore, LEVEL_COLORS, LEVEL_LABEL_TH } from "@/lib/soil/grid"
import FertilizerBlend from "../result/FertilizerBlend"
import FruitStageTable from "@/components/fertilizer/FruitStageTable"

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

  const [calc, setCalc] = useState<FertilizerResult | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCrops()
      .then(setCrops)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCropsLoading(false))
  }, [])

  const num = (s: string) => (s.trim() === "" ? null : Number(s))
  const omN = num(om)
  const pN = num(p)
  const kN = num(k)

  const omLevel = classify("om", omN)
  const pLevel = classify("p", pN)
  const kLevel = classify("k", kN)
  const score = soilScore(omN, pN, kN)
  const scoreLevel = score != null ? classify("sum", score) : null

  const hasSoil = omN != null || pN != null || kN != null
  const ready = !!cropId && hasSoil

  // คำนวณธาตุอาหารที่ต้องการทันทีเมื่อค่าเปลี่ยน (ยังไม่บันทึก)
  useEffect(() => {
    if (!ready) {
      setCalc(null)
      return
    }
    let cancelled = false
    setCalcLoading(true)
    const t = setTimeout(() => {
      calculateFertilizer({
        crop_id: cropId,
        om_value: omN,
        p_value: pN,
        k_value: kN,
      })
        .then((r) => !cancelled && setCalc(r))
        .catch(() => !cancelled && setCalc(null))
        .finally(() => !cancelled && setCalcLoading(false))
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropId, om, p, k, ready])

  // ค่าที่กรอกเปลี่ยน = ผลที่บันทึกไว้ไม่ตรงแล้ว
  useEffect(() => {
    setSavedId(null)
  }, [cropId, om, p, k, ph])

  const cropsByType = useMemo(
    () =>
      crops.reduce<Record<string, CropOption[]>>((acc, c) => {
        ;(acc[c.crop_type_name] = acc[c.crop_type_name] ?? []).push(c)
        return acc
      }, {}),
    [crops]
  )

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
        <StepHeader n={1} title="เลือกพืชที่จะปลูก" />
        {cropsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายการพืช…
          </div>
        ) : (
          <select
            value={cropId}
            onChange={(e) => setCropId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm focus:border-[#1A4D2E] focus:bg-white focus:outline-none"
          >
            <option value="">— เลือกพืช —</option>
            {Object.entries(cropsByType).map(([type, list]) => (
              <optgroup key={type} label={type}>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        {/* ② ค่าวิเคราะห์ดิน */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <StepHeader
            n={2}
            title="ค่าวิเคราะห์ดิน"
            hint="กรอกค่าจากชุดตรวจดินหรือผลแล็บ"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NutrientInput label="อินทรียวัตถุ (OM)" unit="%" value={om} onChange={setOm} level={omLevel} placeholder="เช่น 1.5" />
            <NutrientInput label="ฟอสฟอรัส (P)" unit="mg/kg" value={p} onChange={setP} level={pLevel} placeholder="เช่น 20" />
            <NutrientInput label="โพแทสเซียม (K)" unit="mg/kg" value={k} onChange={setK} level={kLevel} placeholder="เช่น 80" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NutrientInput label="ความเป็นกรด-ด่าง (pH)" unit="0–14" value={ph} onChange={setPh} placeholder="เช่น 6.5" />
          </div>

          {score != null && scoreLevel && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
              <span className="text-xs text-gray-600">ความอุดมสมบูรณ์ของดินโดยรวม</span>
              <span className="flex items-center gap-2">
                <span className="text-base font-bold text-gray-800">
                  {score}
                  <span className="text-[11px] font-normal text-gray-400">/9</span>
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-gray-800"
                  style={{ background: LEVEL_COLORS[scoreLevel] }}
                >
                  {LEVEL_LABEL_TH[scoreLevel]}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* ③ ธาตุอาหารที่ต้องการ */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <StepHeader n={3} title="ธาตุอาหารที่พืชต้องการ" hint="คำนวณอัตโนมัติจากค่าดิน + ชนิดพืช" />
          {!ready ? (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              เลือกพืชและกรอกค่าดินด้านบน ระบบจะคำนวณให้ทันที
            </p>
          ) : calcLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังคำนวณ…
            </div>
          ) : calc ? (
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
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-600">
              ไม่พบตารางคำแนะนำสำหรับพืชนี้
            </p>
          )}
        </div>

        {/* ④ เลือกปุ๋ย */}
        {calc && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <StepHeader n={4} title="เลือกปุ๋ยที่จะใช้" hint="ระบบคำนวณให้ว่าต้องใช้แต่ละสูตรเท่าไร" />
            <FertilizerBlend
              target={{ n: calc.target_n, p2o5: calc.target_p2o5, k2o: calc.target_k2o }}
              unit={calc.unit}
              embedded
            />
          </div>
        )}

        {/* ตารางแบ่งใส่ตามระยะ — แสดงเฉพาะไม้ผล 9 ชนิดที่มีตารางของกรมฯ */}
        <FruitStageTable
          cropName={crops.find((c) => c.id === cropId)?.name}
          om={omN}
          p={pN}
          k={kN}
        />

        {/* บันทึก */}
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

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
              disabled={!ready || saving}
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
      </div>
    </div>
  )
}
