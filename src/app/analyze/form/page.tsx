"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import * as Dialog from "@radix-ui/react-dialog"
import { Loader2, Sprout, Check, History, Calculator, ChevronDown, MapPin } from "lucide-react"
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
import { unitTh } from "@/lib/fertilizer/unit"
import CropPicker from "@/components/fertilizer/CropPicker"
import FertilizerPicker from "@/components/fertilizer/FertilizerPicker"
import BlendResultCard from "@/components/fertilizer/BlendResultCard"
import FertilizerPlanTable from "@/components/fertilizer/FertilizerPlanTable"
import CropNote from "@/components/fertilizer/CropNote"
import LeafStandardTable from "@/components/fertilizer/LeafStandardTable"
import SoilRecommendationTable from "@/components/fertilizer/SoilRecommendationTable"
import ImportPanel, { type FilledRow } from "@/components/analyze/ImportPanel"
import { getSoilAtPoint } from "@/lib/supabase/soilGrid"
import type { PickedArea } from "@/app/analyze/map/MapPicker"

// Leaflet ใช้ได้เฉพาะฝั่งเบราว์เซอร์ — โหลดตอนเปิดหน้าต่างแผนที่เท่านั้น
const MapPicker = dynamic(() => import("@/app/analyze/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#1A4D2E]" />
    </div>
  ),
})

/** ค่าดินที่ดึงจากแผนที่ + จุดที่ปัก (ใช้แจ้งผู้ใช้ และบันทึกตำแหน่งไปกับผล) */
interface MapPick {
  lat: number
  lng: number
  area: PickedArea | null
  values: { om: string; p: string; k: string }
}

// ค่าจาก soil_grid เป็นทศนิยมยาว — ตัดเหลือ 2 ตำแหน่ง (เหมือนหน้าแผนที่)
const fmtSoil = (v: number | null) => (v == null ? "" : String(Number(v.toFixed(2))))

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

function StepHeader({ n, title, hint, action }: { n: number; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1A4D2E] text-xs font-bold text-white">
        {n}
      </span>
      <div className="mr-auto">
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

/**
 * ขั้นที่เป็นตารางอ้างอิง — ซ่อนไว้ก่อนเป็นค่าเริ่มต้น ให้ช่องกรอกอยู่ใกล้ปุ่มคำนวณ
 * ตารางจะ mount (และโหลดข้อมูล) ตอนกดเปิดเท่านั้น
 */
function CollapsibleStep({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 text-left"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1A4D2E] text-xs font-bold text-white">
          {n}
        </span>
        <div className="mr-auto">
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
          {hint && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-[#1A4D2E] hover:bg-gray-50">
          {open ? "ซ่อนตาราง" : "แสดงตาราง"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
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

  // ดึงค่าดินจากแผนที่ (ค่าประมาณจาก soil_grid ความละเอียด 0.05° ≈ 5 กม.)
  const [mapOpen, setMapOpen] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapPick, setMapPick] = useState<MapPick | null>(null)

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

  // ชื่อพืชที่เลือก — ใช้เปิดตารางอ้างอิงในขั้นที่ 4-5 (ตารางผูกกับชื่อพืช ไม่ใช่ id)
  const cropName = crops.find((c) => c.id === cropId)?.name ?? ""

  // สูตรของปุ๋ยที่เลือก — แผนใส่ปุ๋ยใช้ตัดสินว่าจะยึดตารางแม่ปุ๋ยของกรมฯ หรือไม่
  const pickedGrades = picked
    .map((id) => formulas.find((f) => f.id === id)?.grade ?? "")
    .filter(Boolean)

  // ยังใช้ค่าจากแผนที่อยู่ไหม (แก้ครบทุกช่องแล้ว = ไม่ใช่ค่าจากแผนที่แล้ว) — ใช้ระบุในหมายเหตุตอนบันทึก
  const usingMapValues =
    !!mapPick && (om === mapPick.values.om || p === mapPick.values.p || k === mapPick.values.k)

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
      // ค่าดินจากแผนที่เป็นค่าประมาณ — ระบุไว้ในหมายเหตุ ไม่ให้ปนกับผลตรวจดินจริงตอนวิเคราะห์ข้อมูล
      const notes = [
        crop ? `พืช: ${crop.name}` : null,
        usingMapValues && mapPick
          ? `ค่าดินประมาณจากแผนที่ ณ ${mapPick.lat.toFixed(5)}, ${mapPick.lng.toFixed(5)}`
          : null,
      ].filter(Boolean).join(" · ")
      const analysisId = await saveManualAnalysis({
        crop_id: cropId,
        om_value: omN,
        p_value: pN,
        k_value: kN,
        ph_value: num(ph),
        province: mapPick?.area?.province ?? null,
        amphur: mapPick?.area?.amphur ?? null,
        district: mapPick?.area?.district ?? null,
        latitude: mapPick?.lat ?? null,
        longitude: mapPick?.lng ?? null,
        notes: notes || null,
        blend_formula_ids: picked.filter(Boolean),   // ปุ๋ยที่เลือกในขั้นที่ 3
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

  // เติมค่าจากไฟล์ที่นำเข้า (กรณีไฟล์มีแถวเดียว) — ผู้ใช้ยังต้องกดคำนวณเอง
  function applyImportedRow(row: FilledRow) {
    setCropId(row.cropId)
    setOm(row.om)
    setP(row.p)
    setK(row.k)
    setPh(row.ph)
    setPicked(row.formulaIds.length > 0 ? row.formulaIds : [""])
    setMapPick(null)
    invalidate()
  }

  // ปักหมุดแล้ว -> ดึง OM/P/K ของจุดนั้นจากแผนที่ดิน มาเติมในช่อง (ผู้ใช้แก้ต่อได้)
  async function handleMapConfirm(lat: number, lng: number, area?: PickedArea) {
    setMapOpen(false)
    setMapError(null)
    setMapLoading(true)
    try {
      // MapPicker หาชื่อพื้นที่แบบหน่วงเวลา — ถ้ากดยืนยันเร็วกว่านั้น area จะยังว่าง จึงถามซ้ำที่นี่
      const [soil, place] = await Promise.all([
        getSoilAtPoint(lat, lng),
        area ??
          fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`)
            .then((r) => (r.ok ? (r.json() as Promise<PickedArea>) : null))
            .catch(() => null),
      ])
      area = place ?? undefined
      if (!soil || (soil.om == null && soil.p == null && soil.k == null)) {
        setMapError("จุดนี้อยู่นอกพื้นที่ของแผนที่ดิน ลองปักหมุดบนพื้นที่เกษตรในประเทศไทย")
        return
      }
      const values = { om: fmtSoil(soil.om), p: fmtSoil(soil.p), k: fmtSoil(soil.k) }
      setOm(values.om)
      setP(values.p)
      setK(values.k)
      setMapPick({ lat, lng, area: area ?? null, values })
      invalidate()
    } catch {
      setMapError("ดึงค่าจากแผนที่ไม่สำเร็จ ลองใหม่อีกครั้ง")
    } finally {
      setMapLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[46rem] px-4 py-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="mb-5 text-center text-lg font-bold text-gray-800">
          คำนวณปุ๋ยตามค่าวิเคราะห์ดิน
        </h1>

        {/* นำเข้าไฟล์ — แถวเดียวเติมลงฟอร์ม หลายแถวคำนวณและบันทึกรวดเดียว */}
        <div className="mb-6">
          <ImportPanel crops={crops} formulas={formulas} onFillForm={applyImportedRow} />
        </div>

        {/* ① เลือกพืช */}
        <StepHeader n={1} title="เลือกพืชที่จะปลูก" hint="เลือกประเภทก่อน แล้วเลือกพืช" />
        {cropsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายการพืช…
          </div>
        ) : (
          <CropPicker crops={crops} value={cropId} onChange={(id) => { setCropId(id); invalidate() }} />
        )}

        {/* ② ค่าวิเคราะห์ดิน — ช่องกรอกอยู่ต่อจากเลือกพืชทันที */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <StepHeader
            n={2}
            title="ค่าวิเคราะห์ดิน"
            hint="กรอกค่าจากชุดตรวจดินหรือผลแล็บ"
            action={
              // ทางลัดรอง — สีจางกว่าช่องกรอก เพราะค่าจากแผนที่เป็นแค่ค่าประมาณ
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                disabled={mapLoading}
                className="flex shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 transition hover:border-[#1A4D2E]/40 hover:text-[#1A4D2E] disabled:opacity-50"
              >
                {mapLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                ดึงค่าจากแผนที่
              </button>
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NutrientInput label="อินทรียวัตถุ (OM)" unit="%" value={om} onChange={(v) => { setOm(v); invalidate() }} level={omLevel} placeholder="เช่น 1.5" />
            <NutrientInput label="ฟอสฟอรัส (P)" unit="mg/kg" value={p} onChange={(v) => { setP(v); invalidate() }} level={pLevel} placeholder="เช่น 20" />
            <NutrientInput label="โพแทสเซียม (K)" unit="mg/kg" value={k} onChange={(v) => { setK(v); invalidate() }} level={kLevel} placeholder="เช่น 80" />
          </div>

          {mapError && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{mapError}</p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NutrientInput label="ความเป็นกรด-ด่าง (pH)" unit="0–14" value={ph} onChange={(v) => { setPh(v); setSavedId(null) }} placeholder="เช่น 6.5" />
          </div>

        </div>

        {/* ③ เลือกปุ๋ยที่จะใช้ (input ก่อนกดคำนวณ) */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <StepHeader
            n={3}
            title="เลือกปุ๋ยที่จะใช้"
            hint="เลือกปุ๋ยที่หาซื้อได้ 1–3 สูตร"
          />
          <FertilizerPicker
            formulas={formulas}
            loading={formulasLoading}
            picked={picked}
            onChange={(p) => { setPicked(p); invalidate() }}
          />
        </div>

        {/* ④⑤ ตารางอ้างอิงของพืชที่เลือก — ซ่อนไว้ก่อน กดปุ่มเพื่อเปิดดู */}
        <CollapsibleStep n={4} title="ค่ามาตรฐานความเข้มข้นของธาตุอาหาร">
          <LeafStandardTable cropName={cropName} />
        </CollapsibleStep>
        <CollapsibleStep n={5} title="การใช้ปุ๋ยตามค่าวิเคราะห์ดิน">
          <SoilRecommendationTable cropId={cropId} cropName={cropName} />
        </CollapsibleStep>

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

        {/* ⑥ ธาตุอาหารที่ต้องการ — แสดงหลังกดคำนวณ */}
        {calc && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <StepHeader n={6} title="ธาตุอาหารที่พืชต้องการ" hint={`จากค่าดิน + ${cropName || "ชนิดพืช"}`} />
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
                หน่วย: <span className="font-medium text-white">{unitTh(calc.unit)}</span>
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

        {/* ⑦ แผนใส่ปุ๋ยตามระยะ (คำแนะนำกรมฯ ตายตัว) — ตัวหลัก */}
        {calc && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <StepHeader
              n={7}
              title="แผนการใส่ปุ๋ยตามระยะ"
              hint="คำแนะนำตายตัวของกรมวิชาการเกษตร ตามช่วงค่าดิน"
            />
            <FertilizerPlanTable
              cropId={cropId}
              om={omN}
              p={pN}
              k={kN}
              blend={blendResult}
              pickedGrades={pickedGrades}
              unit={calc.unit}
            />
          </div>
        )}

        {/* ⑧ ทางเลือก: เลือกปุ๋ยเอง (solver) — จากสูตรที่เลือกไว้ในขั้นที่ 3 */}
        {calc && blendResult && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <StepHeader n={8} title="ทางเลือก : ปริมาณปุ๋ยที่ต้องใช้" />
            <BlendResultCard result={blendResult} unit={calc.unit} />
          </div>
        )}

        {/* หมายเหตุ (คำแนะนำเพิ่มเติมของกรมฯ) — ต่อจากขั้นที่ 8 ไม่มีเลขขั้น */}
        {calc && <CropNote cropId={cropId} />}

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

      {/* หน้าต่างเลือกจุดบนแผนที่ — ไม่เปลี่ยนหน้า ค่าที่กรอกไว้จึงไม่หาย */}
      <Dialog.Root open={mapOpen} onOpenChange={setMapOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
          <Dialog.Content className="fixed inset-x-0 top-1/2 z-[101] mx-auto w-[95vw] max-w-3xl -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <Dialog.Title className="sr-only">ดึงค่าวิเคราะห์ดินจากแผนที่</Dialog.Title>
            <Dialog.Description className="sr-only">
              ปักหมุดตำแหน่งแปลง แล้วกดยืนยันเพื่อดึงค่า OM, P, K ของจุดนั้น
            </Dialog.Description>
            {mapOpen && (
              <MapPicker
                onConfirm={handleMapConfirm}
                onCancel={() => setMapOpen(false)}
                initialLat={mapPick?.lat}
                initialLng={mapPick?.lng}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
