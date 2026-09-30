"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import * as Dialog from "@radix-ui/react-dialog"
import {
  Loader2, Sprout, Check, History, Calculator, Printer, Map as MapIcon, ChevronDown, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { saveManualAnalysis, saveReportData } from "@/lib/supabase/analyses"
import { calculateFertilizer, listCrops, type CropOption } from "@/lib/supabase/fertilizer"
import { listFertilizerFormulas, type FertilizerFormulaRow } from "@/lib/supabase/fertilizerFormulas"
import { getCropPlanGrades, getCropRanges, getFertilizerPlan, type PlanStage } from "@/lib/supabase/fertilizerPlan"
import { getSoilAtPoint } from "@/lib/supabase/soilGrid"
import { ensureSession } from "@/lib/supabase/auth"
import { useUser } from "@/lib/supabase/useUser"
import { GENERAL_RANGES, levelByRanges, phAdvice, type Range } from "@/lib/soil/advice"
import type { Formula } from "@/lib/fertilizer/blend"
import {
  computeStagePlan, DEFAULT_FORMULAS, FERT_MODE_LABEL, parseGrade, planUnitFromTarget, singleStage,
  tableFormulas, type FertMode, type OrganicInput, type StagePlanResult, type TableStage,
} from "@/lib/fertilizer/stagePlan"
import { EMPTY_FARMER, fullAddress, REPORT_STORAGE_KEY, type FarmerInfo, type ReportData } from "@/lib/report"
import CropPicker from "@/components/fertilizer/CropPicker"
import FertilizerPicker from "@/components/fertilizer/FertilizerPicker"
import FertilizerPlanTable from "@/components/fertilizer/FertilizerPlanTable"
import StagePlanTable from "@/components/fertilizer/StagePlanTable"
import SoilStandardPanel from "@/components/fertilizer/SoilStandardPanel"
import OrganicPicker, { ORGANIC_CUSTOM_ID } from "@/components/fertilizer/OrganicPicker"
import FormulaCatalog from "@/components/fertilizer/FormulaCatalog"
import PlotInfoForm, { lookupAdminArea } from "@/components/fertilizer/PlotInfoForm"

const MapPicker = dynamic(() => import("@/app/analyze/map/MapPicker"), { ssr: false })

const FORM_STATE_KEY = "fert_form_state"
const LEVEL_TONE = ["#F2A8A1", "#F8CE97", "#A8D5A2", "#8CC585", "#74B86C"]

type FormulaPreset = "recommended" | "compound" | "custom"

/** ช่องกรอกตัวเลข + ป้ายระดับ (ต่ำ/ปานกลาง/สูง) */
function NutrientInput({
  label, unit, value, onChange, level, placeholder,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  level?: { index: number; label: string; total: number } | null
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-[15px] font-medium text-gray-700">
        {label} <span className="font-normal text-gray-400">— {unit}</span>
      </label>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-lg tabular-nums focus:border-[#1A4D2E] focus:bg-white focus:outline-none"
      />
      {level && (
        <span
          className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold text-gray-800"
          style={{ background: LEVEL_TONE[Math.round((level.index / Math.max(1, level.total - 1)) * 2)] }}
        >
          {level.label}
        </span>
      )}
    </div>
  )
}

function StepHeader({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1A4D2E] text-base font-bold text-white">
        {n}
      </span>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {hint && <p className="text-sm text-gray-500">{hint}</p>}
      </div>
    </div>
  )
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] font-semibold text-gray-800"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-[#1A4D2E] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-gray-100 p-4">{children}</div>}
    </div>
  )
}

const toFormula = (f: FertilizerFormulaRow): Formula => ({
  id: f.id, name: f.name, grade: f.grade, n: f.n_percent, p2o5: f.p2o5_percent, k2o: f.k2o_percent,
})

interface CalcResult {
  plan: StagePlanResult // ตามสูตรที่เลือก
  recommendedPlan: StagePlanResult | null // ตามสูตรแนะนำ (แสดงเทียบเมื่อผู้ใช้เลือกสูตรเอง)
  needUnit: string
  hasTable: boolean
  notes: string[]
}

export default function AnalyzeForm() {
  const [crops, setCrops] = useState<CropOption[]>([])
  const [cropsLoading, setCropsLoading] = useState(true)
  const [formulas, setFormulas] = useState<FertilizerFormulaRow[]>([])
  const [formulasLoading, setFormulasLoading] = useState(true)

  // ① ค่าดิน
  const [om, setOm] = useState("")
  const [p, setP] = useState("")
  const [k, setK] = useState("")
  const [ph, setPh] = useState("")
  const [soilFromMap, setSoilFromMap] = useState<string | null>(null)
  const [soilMapOpen, setSoilMapOpen] = useState(false)
  const [soilMapLoading, setSoilMapLoading] = useState(false)
  // ② พืช
  const [cropId, setCropId] = useState("")
  const [cropRanges, setCropRanges] = useState<Record<"om" | "p" | "k", Range[]> | null>(null)
  const [compoundGrades, setCompoundGrades] = useState<string[]>([])
  // ③ รูปแบบปุ๋ย
  const [mode, setMode] = useState<FertMode>("chemical")
  const [organic, setOrganic] = useState<OrganicInput>({ name: "", n: 0, p2o5: 0, k2o: 0 })
  const [organicId, setOrganicId] = useState("")
  // ④ สูตรปุ๋ย
  const [preset, setPreset] = useState<FormulaPreset>("recommended")
  const [picked, setPicked] = useState<string[]>([""])
  // ⑤ เกษตรกร/พื้นที่ปลูก
  const [farmer, setFarmer] = useState<FarmerInfo>(EMPTY_FARMER)

  const [calc, setCalc] = useState<CalcResult | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { isAuthenticated, loading: userLoading } = useUser()

  // โหลดรายการพืช/ปุ๋ย + คืนค่าฟอร์มเดิม (กลับมาจากหน้าพิมพ์)
  useEffect(() => {
    listCrops()
      .then(setCrops)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCropsLoading(false))
    listFertilizerFormulas()
      .then((list) => {
        setFormulas(list)
        const org = list.filter((f) => f.kind === "organic")
        if (org[0]) {
          setOrganicId((prev) => prev || org[0].id)
          setOrganic((prev) => (prev.n > 0 ? prev : { name: org[0].name, n: org[0].n_percent, p2o5: org[0].p2o5_percent, k2o: org[0].k2o_percent }))
        }
      })
      .catch(() => {})
      .finally(() => setFormulasLoading(false))

    try {
      const raw = sessionStorage.getItem(FORM_STATE_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        // คืนค่าฟอร์มจาก sessionStorage ได้หลัง mount เท่านั้น (SSR ไม่มี sessionStorage)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOm(s.om ?? ""); setP(s.p ?? ""); setK(s.k ?? ""); setPh(s.ph ?? "")
        setCropId(s.cropId ?? ""); setMode(s.mode ?? "chemical")
        if (s.organic) setOrganic(s.organic)
        if (s.organicId) setOrganicId(s.organicId)
        setPreset(s.preset ?? "recommended"); setPicked(s.picked ?? [""])
        setFarmer({ ...EMPTY_FARMER, ...(s.farmer ?? {}) })
      }
      // ค่าจากหน้าผลทำนาย (อัปโหลดรูป) -> ?om=&p=&k=&ph=
      const q = new URLSearchParams(window.location.search)
      if (q.get("om")) setOm(q.get("om")!)
      if (q.get("p")) setP(q.get("p")!)
      if (q.get("k")) setK(q.get("k")!)
      if (q.get("ph")) setPh(q.get("ph")!)
      if (q.get("lat") && q.get("lng")) setFarmer((f) => ({ ...f, lat: q.get("lat")!, lng: q.get("lng")! }))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ om, p, k, ph, cropId, mode, organic, organicId, preset, picked, farmer })
      )
    } catch {}
  }, [om, p, k, ph, cropId, mode, organic, organicId, preset, picked, farmer])

  // ช่วงค่าดินของพืช + สูตรปุ๋ยผสมที่ตารางกรมฯ ใช้
  useEffect(() => {
    if (!cropId) return
    let cancelled = false
    getCropRanges(cropId).then((r) => !cancelled && setCropRanges(r ? { om: r.om, p: r.p, k: r.k } : null)).catch(() => {})
    getCropPlanGrades(cropId, "compound")
      .then((g) => !cancelled && setCompoundGrades(g))
      .catch(() => {})
    return () => { cancelled = true }
  }, [cropId])

  const num = (s: string) => (s.trim() === "" ? null : Number(s))
  const omN = num(om)
  const pN = num(p)
  const kN = num(k)
  const phN = num(ph)

  const ranges = cropRanges ?? GENERAL_RANGES
  const lv = (v: number | null, key: "om" | "p" | "k") => {
    const r = levelByRanges(v, ranges[key])
    return r ? { ...r, total: ranges[key].length } : null
  }
  const omLevel = lv(omN, "om")
  const pLevel = lv(pN, "p")
  const kLevel = lv(kN, "k")
  const phInfo = phAdvice(phN)

  const crop = crops.find((c) => c.id === cropId)
  const chemicalFormulas = useMemo(() => formulas.filter((f) => f.kind === "chemical"), [formulas])
  const organicFormulas = useMemo(() => formulas.filter((f) => f.kind === "organic"), [formulas])

  const hasSoil = omN != null && pN != null && kN != null
  const customFormulas = picked.map((id) => chemicalFormulas.find((f) => f.id === id)).filter((f): f is FertilizerFormulaRow => !!f)
  const organicOk = mode === "chemical" || organic.n > 0
  const ready = !!cropId && hasSoil && organicOk && (preset !== "custom" || customFormulas.length > 0)

  function invalidate() {
    setCalc(null)
    setSavedId(null)
  }

  // ① ดึงค่าดินจากแผนที่ดิน (grid IDW) ที่พิกัดพื้นที่ปลูก
  async function pullSoilFromMap(lat: number, lng: number) {
    setSoilMapLoading(true)
    setError(null)
    try {
      const s = await getSoilAtPoint(lat, lng)
      if (!s || (s.om == null && s.p == null && s.k == null)) {
        setError("ไม่พบข้อมูลดินจากแผนที่ ณ พิกัดนี้ (อาจอยู่นอกพื้นที่ข้อมูล)")
        return
      }
      if (s.om != null) setOm(String(Math.round(s.om * 100) / 100))
      if (s.p != null) setP(String(Math.round(s.p * 10) / 10))
      if (s.k != null) setK(String(Math.round(s.k * 10) / 10))
      setSoilFromMap(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSoilMapLoading(false)
    }
  }

  async function handleSoilMapPick(lat: number, lng: number) {
    setSoilMapOpen(false)
    const next = { ...farmer, lat: lat.toFixed(6), lng: lng.toFixed(6) }
    setFarmer(next)
    lookupAdminArea(lat, lng).then((a) => a && setFarmer((f) => ({ ...f, ...a }))).catch(() => {})
    await pullSoilFromMap(lat, lng)
  }

  async function handleCalculate() {
    if (!ready) return
    setError(null)
    setCalc(null)
    setSavedId(null)
    setCalcLoading(true)
    try {
      // ตาราง 100% ของกรมฯ (ใช้เป็นเป้าหมาย + สัดส่วนแบ่งระยะ)
      const table = await getFertilizerPlan({ crop_id: cropId, om: omN, p: pN, k: kN, use_type: "straight" })
      let stages: TableStage[] = []
      let target = null
      const notes: string[] = []
      const hasTable = !!table && table.stages.length > 0
      if (hasTable) {
        stages = table!.stages as PlanStage[]
      } else {
        // ไม่มีตารางรายระยะ -> ใช้เป้าหมายธาตุอาหาร (fertilizer_recommendations) แบบระยะเดียว
        const r = await calculateFertilizer({ crop_id: cropId, om_value: omN, p_value: pN, k_value: kN })
        notes.push(...r.notes)
        if (r.target_n == null && r.target_p2o5 == null && r.target_k2o == null) {
          throw new Error("ไม่พบข้อมูลคำแนะนำปุ๋ยสำหรับพืชนี้ที่ช่วงค่าดินนี้")
        }
        target = { n: r.target_n ?? 0, p2o5: r.target_p2o5 ?? 0, k2o: r.target_k2o ?? 0 }
        stages = singleStage(planUnitFromTarget(r.unit))
      }

      const recommended = tableFormulas(stages).length ? tableFormulas(stages) : DEFAULT_FORMULAS
      const chosen: Formula[] =
        preset === "custom"
          ? customFormulas.map(toFormula)
          : preset === "compound" && compoundGrades.length
            ? compoundGrades.map((g) => {
                const known = chemicalFormulas.find((f) => f.grade === g)
                return known ? toFormula(known) : { id: `grade:${g}`, name: g, grade: g, ...parseGrade(g)! }
              })
            : recommended

      const organicInput = mode === "organic" ? organic : null
      const plan = computeStagePlan({ stages, target, formulas: chosen, mode, organic: organicInput })
      const recommendedPlan =
        preset === "recommended" ? null : computeStagePlan({ stages, target, formulas: recommended, mode, organic: organicInput })

      setCalc({
        plan,
        recommendedPlan,
        needUnit: plan.massUnit === "กรัม" ? "กรัม/ต้น/ปี" : "กก./ไร่",
        hasTable,
        notes,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCalcLoading(false)
    }
  }

  function buildReport(analysisId: string | null): ReportData | null {
    if (!calc || !crop) return null
    return {
      version: 1,
      created_at: new Date().toISOString(),
      analysis_id: analysisId,
      farmer,
      crop: { id: crop.id, name: crop.name, type: crop.crop_type_name },
      soil: { om: omN, p: pN, k: kN, ph: phN },
      levels: { om: omLevel?.label ?? null, p: pLevel?.label ?? null, k: kLevel?.label ?? null },
      need: calc.plan.need,
      needUnit: calc.needUnit,
      mode,
      plan: calc.plan,
    }
  }

  function openReport() {
    const report = buildReport(savedId)
    if (!report) return
    sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(report))
    window.open(savedId ? `/analyze/report?id=${savedId}` : "/analyze/report", "_blank")
  }

  async function handleSave() {
    if (!calc || !crop) return
    setError(null)
    setSaving(true)
    try {
      await ensureSession()
      const analysisId = await saveManualAnalysis({
        crop_id: cropId,
        om_value: omN,
        p_value: pN,
        k_value: kN,
        ph_value: phN,
        province: farmer.province || null,
        amphur: farmer.amphur || null,
        district: farmer.district || null,
        latitude: farmer.lat ? Number(farmer.lat) : null,
        longitude: farmer.lng ? Number(farmer.lng) : null,
        notes: `พืช: ${crop.name}`,
        farmer_name: farmer.name || null,
        farmer_phone: farmer.phone || null,
        address: fullAddress(farmer) || null,
        plot_name: farmer.plot || null,
        fert_mode: mode,
      })
      await saveReportData({
        analysis_id: analysisId,
        recommended_n: Math.round(calc.plan.need.n * 10) / 10,
        recommended_p2o5: Math.round(calc.plan.need.p2o5 * 10) / 10,
        recommended_k2o: Math.round(calc.plan.need.k2o * 10) / 10,
        unit: calc.plan.massUnit === "กรัม" ? "g/tree/year" : "kg/rai",
        report: buildReport(analysisId),
      })
      setSavedId(analysisId)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const fmt = (v: number) => v.toLocaleString("th-TH", { maximumFractionDigits: 1 })
  const presetLabel =
    preset === "custom"
      ? customFormulas.map((f) => f.grade ?? f.name).join(" + ")
      : preset === "compound"
        ? `ปุ๋ยผสมตามตารางกรมฯ (${compoundGrades.join(" + ")})`
        : "สูตรตามคำแนะนำ (46-0-0 + 18-46-0 + 0-0-60)"

  return (
    <div className="mx-auto w-full max-w-[48rem] px-4 py-6 text-base">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">คำนวณปุ๋ยตามค่าวิเคราะห์ดิน</h1>

        {/* ① ค่าวิเคราะห์ดิน — กรอกก่อนเลือกพืช */}
        <StepHeader n={1} title="กรอกค่าวิเคราะห์ดิน" hint="กรอกค่าจากชุดตรวจดิน ผลแล็บ หรือดึงค่าจากแผนที่ดิน" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NutrientInput label="อินทรียวัตถุ (OM)" unit="%" value={om} onChange={(v) => { setOm(v); setSoilFromMap(null); invalidate() }} level={omLevel} placeholder="เช่น 1.5" />
          <NutrientInput label="ฟอสฟอรัส (P)" unit="มก./กก." value={p} onChange={(v) => { setP(v); setSoilFromMap(null); invalidate() }} level={pLevel} placeholder="เช่น 20" />
          <NutrientInput label="โพแทสเซียม (K)" unit="มก./กก." value={k} onChange={(v) => { setK(v); setSoilFromMap(null); invalidate() }} level={kLevel} placeholder="เช่น 80" />
          <NutrientInput label="ความเป็นกรด-ด่าง (pH)" unit="0–14" value={ph} onChange={(v) => { setPh(v); invalidate() }} placeholder="เช่น 6.5" />
        </div>

        {phInfo && (
          <div
            className={`mt-3 rounded-xl px-4 py-3 text-[15px] ${
              phInfo.tone === "good" ? "bg-emerald-50 text-emerald-800" : phInfo.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"
            }`}
          >
            <b>pH {phN}: ดิน{phInfo.label}</b> — {phInfo.advice}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              farmer.lat && farmer.lng ? pullSoilFromMap(Number(farmer.lat), Number(farmer.lng)) : setSoilMapOpen(true)
            }
            disabled={soilMapLoading}
            className="flex items-center gap-2 rounded-full border border-[#1A4D2E]/30 bg-white px-4 h-10 text-[15px] font-semibold text-[#1A4D2E] hover:bg-[#F1F7F2] disabled:opacity-50"
          >
            {soilMapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapIcon className="h-4 w-4" />}
            ดึงค่าจากแผนที่ดิน
          </button>
          {farmer.lat && farmer.lng && (
            <button type="button" onClick={() => setSoilMapOpen(true)} className="text-sm text-gray-500 underline hover:text-[#1A4D2E]">
              เลือกจุดอื่นบนแผนที่
            </button>
          )}
        </div>
        {soilFromMap && (
          <p className="mt-2 text-sm text-amber-700">
            ค่า OM/P/K ประมาณจากแผนที่ดิน ณ พิกัด {soilFromMap} — เป็นค่าประมาณเชิงพื้นที่ ควรตรวจดินจริงเพื่อความแม่นยำ
          </p>
        )}

        <div className="mt-4">
          <SoilStandardPanel ranges={ranges} cropName={cropRanges ? crop?.name : null} />
        </div>

        {/* ② เลือกพืช */}
        <div className="mt-7 border-t border-gray-100 pt-6">
          <StepHeader n={2} title="เลือกพืชที่จะปลูก" hint="เลือกประเภทก่อน แล้วเลือกพืช" />
          {cropsLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายการพืช…
            </div>
          ) : (
            <CropPicker crops={crops} value={cropId} onChange={(id) => {
              if (id !== cropId) { setCropRanges(null); setCompoundGrades([]) }
              setCropId(id)
              if (preset === "compound") setPreset("recommended")
              invalidate()
            }} />
          )}
        </div>

        {/* ③ รูปแบบการใส่ปุ๋ย */}
        <div className="mt-7 border-t border-gray-100 pt-6">
          <StepHeader n={3} title="รูปแบบการใส่ปุ๋ย" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["chemical", "organic"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); invalidate() }}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  mode === m ? "border-[#1A4D2E] bg-[#1A4D2E] text-white shadow" : "border-gray-200 bg-white text-gray-700 hover:border-[#1A4D2E]/40"
                }`}
              >
                <p className="text-base font-bold">{FERT_MODE_LABEL[m]}</p>
                <p className={`text-sm ${mode === m ? "text-white/80" : "text-gray-500"}`}>
                  {m === "chemical" ? "ใช้ปุ๋ยเคมี 100% ตามค่าวิเคราะห์ดิน" : "ปุ๋ยเคมี 70% + ปุ๋ยอินทรีย์แทนไนโตรเจน 30%"}
                </p>
              </button>
            ))}
          </div>
          {mode === "organic" && (
            <div className="mt-3">
              {formulasLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <OrganicPicker
                  formulas={organicFormulas}
                  value={organic}
                  selectedId={organicId || ORGANIC_CUSTOM_ID}
                  onChange={(v, id) => { setOrganic(v); setOrganicId(id); invalidate() }}
                />
              )}
            </div>
          )}
        </div>

        {/* ④ สูตรปุ๋ยที่ใช้ */}
        <div className="mt-7 border-t border-gray-100 pt-6">
          <StepHeader n={4} title="เลือกสูตรปุ๋ยที่ใช้" hint="ใช้สูตรตามคำแนะนำ หรือเลือกสูตรที่หาซื้อได้ 1–3 สูตร" />
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["recommended", "สูตรตามคำแนะนำ"],
                ...(compoundGrades.length ? [["compound", "ปุ๋ยผสมตามตารางกรมฯ"]] : []),
                ["custom", "เลือกสูตรเอง"],
              ] as [FormulaPreset, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => { setPreset(key); invalidate() }}
                className={`rounded-full px-4 h-10 text-[15px] font-semibold transition ${
                  preset === key ? "bg-[#1A4D2E] text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {preset === "recommended" && "แม่ปุ๋ย 46-0-0, 18-46-0, 0-0-60 (ตามตารางคำแนะนำ)"}
            {preset === "compound" && `ใช้ ${compoundGrades.join(", ")} ตามตารางปุ๋ยผสมของกรมฯ`}
          </p>
          {preset === "custom" && (
            <div className="mt-3">
              <FertilizerPicker
                formulas={chemicalFormulas}
                loading={formulasLoading}
                picked={picked}
                onChange={(v) => { setPicked(v); invalidate() }}
              />
            </div>
          )}
          <div className="mt-4">
            <FormulaCatalog formulas={formulas} />
          </div>
        </div>

        {/* ⑤ ข้อมูลเกษตรกร / พื้นที่ปลูก */}
        <div className="mt-7 border-t border-gray-100 pt-6">
          <StepHeader n={5} title="ข้อมูลเกษตรกรและพื้นที่ปลูก" hint="ไม่บังคับ — แสดงในรายงานที่พิมพ์" />
          <PlotInfoForm value={farmer} onChange={setFarmer} />
        </div>

        {/* ปุ่มคำนวณ */}
        <div className="mt-7 border-t border-gray-100 pt-6">
          <Button
            onClick={handleCalculate}
            disabled={!ready || calcLoading}
            className="h-14 w-full rounded-full bg-[#1A4D2E] text-lg font-bold text-white hover:bg-[#143a22] disabled:opacity-50"
          >
            {calcLoading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> กำลังคำนวณ…</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><Calculator className="h-5 w-5" /> {calc ? "คำนวณใหม่" : "คำนวณ"}</span>
            )}
          </Button>
          {!ready && (
            <p className="mt-2 text-center text-sm text-gray-500">
              {!hasSoil ? "กรอกค่า OM, P, K ให้ครบ" : !cropId ? "เลือกพืช" : !organicOk ? "ระบุ %N ของปุ๋ยอินทรีย์" : "เลือกสูตรปุ๋ยอย่างน้อย 1 สูตร"}
              {" "}แล้วกดคำนวณ
            </p>
          )}
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[15px] text-red-600">{error}</p>}

        {/* ===== ผลการคำนวณ ===== */}
        {calc && (
          <>
            {/* ธาตุอาหารที่พืชต้องการ */}
            <div className="mt-7 border-t border-gray-100 pt-6">
              <h2 className="mb-3 text-xl font-bold text-gray-900">ธาตุอาหารที่พืชต้องการ</h2>
              <div className="rounded-xl bg-[#1A2F2A] p-5 text-white">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["N (ไนโตรเจน)", calc.plan.need.n],
                    ["P₂O₅ (ฟอสฟอรัส)", calc.plan.need.p2o5],
                    ["K₂O (โพแทสเซียม)", calc.plan.need.k2o],
                  ].map(([label, v]) => (
                    <div key={label as string} className="text-center">
                      <p className="mb-1 text-sm text-white/70">{label as string}</p>
                      <p className="text-3xl font-bold text-accent tabular-nums">{fmt(v as number)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 border-t border-white/10 pt-2 text-center text-sm text-white/80">
                  หน่วย: <span className="font-semibold text-white">{calc.needUnit}</span>
                </p>
                {calc.notes.map((n, i) => (
                  <p key={i} className="mt-1 text-sm text-orange-200">{n}</p>
                ))}
              </div>
            </div>

            {/* ปริมาณปุ๋ยที่ต้องใช้ — ตามสูตรที่เลือก (แสดงก่อน) */}
            <div className="mt-7">
              <h2 className="text-xl font-bold text-gray-900">ปริมาณปุ๋ยที่ต้องใช้</h2>
              <p className="mb-3 text-[15px] text-gray-600">
                {FERT_MODE_LABEL[mode]} · {presetLabel}
                {preset === "custom" && <span className="text-gray-400"> — คำนวณจากสูตรที่เลือกในขั้นที่ 4</span>}
              </p>
              <StagePlanTable plan={calc.plan} />
              {calc.plan.stages.some((s) => s.short.n < -0.5 || s.short.p2o5 < -0.5 || s.short.k2o < -0.5) && (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  สูตรที่เลือกให้ธาตุอาหารบางตัวไม่ครบในบางระยะ — เพิ่มสูตรที่มีธาตุที่ขาด เช่น 46-0-0 (N), 18-46-0 (P), 0-0-60 (K)
                </p>
              )}
              {mode === "organic" && (
                <p className="mt-2 text-sm text-gray-500">
                  ปุ๋ยอินทรีย์: {calc.plan.organic?.name} (N {calc.plan.organic?.n}% · P₂O₅ {calc.plan.organic?.p2o5}% · K₂O {calc.plan.organic?.k2o}%)
                </p>
              )}
            </div>

            {calc.recommendedPlan && (
              <div className="mt-5">
                <Collapsible title="เทียบกับสูตรตามคำแนะนำ (46-0-0 + 18-46-0 + 0-0-60)">
                  <StagePlanTable plan={calc.recommendedPlan} />
                </Collapsible>
              </div>
            )}

            {calc.hasTable && (
              <div className="mt-3">
                <Collapsible title="ตารางคำแนะนำของกรมวิชาการเกษตร (ต้นฉบับ)">
                  <FertilizerPlanTable cropId={cropId} om={omN} p={pN} k={kN} />
                </Collapsible>
              </div>
            )}

            {/* พิมพ์ / บันทึก */}
            <div className="mt-7 grid grid-cols-1 gap-3 border-t border-gray-100 pt-6 sm:grid-cols-2">
              <Button
                onClick={openReport}
                className="h-12 rounded-full border border-[#1A4D2E] bg-white text-base font-bold text-[#1A4D2E] hover:bg-[#F1F7F2]"
              >
                <span className="flex items-center justify-center gap-2"><Printer className="h-5 w-5" /> ดูตัวอย่าง / พิมพ์รายงาน</span>
              </Button>

              {!userLoading && isAuthenticated ? (
                savedId ? (
                  <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 text-[15px] font-semibold text-emerald-700">
                    <Check className="h-5 w-5" /> บันทึกแล้ว ·
                    <Link href="/history" className="flex items-center gap-1 underline"><History className="h-4 w-4" /> ดูประวัติ</Link>
                  </div>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 rounded-full bg-[#1A4D2E] text-base font-bold text-white hover:bg-[#143a22] disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> กำลังบันทึก…</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2"><Sprout className="h-5 w-5" /> บันทึกลงประวัติ</span>
                    )}
                  </Button>
                )
              ) : (
                !userLoading && (
                  <p className="self-center text-center text-sm text-gray-500">
                    <Link href="/login" className="font-semibold text-[#1A4D2E] hover:underline">เข้าสู่ระบบ</Link> เพื่อบันทึกผลลงประวัติ
                  </p>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* แผนที่ดึงค่าดิน */}
      <Dialog.Root open={soilMapOpen} onOpenChange={setSoilMapOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
          <Dialog.Content className="fixed inset-x-0 top-1/2 z-[101] mx-auto w-[95vw] max-w-3xl -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <Dialog.Title className="sr-only">เลือกพิกัดเพื่อดึงค่าดิน</Dialog.Title>
            <Dialog.Description className="sr-only">ปักหมุดตำแหน่งแปลงเพื่อดึงค่า OM P K จากแผนที่ดิน</Dialog.Description>
            {soilMapOpen && (
              <MapPicker
                onConfirm={handleSoilMapPick}
                onCancel={() => setSoilMapOpen(false)}
                initialLat={farmer.lat ? Number(farmer.lat) : undefined}
                initialLng={farmer.lng ? Number(farmer.lng) : undefined}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
