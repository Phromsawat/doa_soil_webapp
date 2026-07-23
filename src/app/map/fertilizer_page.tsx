"use client"

import { useMemo, useState } from "react"
import FRUIT_DATA from "@/lib/fruit_fertilizer.json"

/* =============================================================================
   Crop keys — only crops with real reference data (LDD)
   ============================================================================= */
type FruitKey =
  | "durian" | "mangosteen" | "rambutan" | "mango" | "longan"
  | "lychee" | "orange" | "coconut" | "pineapple"

type FieldKey = "rice_photo" | "rice_nonphoto" | "corn_feed" | "sugarcane" | "cassava"

type CropKey = FruitKey | FieldKey

const CROP_LABEL: Record<CropKey, string> = {
  durian: "ทุเรียน",
  mangosteen: "มังคุด",
  rambutan: "เงาะ",
  mango: "มะม่วง",
  longan: "ลำไย",
  lychee: "ลิ้นจี่",
  orange: "ส้ม",
  coconut: "มะพร้าว",
  pineapple: "สับปะรด",
  rice_photo: "ข้าวไวแสง",
  rice_nonphoto: "ข้าวไม่ไวแสง",
  corn_feed: "ข้าวโพดเลี้ยงสัตว์",
  sugarcane: "อ้อยปลูก",
  cassava: "มันสำปะหลัง",
}

const FRUIT_KEYS: FruitKey[] = ["durian","mangosteen","rambutan","mango","longan","lychee","orange","coconut","pineapple"]
const FIELD_KEYS: FieldKey[] = ["rice_photo","rice_nonphoto","corn_feed","sugarcane","cassava"]

const CROP_GROUPS: { label: string; crops: CropKey[] }[] = [
  { label: "ไม้ผล",  crops: FRUIT_KEYS },
  { label: "พืชไร่", crops: FIELD_KEYS },
]

function isFruit(c: CropKey): c is FruitKey {
  return (FRUIT_KEYS as string[]).includes(c)
}

/* =============================================================================
   Soil-level classification (thresholds from MAP.md — uniform for the app)
   ============================================================================= */
type Level = "low" | "med" | "high"

function classifyOM(v: number): Level {
  if (v < 1.5) return "low"
  if (v <= 3.5) return "med"
  return "high"
}
function classifyP(v: number): Level {
  if (v < 10) return "low"
  if (v <= 25) return "med"
  return "high"
}
function classifyK(v: number): Level {
  if (v < 60) return "low"
  if (v <= 90) return "med"
  return "high"
}

const LV_TH: Record<Level, "ต่ำ" | "ปานกลาง" | "สูง"> = { low:"ต่ำ", med:"ปานกลาง", high:"สูง" }
const LV_COLOR: Record<Level, string> = { low:"#ff000d", med:"#e0a400", high:"#2fa14b" }
const LV_BG: Record<Level, string> = {
  low:  "bg-red-50 text-red-700 border-red-100",
  med:  "bg-yellow-50 text-yellow-800 border-yellow-100",
  high: "bg-green-50 text-green-700 border-green-100",
}

/* =============================================================================
   Fruit data — existing 27-row dataset (100% chemical)
   ============================================================================= */
type StageKey = "nurture" | "bud" | "fruit" | "quality"
type StageDose = { urea: number; dap: number; kcl: number }
type FruitEntry = Record<StageKey, StageDose>
const FRUIT: Record<FruitKey, Record<string, FruitEntry>> = FRUIT_DATA as Record<FruitKey, Record<string, FruitEntry>>

const STAGE_LABEL_FRUIT: Record<StageKey, string> = {
  nurture: "บำรุงต้น",
  bud: "สร้างตาดอก",
  fruit: "บำรุงผล",
  quality: "ปรับปรุงคุณภาพ",
}
const STAGE_ORDER_FRUIT: StageKey[] = ["nurture","bud","fruit","quality"]

const TREES_PER_RAI: Record<FruitKey, number> = {
  durian: 25, mangosteen: 25, rambutan: 25, mango: 25, longan: 22,
  lychee: 22, orange: 40, coconut: 22, pineapple: 10000,
}

/* Fruit 70% chem + 30% organic — anchor rows extracted from LDD file 3 */
type StageDose70 = { urea: number; dap: number; kcl: number; organic_kg: number }
type FruitEntry70 = Record<StageKey, StageDose70>
const FRUIT_70: Partial<Record<FruitKey, Record<"low"|"med"|"high", FruitEntry70>>> = {
  durian: {
    low:  { nurture:{urea:1100, dap:500, kcl:400, organic_kg:140}, bud:{urea:500, dap:500, kcl:800, organic_kg:50}, fruit:{urea:700, dap:700, kcl:800, organic_kg:50}, quality:{urea:0, dap:0, kcl:600, organic_kg:0} },
    med:  { nurture:{urea:500,  dap:300, kcl:200, organic_kg:50},  bud:{urea:300, dap:300, kcl:400, organic_kg:20}, fruit:{urea:300, dap:300, kcl:400, organic_kg:50}, quality:{urea:0, dap:0, kcl:300, organic_kg:0} },
    high: { nurture:{urea:400,  dap:100, kcl:100, organic_kg:50},  bud:{urea:200, dap:100, kcl:200, organic_kg:50}, fruit:{urea:300, dap:200, kcl:200, organic_kg:20}, quality:{urea:0, dap:0, kcl:200, organic_kg:0} },
  },
  mango: {
    low:  { nurture:{urea:700, dap:300, kcl:200, organic_kg:90}, bud:{urea:400, dap:300, kcl:500, organic_kg:50}, fruit:{urea:400, dap:300, kcl:500, organic_kg:50}, quality:{urea:0, dap:0, kcl:500, organic_kg:0} },
    med:  { nurture:{urea:400, dap:100, kcl:100, organic_kg:50}, bud:{urea:200, dap:100, kcl:200, organic_kg:20}, fruit:{urea:200, dap:100, kcl:200, organic_kg:20}, quality:{urea:0, dap:0, kcl:200, organic_kg:0} },
    high: { nurture:{urea:200, dap:70,  kcl:60,  organic_kg:20}, bud:{urea:90,  dap:70,  kcl:100, organic_kg:10}, fruit:{urea:90,  dap:70,  kcl:100, organic_kg:10}, quality:{urea:0, dap:0, kcl:100, organic_kg:0} },
  },
  longan: {
    low:  { nurture:{urea:800, dap:600, kcl:300, organic_kg:120}, bud:{urea:400, dap:600, kcl:700, organic_kg:50}, fruit:{urea:400, dap:600, kcl:700, organic_kg:50}, quality:{urea:0, dap:0, kcl:500, organic_kg:0} },
    med:  { nurture:{urea:400, dap:300, kcl:200, organic_kg:50},  bud:{urea:200, dap:300, kcl:300, organic_kg:20}, fruit:{urea:200, dap:300, kcl:300, organic_kg:20}, quality:{urea:0, dap:0, kcl:300, organic_kg:0} },
    high: { nurture:{urea:200, dap:100, kcl:90,  organic_kg:20},  bud:{urea:90,  dap:100, kcl:200, organic_kg:30}, fruit:{urea:90,  dap:100, kcl:200, organic_kg:30}, quality:{urea:0, dap:0, kcl:100, organic_kg:0} },
  },
  orange: {
    low:  { nurture:{urea:400, dap:300, kcl:200, organic_kg:50}, bud:{urea:200, dap:300, kcl:300, organic_kg:20}, fruit:{urea:200, dap:300, kcl:300, organic_kg:20}, quality:{urea:0, dap:0, kcl:200, organic_kg:0} },
    med:  { nurture:{urea:200, dap:200, kcl:80,  organic_kg:20}, bud:{urea:100, dap:200, kcl:200, organic_kg:20}, fruit:{urea:100, dap:200, kcl:200, organic_kg:20}, quality:{urea:0, dap:0, kcl:100, organic_kg:0} },
    high: { nurture:{urea:100, dap:90,  kcl:40,  organic_kg:20}, bud:{urea:50,  dap:90,  kcl:80,  organic_kg:10}, fruit:{urea:50,  dap:90,  kcl:80,  organic_kg:10}, quality:{urea:0, dap:0, kcl:60,  organic_kg:0} },
  },
}
// share durian template for missing fruits
;(["mangosteen","rambutan","lychee","coconut"] as FruitKey[]).forEach(k => { FRUIT_70[k] = FRUIT_70.durian })

/* =============================================================================
   Field crops — kg/rai per dose (2 splits: รองพื้น + แต่งหน้า)
   Anchor rows from LDD file 6
   ============================================================================= */
type FieldDose = { urea?: number; dap?: number; kcl?: number }
type FieldEntry = { dose1: FieldDose; dose2: FieldDose }

const FIELD: Record<FieldKey, Record<Level, FieldEntry>> = {
  rice_photo: {
    low:  { dose1:{urea:5,  dap:13, kcl:10}, dose2:{urea:10} },
    med:  { dose1:{urea:4,  dap:7,  kcl:5},  dose2:{urea:7}  },
    high: { dose1:{urea:4},                    dose2:{urea:4}  },
  },
  rice_nonphoto: {
    low:  { dose1:{urea:14, dap:13, kcl:10}, dose2:{urea:20} },
    med:  { dose1:{urea:10, dap:7,  kcl:5},  dose2:{urea:13} },
    high: { dose1:{urea:7},                    dose2:{urea:7}  },
  },
  corn_feed: {
    low:  { dose1:{urea:8,  dap:22, kcl:25}, dose2:{urea:16} },
    med:  { dose1:{urea:7,  dap:11, kcl:17}, dose2:{urea:11} },
    high: { dose1:{urea:3,  dap:5,  kcl:8},  dose2:{urea:5}  },
  },
  sugarcane: {
    low:  { dose1:{urea:22, dap:20, kcl:30}, dose2:{urea:29} },
    med:  { dose1:{urea:11, dap:13, kcl:20}, dose2:{urea:16} },
    high: { dose1:{urea:7,  dap:7,  kcl:7},  dose2:{urea:6}  },
  },
  cassava: {
    low:  { dose1:{urea:28, dap:17, kcl:27}, dose2:{} },
    med:  { dose1:{urea:14, dap:9,  kcl:13}, dose2:{} },
    high: { dose1:{urea:7,  dap:4,  kcl:7},  dose2:{} },
  },
}

const STAGE_LABEL_FIELD = { dose1:"รองพื้น / ครั้งที่ 1", dose2:"แต่งหน้า / ครั้งที่ 2" } as const

/* =============================================================================
   Popular blended formulas per crop (Thai LDD + common practice)
   ============================================================================= */
const POPULAR_MIXED: Record<CropKey, string[]> = {
  durian:      ["15-15-15","13-13-21","12-24-12","25-7-7"],
  mango:       ["15-15-15","13-13-21","12-24-12"],
  longan:      ["15-15-15","13-13-21","12-24-12","0-52-34"],
  lychee:      ["15-15-15","13-13-21","12-24-12"],
  rambutan:    ["15-15-15","13-13-21","12-24-12"],
  mangosteen:  ["15-15-15","13-13-21","12-24-12"],
  orange:      ["15-15-15","13-13-21","12-24-12"],
  coconut:     ["15-15-15","13-13-21"],
  pineapple:   ["21-0-0","18-46-0","13-13-21"],
  rice_photo:    ["16-20-0","46-0-0","15-15-15","16-16-8"],
  rice_nonphoto: ["16-20-0","46-0-0","15-15-15","16-16-8"],
  corn_feed:     ["15-15-15","46-0-0","16-20-0","21-0-0"],
  sugarcane:     ["15-15-15","46-0-0","21-0-0","16-16-8"],
  cassava:       ["15-15-15","13-13-21","46-0-0"],
}

/* =============================================================================
   Bio-fertilizer recommendations
   ============================================================================= */
type BioKey = "pdd11" | "pdd12" | "myco" | "pgpr"

const BIO_INFO: Record<BioKey, { name: string; rate: string; how: string; best: string }> = {
  pdd11: { name:"พด.11 (ไรโซเบียม)",           rate:"200 ก. คลุกเมล็ด 5-10 กก.",   how:"คลุกเมล็ดก่อนหยอด/หว่าน 1 ชม.",       best:"พืชตระกูลถั่ว" },
  pdd12: { name:"พด.12 (ตรึง N, ละลาย P/K)",    rate:"200 ก./ไร่ (คลุกกับปุ๋ยหมัก 100 กก.)", how:"หว่านลงดินก่อนปลูก หรือรอบทรงพุ่ม", best:"พืชทั่วไป (ผัก/พืชไร่/ไม้ผล)" },
  myco:  { name:"ไมคอร์ไรซา (Mycorrhiza)",       rate:"20-50 ก./ต้น",                 how:"ใส่ใต้ทรงพุ่ม รดน้ำตาม / คลุกกล้า",  best:"ไม้ผล — เพิ่มการดูด P" },
  pgpr:  { name:"PGPR / Azospirillum",           rate:"1-2 ล./ไร่ (แช่/พ่น)",         how:"พ่นทางใบ 15-30 วัน/ครั้ง",           best:"ข้าว, พืชไร่, ผัก — ตรึง N" },
}

const BIO_RECS: Record<CropKey, { primary: BioKey; extra: BioKey[]; note?: string }> = {
  durian:      { primary:"myco",  extra:["pdd12","pgpr"], note:"ไมคอร์ไรซาช่วยไม้ผลดูดฟอสฟอรัสได้ดีขึ้น 20-30%" },
  mango:       { primary:"myco",  extra:["pdd12"],         note:"ใช้ไมคอร์ไรซาตอนย้ายกล้าและใส่ใต้ทรงพุ่มปีละครั้ง" },
  longan:      { primary:"myco",  extra:["pdd12"] },
  lychee:      { primary:"myco",  extra:["pdd12"] },
  rambutan:    { primary:"myco",  extra:["pdd12"] },
  mangosteen:  { primary:"myco",  extra:["pdd12"] },
  orange:      { primary:"myco",  extra:["pdd12","pgpr"] },
  coconut:     { primary:"pdd12", extra:["pgpr"] },
  pineapple:   { primary:"pdd12", extra:["pgpr"] },
  rice_photo:    { primary:"pgpr", extra:["pdd12"], note:"Azospirillum ตรึงไนโตรเจนในนาข้าว ลดปุ๋ยยูเรียได้ ~30%" },
  rice_nonphoto: { primary:"pgpr", extra:["pdd12"], note:"คลุกเมล็ดก่อนหว่านหรือพ่นทางใบระยะแตกกอ" },
  corn_feed:     { primary:"pgpr", extra:["pdd12"] },
  sugarcane:     { primary:"pgpr", extra:["pdd12"] },
  cassava:       { primary:"pdd12", extra:["pgpr"] },
}

/* =============================================================================
   Fertilizer type + variant options
   ============================================================================= */
type FertType = "chem" | "mix" | "bio"
type ChemVariant = "single" | "mixed100"
type MixVariant = "mix70" | "mix50"

const TYPE_TABS: { key: FertType; label: string }[] = [
  { key:"chem", label:"ปุ๋ยเคมี" },
  { key:"mix",  label:"เคมี + อินทรีย์" },
  { key:"bio",  label:"ปุ๋ยชีวภาพ" },
]

const CHEM_VARIANTS: { key: ChemVariant; label: string; sub: string }[] = [
  { key:"single",   label:"แม่ปุ๋ยเชิงเดี่ยว",   sub:"46-0-0 + 18-46-0 + 0-0-60" },
  { key:"mixed100", label:"ปุ๋ยผสมสำเร็จ 100%", sub:"15-15-15, 13-13-21 ฯลฯ" },
]
const MIX_VARIANTS: { key: MixVariant; label: string; sub: string }[] = [
  { key:"mix70", label:"70% เคมี + 30% อินทรีย์", sub:"ตามตาราง KM ไม้ผล 70%" },
  { key:"mix50", label:"50% เคมี + 50% อินทรีย์", sub:"เน้นดินสมบูรณ์" },
]

/* =============================================================================
   Component
   ============================================================================= */
export default function FertilizerPage() {
  const [om, setOm] = useState("")
  const [p, setP] = useState("")
  const [k, setK] = useState("")
  const [rai, setRai] = useState("")
  const [crop, setCrop] = useState<CropKey>("durian")
  const [type, setType] = useState<FertType>("chem")
  const [chemVar, setChemVar] = useState<ChemVariant>("single")
  const [mixVar, setMixVar] = useState<MixVariant>("mix70")
  const [showResult, setShowResult] = useState(false)

  const omLv = om ? classifyOM(parseFloat(om)) : null
  const pLv  = p  ? classifyP(parseFloat(p))   : null
  const kLv  = k  ? classifyK(parseFloat(k))   : null

  const overall: Level | null = useMemo(() => {
    if (!omLv || !pLv || !kLv) return null
    const cnt = { low:0, med:0, high:0 } as Record<Level, number>
    ;[omLv, pLv, kLv].forEach(l => { cnt[l] += 1 })
    if (cnt.low >= 2) return "low"
    if (cnt.high >= 2) return "high"
    if (cnt.low && !cnt.high) return "low"
    if (cnt.high && !cnt.low) return "high"
    return "med"
  }, [omLv, pLv, kLv])

  function calculate() {
    setShowResult(true)
  }

  const currentIsFruit = isFruit(crop)
  const areaRai = Math.max(0.1, parseFloat(rai) || 1)

  return (
    <div className="font-thai pb-32 pt-16">
      <div className="max-w-3xl mx-auto px-4 space-y-4 mt-4">

        {/* Crop + Area */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">ข้อมูลแปลง</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">ชนิดพืช</label>
              <select
                value={crop}
                onChange={(e) => { setCrop(e.target.value as CropKey); setShowResult(false) }}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              >
                {CROP_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.crops.map(c => <option key={c} value={c}>{CROP_LABEL[c]}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">พื้นที่ (ไร่)</label>
              <input
                type="number" min="0.1" step="0.1" placeholder="เช่น 5"
                value={rai} onChange={(e) => setRai(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
            </div>
          </div>
        </section>

        {/* Soil analysis */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">ค่าธาตุอาหารในดิน</p>
            <p className="text-[11px] text-gray-500">จากผลวิเคราะห์</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SoilInput label="อินทรียวัตถุ (OM)" unit="%"       value={om} onChange={setOm} lv={omLv} placeholder="เช่น 1.5" />
            <SoilInput label="ฟอสฟอรัส (P)"    unit="มก./กก." value={p}  onChange={setP}  lv={pLv}  placeholder="เช่น 20" />
            <SoilInput label="โพแทสเซียม (K)"   unit="มก./กก." value={k}  onChange={setK}  lv={kLv}  placeholder="เช่น 80" />
          </div>
        </section>

        {/* Fertilizer type */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">รูปแบบการให้ปุ๋ย</p>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`h-11 rounded-full text-sm font-semibold transition-all ${
                  type === t.key
                    ? "bg-[#1A4D2E] text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-[#1A4D2E]/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {type === "chem" && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-600 mb-2">เลือกรูปแบบสูตร</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {CHEM_VARIANTS.map(v => (
                  <VariantCard key={v.key} label={v.label} sub={v.sub} active={chemVar === v.key} onClick={() => setChemVar(v.key)} />
                ))}
              </div>
            </div>
          )}
          {type === "mix" && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-600 mb-2">เลือกสัดส่วน</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {MIX_VARIANTS.map(v => (
                  <VariantCard key={v.key} label={v.label} sub={v.sub} active={mixVar === v.key} onClick={() => setMixVar(v.key)} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Calculate button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={calculate}
            className="px-12 h-11 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-semibold text-[15px] shadow-md hover:shadow-lg transition-all"
          >
            คำนวณสูตรปุ๋ย
          </button>
        </div>

        {/* Result */}
        {showResult && omLv && pLv && kLv && overall && (
          <>
            <OverallCard overall={overall} omLv={omLv} pLv={pLv} kLv={kLv} />

            {type === "bio" ? (
              <BioCard cropKey={crop} />
            ) : type === "mix" ? (
              <MixCard cropKey={crop} omLv={omLv} pLv={pLv} kLv={kLv} rai={areaRai} variant={mixVar} />
            ) : chemVar === "single" ? (
              <ChemSingleCard cropKey={crop} omLv={omLv} pLv={pLv} kLv={kLv} rai={areaRai} />
            ) : (
              <ChemMixedCard cropKey={crop} />
            )}

            {(type === "chem") && <PopularAlts cropKey={crop} />}
          </>
        )}

      </div>
    </div>
  )
}

/* =============================================================================
   Small components
   ============================================================================= */

function SoilInput({ label, unit, value, onChange, lv, placeholder }:{
  label: string; unit: string; value: string; onChange: (v:string)=>void; lv: Level | null; placeholder: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">
        {label} <span className="text-gray-400">{unit}</span>
      </label>
      <input
        type="number" min="0" step="0.1" placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
      />
      <div className="pl-2 h-5">
        {lv && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${LV_BG[lv]}`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: LV_COLOR[lv] }} />
            {LV_TH[lv]}
          </span>
        )}
      </div>
    </div>
  )
}

function VariantCard({ label, sub, active, onClick }: { label: string; sub: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl px-4 py-3 transition-all ${
        active ? "bg-[#F0F7F2] border-2 border-[#1A4D2E] text-[#1A4D2E]" : "bg-white border border-gray-100 text-gray-700 hover:border-[#1A4D2E]/40"
      }`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
    </button>
  )
}

function OverallCard({ overall, omLv, pLv, kLv }: { overall: Level; omLv: Level; pLv: Level; kLv: Level }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] text-gray-500 mb-1">ระดับความอุดมสมบูรณ์ของดิน</p>
          <p className="text-2xl font-bold" style={{ color: LV_COLOR[overall] }}>{LV_TH[overall]}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {(["om","p","k"] as const).map((m, i) => {
            const lv = [omLv, pLv, kLv][i]
            const lbl = ["OM","P","K"][i]
            return (
              <div key={m}>
                <p className="text-[10px] text-gray-500 mb-1">{lbl}</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${LV_BG[lv]}`}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: LV_COLOR[lv] }} />
                  {LV_TH[lv]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* =============================================================================
   Chem single (แม่ปุ๋ยเชิงเดี่ยว) — reads 27-row table for fruit or anchor for field
   ============================================================================= */
function ChemSingleCard({ cropKey, omLv, pLv, kLv, rai }: { cropKey: CropKey; omLv: Level; pLv: Level; kLv: Level; rai: number }) {
  const label = CROP_LABEL[cropKey]

  if (isFruit(cropKey)) {
    const key = `${omLv}_${pLv}_${kLv}`
    const entry: FruitEntry = FRUIT[cropKey][key]
    const treeCount = Math.round(TREES_PER_RAI[cropKey] * rai)
    const totalG = { urea: 0, dap: 0, kcl: 0 }
    STAGE_ORDER_FRUIT.forEach(s => { totalG.urea += entry[s].urea; totalG.dap += entry[s].dap; totalG.kcl += entry[s].kcl })
    const totalKg = { urea: totalG.urea*treeCount/1000, dap: totalG.dap*treeCount/1000, kcl: totalG.kcl*treeCount/1000 }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-800">คำแนะนำปุ๋ย {label}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STAGE_ORDER_FRUIT.map(s => {
            const d = entry[s]
            const empty = d.urea === 0 && d.dap === 0 && d.kcl === 0
            return (
              <div key={s} className="rounded-2xl border border-gray-100 p-4 bg-[#FAFBF9]">
                <p className="text-[13px] font-semibold text-[#1A4D2E] mb-2">{STAGE_LABEL_FRUIT[s]}</p>
                {empty ? (
                  <p className="text-xs text-gray-400 italic">ไม่ต้องใส่ในระยะนี้</p>
                ) : (
                  <div className="space-y-1 text-xs text-gray-700">
                    <FertRow name="ยูเรีย (46-0-0)"            g={d.urea} unit="ก./ต้น" />
                    <FertRow name="ไดแอมโมเนียมฟอสเฟต (18-46-0)" g={d.dap}  unit="ก./ต้น" />
                    <FertRow name="โพแทสเซียมคลอไรด์ (0-0-60)" g={d.kcl}  unit="ก./ต้น" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-sm font-semibold text-gray-800 pt-2">
          รวมทั้งสวน ({rai} ไร่ ≈ {treeCount.toLocaleString()} ต้น/ปี)
        </p>
        <div className="grid grid-cols-3 gap-3">
          <SumCard label="ยูเรีย (46-0-0)" kg={totalKg.urea} color="bg-blue-50 text-blue-700" />
          <SumCard label="18-46-0"        kg={totalKg.dap}  color="bg-orange-50 text-orange-700" />
          <SumCard label="0-0-60"         kg={totalKg.kcl}  color="bg-purple-50 text-purple-700" />
        </div>
      </div>
    )
  }

  // Field crop
  const overall = pickLevelAnchor(omLv, pLv, kLv)
  const entry = FIELD[cropKey as FieldKey][overall]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <p className="text-sm font-semibold text-gray-800">คำแนะนำปุ๋ย {label}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(["dose1","dose2"] as const).map(s => {
          const d = entry[s]
          const empty = !d.urea && !d.dap && !d.kcl
          return (
            <div key={s} className="rounded-2xl border border-gray-100 p-4 bg-[#FAFBF9]">
              <p className="text-[13px] font-semibold text-[#1A4D2E] mb-2">{STAGE_LABEL_FIELD[s]}</p>
              {empty ? (
                <p className="text-xs text-gray-400 italic">ไม่ต้องใส่ในระยะนี้</p>
              ) : (
                <div className="space-y-1 text-xs text-gray-700">
                  {d.urea ? <FertRow name="ยูเรีย (46-0-0)"            g={d.urea} unit="กก./ไร่" /> : null}
                  {d.dap  ? <FertRow name="ไดแอมโมเนียมฟอสเฟต (18-46-0)" g={d.dap}  unit="กก./ไร่" /> : null}
                  {d.kcl  ? <FertRow name="โพแทสเซียมคลอไรด์ (0-0-60)" g={d.kcl}  unit="กก./ไร่" /> : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-sm font-semibold text-gray-800 pt-2">รวมทั้งแปลง ({rai} ไร่)</p>
      <div className="grid grid-cols-3 gap-3">
        <SumCard label="ยูเรีย (46-0-0)" kg={sumField(entry, "urea")*rai} color="bg-blue-50 text-blue-700" />
        <SumCard label="18-46-0"        kg={sumField(entry, "dap") *rai} color="bg-orange-50 text-orange-700" />
        <SumCard label="0-0-60"         kg={sumField(entry, "kcl") *rai} color="bg-purple-50 text-purple-700" />
      </div>
    </div>
  )
}

function sumField(entry: FieldEntry, key: keyof FieldDose): number {
  return (entry.dose1[key] || 0) + (entry.dose2[key] || 0)
}

function pickLevelAnchor(a: Level, b: Level, c: Level): Level {
  const score = [a,b,c].map(l => l==="low"?0:l==="med"?1:2).reduce((x,y) => x+y, 0)
  if (score <= 1) return "low"
  if (score <= 4) return "med"
  return "high"
}

/* =============================================================================
   Chem — ปุ๋ยผสมสำเร็จ 100% (list of popular blended grades)
   ============================================================================= */
function ChemMixedCard({ cropKey }: { cropKey: CropKey }) {
  const label = CROP_LABEL[cropKey]
  const alts = POPULAR_MIXED[cropKey] || []
  const isFieldCrop = !isFruit(cropKey)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-semibold text-gray-800">ปุ๋ยผสมสำเร็จ 100% สำหรับ {label}</p>
      <p className="text-[11px] text-gray-500">เรียงสูตรตาม P สูงสุดเป็นอันดับแรก</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alts.map((f, i) => {
          const [n, p, k] = f.split("-").map(Number)
          const isBest = i === 0
          return (
            <div key={f} className={`rounded-2xl border p-4 ${isBest ? "border-2 border-[#1A4D2E] bg-[#F0F7F2]" : "border-gray-100 bg-white"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${isBest ? "text-[#1A4D2E]" : "text-gray-800"}`}>{f}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {n ? `N ${n}%` : ""}{p ? ` · P₂O₅ ${p}%` : ""}{k ? ` · K₂O ${k}%` : ""}
                  </p>
                </div>
                {isBest && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A4D2E] text-white font-semibold">แนะนำ</span>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[12px] text-gray-700">
                <div>
                  <p className="text-gray-500">อัตราแนะนำ</p>
                  <p className="font-semibold">{isFieldCrop ? "25-50 กก./ไร่" : "400-1,200 ก./ต้น"}</p>
                </div>
                <div>
                  <p className="text-gray-500">แบ่งใส่</p>
                  <p className="font-semibold">{isFieldCrop ? "2 ครั้ง (รองพื้น + แต่งหน้า)" : "4 ระยะ"}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* =============================================================================
   Mix (70% chem + 30% organic) — fruit trees only
   ============================================================================= */
function MixCard({ cropKey, omLv, pLv, kLv, rai, variant }:
  { cropKey: CropKey; omLv: Level; pLv: Level; kLv: Level; rai: number; variant: MixVariant }
) {
  const label = CROP_LABEL[cropKey]
  const ratio = variant === "mix50" ? "50 : 50" : "70 : 30"

  if (!isFruit(cropKey) || !FRUIT_70[cropKey]) {
    return (
      <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
        <p className="text-sm text-yellow-800 font-semibold">โหมด &quot;เคมี + อินทรีย์&quot; มีเฉพาะไม้ผลในตอนนี้</p>
        <p className="text-[11px] text-yellow-700 mt-1">กรมพัฒนาที่ดินยังไม่ได้เผยแพร่ตารางสัดส่วนอินทรีย์สำหรับพืชไร่</p>
      </div>
    )
  }

  const anchor = pickLevelAnchor(omLv, pLv, kLv)
  const entry = FRUIT_70[cropKey]![anchor]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-semibold text-gray-800">คำแนะนำปุ๋ยผสม {ratio} — {label}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {STAGE_ORDER_FRUIT.map(s => {
          const d = entry[s]
          const empty = d.urea === 0 && d.dap === 0 && d.kcl === 0 && d.organic_kg === 0
          return (
            <div key={s} className="rounded-2xl border border-gray-100 p-4 bg-[#FAFBF9]">
              <p className="text-[13px] font-semibold text-[#1A4D2E] mb-2">{STAGE_LABEL_FRUIT[s]}</p>
              {empty ? (
                <p className="text-xs text-gray-400 italic">ไม่ต้องใส่ในระยะนี้</p>
              ) : (
                <div className="space-y-1 text-xs text-gray-700">
                  {d.urea ? <FertRow name="ยูเรีย (46-0-0)"            g={d.urea} unit="ก./ต้น" /> : null}
                  {d.dap  ? <FertRow name="ไดแอมโมเนียมฟอสเฟต (18-46-0)" g={d.dap}  unit="ก./ต้น" /> : null}
                  {d.kcl  ? <FertRow name="โพแทสเซียมคลอไรด์ (0-0-60)" g={d.kcl}  unit="ก./ต้น" /> : null}
                  {d.organic_kg ? (
                    <div className="pt-1.5 border-t border-gray-200 mt-1.5 flex justify-between">
                      <span className="text-green-700">ปุ๋ยอินทรีย์ (มูลไก่/มูลวัว/ปุ๋ยหมัก)</span>
                      <span className="font-semibold text-green-700">{d.organic_kg} กก./ต้น</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="bg-green-50 border border-green-100 rounded-xl p-3">
        <p className="text-[12px] text-green-800">
          <b>ตัวเลือกอินทรีย์:</b> ปุ๋ยหมัก, มูลไก่, มูลวัว, มูลสุกร, ปุ๋ยคอก — เลือกตามที่หาได้ในท้องถิ่น
        </p>
      </div>
      <p className="text-[11px] text-gray-500">
        {rai} ไร่ — ปริมาณข้างต้นเป็นค่าต่อต้น/ปี
      </p>
    </div>
  )
}

/* =============================================================================
   Bio-fert card
   ============================================================================= */
function BioCard({ cropKey }: { cropKey: CropKey }) {
  const label = CROP_LABEL[cropKey]
  const rec = BIO_RECS[cropKey]
  const list: BioKey[] = [rec.primary, ...rec.extra]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">ปุ๋ยชีวภาพสำหรับ {label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {rec.note || "ใช้ร่วมกับปุ๋ยเคมี/อินทรีย์เพื่อลดปริมาณปุ๋ยเคมี 20-30%"}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((k, i) => {
          const info = BIO_INFO[k]
          const isBest = i === 0
          return (
            <div key={k} className={`rounded-2xl border p-4 ${isBest ? "border-2 border-[#1A4D2E] bg-[#F0F7F2]" : "border-gray-100 bg-white"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-semibold ${isBest ? "text-[#1A4D2E]" : "text-gray-800"}`}>{info.name}</p>
                {isBest && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A4D2E] text-white font-semibold">แนะนำ</span>}
              </div>
              <div className="space-y-1.5 text-[12px] text-gray-700">
                <BioRow label="อัตราใช้" value={info.rate} />
                <BioRow label="วิธีใช้"  value={info.how} />
                <BioRow label="เหมาะกับ" value={info.best} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
        <p className="text-[12px] text-blue-800 leading-relaxed">
          <b>ข้อควรระวัง:</b> ปุ๋ยชีวภาพเป็นสิ่งมีชีวิต — ห้ามใช้ร่วมกับสารเคมีฆ่าแมลง/เชื้อรา และเก็บในที่ร่มไม่โดนแสงแดด
        </p>
      </div>
    </div>
  )
}

function BioRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

/* =============================================================================
   Popular alternative formulas (chip list)
   ============================================================================= */
function PopularAlts({ cropKey }: { cropKey: CropKey }) {
  const alts = POPULAR_MIXED[cropKey] || []
  if (alts.length === 0) return null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-sm font-semibold text-gray-800 mb-2">สูตรอื่นที่นิยมใช้กับ {CROP_LABEL[cropKey]}</p>
      <div className="flex flex-wrap gap-2">
        {alts.map(a => (
          <span key={a} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold">
            {a}
          </span>
        ))}
      </div>
    </div>
  )
}

/* =============================================================================
   Rows / cards
   ============================================================================= */
function FertRow({ name, g, unit }: { name: string; g: number; unit: string }) {
  if (!g) return null
  return (
    <div className="flex items-center justify-between">
      <span>{name}</span>
      <span className="font-semibold text-[#1A4D2E]">{g} {unit}</span>
    </div>
  )
}

function SumCard({ label, kg, color }: { label: string; kg: number; color: string }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${color}`}>
      <p className="text-[11px] font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{kg.toFixed(1)}</p>
      <p className="text-xs opacity-70">กก.</p>
    </div>
  )
}
