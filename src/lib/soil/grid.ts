// grid.ts — ค่าคงที่ + logic สำหรับแผนที่ระดับดิน OM/P/K
// grid มาจาก GeoTIFF (ArcGIS IDW) 0.05° WGS84 — สร้างโดย scripts/extract_soil_grid.py
// ถ้า raster เปลี่ยน ให้รันสคริปต์ใหม่แล้วอัปเดต GRID ด้านล่างตาม output

export const GRID = {
  x0: 97.32680594900003, // ขอบซ้าย (lng ตะวันตกสุด)
  y0: 20.312281681000073, // ขอบบน (lat เหนือสุด)
  px: 0.05, // ขนาดเซลล์ (องศา)
  w: 166,
  h: 292,
} as const

// ขอบเขตภาพสำหรับ Leaflet ImageOverlay: [[south, west], [north, east]]
export const SOIL_BOUNDS: [[number, number], [number, number]] = [
  [GRID.y0 - GRID.h * GRID.px, GRID.x0],
  [GRID.y0, GRID.x0 + GRID.w * GRID.px],
]

export type Nutrient = "om" | "p" | "k"
export type SoilLevel = "low" | "medium" | "high"

// สีพาสเทล (ต้องตรงกับ COLORS ใน scripts/extract_soil_grid.py)
export const LEVEL_COLORS: Record<SoilLevel, string> = {
  low: "#F2A8A1", // แดงพาสเทล
  medium: "#F8CE97", // ส้มพาสเทล
  high: "#A8D5A2", // เขียวพาสเทล
}

export const LEVEL_LABEL_TH: Record<SoilLevel, string> = {
  low: "ต่ำ",
  medium: "ปานกลาง",
  high: "สูง",
}

// layer "sum" = ความอุดมสมบูรณ์รวม (คะแนน 3-9) เป็น layer ที่ 4 นอกจากธาตุอาหาร
export type Layer = Nutrient | "sum"

// เกณฑ์: low ถ้า v<lo, high ถ้า v>hi, ที่เหลือ medium
// om/p/k = เกณฑ์กรมพัฒนาที่ดิน · sum = คะแนนรวม (3-4 ต่ำ / 5-6 ปานกลาง / 7-9 สูง)
// ต้องตรงกับ THRESHOLDS ใน scripts/extract_soil_grid.py
const THRESHOLDS: Record<Layer, [number, number]> = {
  om: [1.5, 3.5],
  p: [10, 25],
  k: [60, 90],
  sum: [5, 6],
}

export function classify(
  nutrient: Layer,
  v: number | null | undefined
): SoilLevel | null {
  if (v == null || !Number.isFinite(v)) return null
  const [lo, hi] = THRESHOLDS[nutrient]
  if (v < lo) return "low"
  if (v > hi) return "high"
  return "medium"
}

export const NUTRIENT_META: Record<
  Layer,
  { key: Layer; label: string; short: string; unit: string; overlay: string }
> = {
  om: {
    key: "om",
    label: "อินทรียวัตถุ",
    short: "OM",
    unit: "%",
    overlay: "/soil-maps/om_level.png",
  },
  p: {
    key: "p",
    label: "ฟอสฟอรัส",
    short: "P",
    unit: "mg/kg",
    overlay: "/soil-maps/p_level.png",
  },
  k: {
    key: "k",
    label: "โพแทสเซียม",
    short: "K",
    unit: "mg/kg",
    overlay: "/soil-maps/k_level.png",
  },
  sum: {
    key: "sum",
    label: "ความอุดมสมบูรณ์",
    short: "รวม",
    unit: "คะแนน",
    overlay: "/soil-maps/sum_level.png",
  },
}

export const NUTRIENTS: Nutrient[] = ["om", "p", "k"]

// layer ทั้งหมดที่แสดงบนแผนที่ (รวม sum เป็นแท็บที่ 4)
export const LAYERS: Layer[] = ["om", "p", "k", "sum"]

const LEVEL_SCORE: Record<SoilLevel, number> = { low: 1, medium: 2, high: 3 }

// คะแนนความอุดมสมบูรณ์รวม = ผลรวม level ของ OM+P+K (3-9) — ตรงกับ TH_SUM 100%
// คืน null ถ้าข้อมูลไม่ครบ
export function soilScore(
  om: number | null | undefined,
  p: number | null | undefined,
  k: number | null | undefined
): number | null {
  const lo = classify("om", om)
  const lp = classify("p", p)
  const lk = classify("k", k)
  if (!lo || !lp || !lk) return null
  return LEVEL_SCORE[lo] + LEVEL_SCORE[lp] + LEVEL_SCORE[lk]
}

// แปลง lat/lng -> ดัชนีเซลล์ (row, col). คืน null ถ้าอยู่นอก grid
export function toGridIndex(
  lat: number,
  lng: number
): { row: number; col: number } | null {
  const col = Math.floor((lng - GRID.x0) / GRID.px)
  const row = Math.floor((GRID.y0 - lat) / GRID.px)
  if (row < 0 || row >= GRID.h || col < 0 || col >= GRID.w) return null
  return { row, col }
}
