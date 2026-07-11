"use client"

import { useState } from "react"
import FRUIT_DATA from "@/lib/fruit_fertilizer.json"

// พืชที่มีการคำนวณจริง (อ้างอิงตาราง KM ไม้ผล 100% ของกรมพัฒนาที่ดิน)
type FruitKey =
  | "durian" | "mangosteen" | "rambutan" | "mango" | "longan"
  | "lychee" | "orange" | "coconut" | "pineapple"

// พืชอื่น (mockup — ยังไม่มีสูตรอ้างอิง)
type MockupKey =
  | "rice" | "maize" | "sugarcane" | "cassava" | "rubber"
  | "jackfruit" | "guava" | "banana" | "lime"
  | "chili" | "tomato" | "cucumber" | "leafy" | "pumpkin"

type CropType = FruitKey | MockupKey

const CROP_LABEL: Record<CropType, string> = {
  // ไม้ผล (คำนวณจริง)
  durian: "ทุเรียน",
  mangosteen: "มังคุด",
  rambutan: "เงาะ",
  mango: "มะม่วง",
  longan: "ลำไย",
  lychee: "ลิ้นจี่",
  orange: "ส้ม",
  coconut: "มะพร้าว",
  pineapple: "สับปะรด",
  // ไม้ผลอื่น (mockup)
  jackfruit: "ขนุน",
  guava: "ฝรั่ง",
  banana: "กล้วย",
  lime: "มะนาว",
  // พืชไร่ (mockup)
  rice: "ข้าว",
  maize: "ข้าวโพดเลี้ยงสัตว์",
  sugarcane: "อ้อย",
  cassava: "มันสำปะหลัง",
  rubber: "ยางพารา",
  // ผัก (mockup)
  chili: "พริก",
  tomato: "มะเขือเทศ",
  cucumber: "แตงกวา",
  leafy: "ผักกาด/ผักใบ",
  pumpkin: "ฟักทอง",
}

const FRUIT_KEYS: FruitKey[] = ["durian", "mangosteen", "rambutan", "mango", "longan", "lychee", "orange", "coconut", "pineapple"]

const CROP_GROUPS: { label: string; crops: CropType[] }[] = [
  { label: "ไม้ผล (คำนวณจริง)", crops: FRUIT_KEYS },
  { label: "ไม้ผลอื่น (mockup)", crops: ["jackfruit", "guava", "banana", "lime"] },
  { label: "พืชไร่ (mockup)", crops: ["rice", "maize", "sugarcane", "cassava"] },
  { label: "ไม้ยืนต้น (mockup)", crops: ["rubber"] },
  { label: "พืชผัก (mockup)", crops: ["chili", "tomato", "cucumber", "leafy", "pumpkin"] },
]

function isFruit(c: CropType): c is FruitKey {
  return (FRUIT_KEYS as string[]).includes(c)
}

// เกณฑ์ตามตาราง LDD (Excel: 100__ตารางคำนวณปุ๋ยสำหรับ KM ไม้ผล)
// OM: <2 = low, 2-3 = med, >3 = high
// P:  <15 = low, 15-45 = med, >45 = high  (mg/kg)
// K:  <50 = low, 50-100 = med, >100 = high (mg/kg)
type ExcelLevel = "low" | "med" | "high"

function classifyOM(v: number): ExcelLevel {
  if (v < 2) return "low"
  if (v <= 3) return "med"
  return "high"
}
function classifyP(v: number): ExcelLevel {
  if (v < 15) return "low"
  if (v <= 45) return "med"
  return "high"
}
function classifyK(v: number): ExcelLevel {
  if (v < 50) return "low"
  if (v <= 100) return "med"
  return "high"
}

type LevelKey = "ต่ำ" | "ปานกลาง" | "สูง"
const LV_TH: Record<ExcelLevel, LevelKey> = { low: "ต่ำ", med: "ปานกลาง", high: "สูง" }

const LEVEL_COLOR: Record<LevelKey, string> = {
  ต่ำ: "#ff000d",
  ปานกลาง: "#e0a400",
  สูง: "#2fa14b",
}

const LEVEL_BG: Record<LevelKey, string> = {
  ต่ำ: "bg-red-50 border-red-100",
  ปานกลาง: "bg-yellow-50 border-yellow-100",
  สูง: "bg-green-50 border-green-100",
}

const LEVEL_SCORE: Record<ExcelLevel, number> = { low: 1, med: 2, high: 3 }

function overallFertility(total: number): LevelKey {
  if (total <= 4) return "ต่ำ"
  if (total <= 6) return "ปานกลาง"
  return "สูง"
}

type StageKey = "nurture" | "bud" | "fruit" | "quality"
const STAGE_LABEL: Record<StageKey, string> = {
  nurture: "ระยะบำรุงต้น",
  bud: "ระยะสร้างตาดอก",
  fruit: "ระยะบำรุงผล",
  quality: "ระยะปรับปรุงคุณภาพ",
}
const STAGE_ORDER: StageKey[] = ["nurture", "bud", "fruit", "quality"]

type StageDose = { urea: number; dap: number; kcl: number }
type FruitEntry = Record<StageKey, StageDose>
type FruitDataset = Record<FruitKey, Record<string, FruitEntry>>
const FRUIT: FruitDataset = FRUIT_DATA as FruitDataset

// จำนวนต้นต่อไร่ (ระยะปลูกมาตรฐาน)
const TREES_PER_RAI: Record<FruitKey, number> = {
  durian: 25,
  mangosteen: 25,
  rambutan: 25,
  mango: 25,
  longan: 22,
  lychee: 22,
  orange: 40,
  coconut: 22,
  pineapple: 10000,
}

export default function FertilizerPage() {
  const [om, setOm] = useState("")
  const [p, setP] = useState("")
  const [k, setK] = useState("")
  const [rai, setRai] = useState("")
  const [crop, setCrop] = useState<CropType>("durian")
  const [result, setResult] = useState<null | {
    lvOM: ExcelLevel
    lvP: ExcelLevel
    lvK: ExcelLevel
    overall: LevelKey
    totalScore: number
    stages: Record<StageKey, StageDose>  // g/ต้น/ปี
    totalKg: { urea: number; dap: number; kcl: number }  // kg ทั้งสวน/ปี
    raiArea: number
    treeCount: number
    isFruit: boolean
  }>(null)

  function calculate() {
    const omVal = parseFloat(om) || 0
    const pVal  = parseFloat(p)  || 0
    const kVal  = parseFloat(k)  || 0
    const areaRai = Math.max(0.1, parseFloat(rai) || 1)

    const lvOM = classifyOM(omVal)
    const lvP  = classifyP(pVal)
    const lvK  = classifyK(kVal)

    const totalScore = LEVEL_SCORE[lvOM] + LEVEL_SCORE[lvP] + LEVEL_SCORE[lvK]
    const overall = overallFertility(totalScore)

    let stages: Record<StageKey, StageDose>
    let cropIsFruit = isFruit(crop)
    let nTrees = 0

    if (cropIsFruit) {
      const key = `${lvOM}_${lvP}_${lvK}`
      const entry = FRUIT[crop as FruitKey][key]
      stages = entry
      nTrees = Math.round(TREES_PER_RAI[crop as FruitKey] * areaRai)
    } else {
      stages = {
        nurture: { urea: 0, dap: 0, kcl: 0 },
        bud:     { urea: 0, dap: 0, kcl: 0 },
        fruit:   { urea: 0, dap: 0, kcl: 0 },
        quality: { urea: 0, dap: 0, kcl: 0 },
      }
    }

    // รวมกรัม/ต้น/ปี × จำนวนต้น → กก./ปี
    const sumG = { urea: 0, dap: 0, kcl: 0 }
    for (const s of STAGE_ORDER) {
      sumG.urea += stages[s].urea
      sumG.dap  += stages[s].dap
      sumG.kcl  += stages[s].kcl
    }
    const totalKg = {
      urea: (sumG.urea * nTrees) / 1000,
      dap:  (sumG.dap  * nTrees) / 1000,
      kcl:  (sumG.kcl  * nTrees) / 1000,
    }

    setResult({
      lvOM, lvP, lvK, overall, totalScore,
      stages, totalKg, raiArea: areaRai, treeCount: nTrees, isFruit: cropIsFruit,
    })
  }

  const omLv = om ? classifyOM(parseFloat(om)) : null
  const pLv  = p  ? classifyP(parseFloat(p))   : null
  const kLv  = k  ? classifyK(parseFloat(k))   : null

  const currentIsFruit = isFruit(crop)

  return (
    <div className="font-thai pb-32 pt-16">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8 mt-4 mx-4">

        {/* พืชและจำนวนต้น */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">ชนิดพืช</label>
            <select
              value={crop}
              onChange={(e) => { setCrop(e.target.value as CropType); setResult(null) }}
              className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
            >
              {CROP_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.crops.map((c) => (
                    <option key={c} value={c}>{CROP_LABEL[c]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {!currentIsFruit && (
              <p className="text-[11px] text-orange-600 pl-2">พืชนี้ยังเป็น mockup — ยังไม่มีข้อมูลอ้างอิงในระบบ</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">พื้นที่ (ไร่)</label>
            <input
              type="number" min="0.1" step="0.1" placeholder="เช่น 5"
              value={rai} onChange={(e) => setRai(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
            />
          </div>
        </div>

        {/* ค่าธาตุอาหารดิน */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <p className="text-gray-800 font-semibold text-lg">ค่าธาตุอาหารในดิน (จากผลวิเคราะห์)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">อินทรียวัตถุ OM (%)</label>
              <input
                type="number" min="0" step="0.1" placeholder="เช่น 1.5"
                value={om} onChange={(e) => setOm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
              {omLv && (
                <p className="text-xs pl-2 font-semibold" style={{ color: LEVEL_COLOR[LV_TH[omLv]] }}>ระดับ: {LV_TH[omLv]}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">ฟอสฟอรัส P (มก./กก.)</label>
              <input
                type="number" min="0" placeholder="เช่น 20"
                value={p} onChange={(e) => setP(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
              {pLv && (
                <p className="text-xs pl-2 font-semibold" style={{ color: LEVEL_COLOR[LV_TH[pLv]] }}>ระดับ: {LV_TH[pLv]}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">โพแทสเซียม K (มก./กก.)</label>
              <input
                type="number" min="0" placeholder="เช่น 80"
                value={k} onChange={(e) => setK(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
              {kLv && (
                <p className="text-xs pl-2 font-semibold" style={{ color: LEVEL_COLOR[LV_TH[kLv]] }}>ระดับ: {LV_TH[kLv]}</p>
              )}
            </div>
          </div>
        </div>

        {/* คำนวณ */}
        <div className="flex justify-center pt-4">
          <button
            onClick={calculate}
            className="px-12 h-10 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-medium text-[15px] shadow-sm hover:shadow-md transition-all"
          >
            คำนวณสูตรปุ๋ย
          </button>
        </div>

        {/* ผลลัพธ์ */}
        {result && (
          <div className="space-y-4 pt-6 border-t border-gray-100">

            {/* การ์ดสรุปความอุดมสมบูรณ์รวม */}
            <div className={`rounded-2xl border p-5 ${LEVEL_BG[result.overall]}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">ระดับความอุดมสมบูรณ์ของดิน</p>
                  <p className="text-2xl font-bold" style={{ color: LEVEL_COLOR[result.overall] }}>
                    {result.overall}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">คะแนนรวม</p>
                  <p className="text-3xl font-bold" style={{ color: LEVEL_COLOR[result.overall] }}>{result.totalScore}<span className="text-base text-gray-400 font-normal">/9</span></p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                เกณฑ์กรมพัฒนาที่ดิน: 3-4 ต่ำ, 5-6 ปานกลาง, 7-9 สูง
              </p>
            </div>

            {!result.isFruit ? (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 text-center">
                <p className="text-sm text-orange-700 font-semibold">
                  พืชนี้ยังเป็น mockup
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  ระบบยังไม่มีตารางคำนวณอ้างอิงสำหรับ &quot;{CROP_LABEL[crop]}&quot; รอเพิ่มข้อมูลจากกรมพัฒนาที่ดิน
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-800 font-semibold text-lg">
                  คำแนะนำปุ๋ย {CROP_LABEL[crop]}
                </p>

                {/* 4 ระยะ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {STAGE_ORDER.map((s) => {
                    const dose = result.stages[s]
                    const empty = dose.urea === 0 && dose.dap === 0 && dose.kcl === 0
                    return (
                      <div key={s} className="rounded-2xl border border-gray-100 p-4 bg-[#F5F7F5]">
                        <p className="text-sm font-semibold text-[#1A4D2E] mb-2">{STAGE_LABEL[s]}</p>
                        {empty ? (
                          <p className="text-xs text-gray-500 italic">ไม่ต้องใส่ในระยะนี้</p>
                        ) : (
                          <div className="space-y-1 text-xs text-gray-700">
                            <FertRow name="ยูเรีย (46-0-0)"                    g={dose.urea} />
                            <FertRow name="ไดแอมโมเนียมฟอสเฟต (18-46-0)"  g={dose.dap} />
                            <FertRow name="โพแทสเซียมคลอไรด์ (0-0-60)"     g={dose.kcl} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* รวมทั้งสวน */}
                <p className="text-gray-800 font-semibold text-lg pt-2">
                  รวมทั้งสวน ({result.raiArea} ไร่ ≈ {result.treeCount} ต้น/ปี)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <SumCard label="ยูเรีย (46-0-0)"   kg={result.totalKg.urea} color="bg-blue-50 text-blue-700" />
                  <SumCard label="18-46-0"          kg={result.totalKg.dap}  color="bg-orange-50 text-orange-700" />
                  <SumCard label="0-0-60"           kg={result.totalKg.kcl}  color="bg-purple-50 text-purple-700" />
                </div>

              </>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

function FertRow({ name, g }: { name: string; g: number }) {
  if (g === 0) return null
  return (
    <div className="flex items-center justify-between">
      <span>{name}</span>
      <span className="font-semibold text-[#1A4D2E]">{g} ก./ต้น</span>
    </div>
  )
}

function SumCard({ label, kg, color }: { label: string; kg: number; color: string }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${color}`}>
      <p className="text-[11px] font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{kg.toFixed(1)}</p>
      <p className="text-xs opacity-70">kg</p>
    </div>
  )
}
