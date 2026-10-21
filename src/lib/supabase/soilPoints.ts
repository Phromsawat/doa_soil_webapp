"use server"

import { createClient } from "@/lib/supabase/server"
import { classify, NEAREST_MAX_KM, type Nutrient, type SoilLevel } from "@/lib/soil/grid"
import CENTERS from "@/lib/soil/subdistrictCenters.json"

// =============================================================================
// จุดค่าดินรายตำบล (migration 042) — แทนแผนที่ raster (soil_grid)
//   ค่ารายตำบลคำนวณในฐานข้อมูล (get_soil_point_stats) จากตัวอย่างระบบเก่า + รายการวิเคราะห์ด้วย AI
//   ตำแหน่งจุด = กลางตำบลจาก subdistrictCenters.json (สร้างโดย scripts/build_soil_points.py)
//   - listSoilPoints: จุดทั้งหมดสำหรับวาดบนแผนที่
//   - getNearestSoil: ค่าดิน ณ จุดที่ปักหมุด = จุดที่ใกล้ที่สุด "แยกทีละธาตุ" ในรัศมี 30 กม.
// =============================================================================

export interface SoilPoint {
  /** "จังหวัด|อำเภอ|ตำบล" */
  id: string
  subdistrict: string
  district: string
  province: string
  lat: number
  lng: number
  om: number | null
  p: number | null
  k: number | null
  om_n: number
  p_n: number
  k_n: number
}

/** ที่มาของค่าธาตุหนึ่ง — จุดตัวอย่างที่ใช้ + ระยะจากจุดที่ปักหมุด */
export interface SoilSource {
  subdistrict: string
  district: string
  province: string
  distanceKm: number
  samples: number
}

export interface NearestSoil {
  lat: number
  lng: number
  om: number | null
  p: number | null
  k: number | null
  omLevel: SoilLevel | null
  pLevel: SoilLevel | null
  kLevel: SoilLevel | null
  sources: Record<Nutrient, SoilSource | null>
}

type Centers = Record<string, Record<string, Record<string, [number, number]>>>
const centers = CENTERS as unknown as Centers

const num = (v: unknown) => (v == null ? null : Number(v))

/** จุดทั้งหมด — ตำบลที่ไม่มีพิกัดกลาง (ชื่อไม่ตรงกับขอบเขต) ไม่แสดง */
export async function listSoilPoints(): Promise<SoilPoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_soil_point_stats")
  if (error) throw new Error(`listSoilPoints: ${error.message}`)

  const out: SoilPoint[] = []
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const province = String(r.province)
    const district = String(r.district)
    const subdistrict = String(r.subdistrict)
    const c = centers[province]?.[district]?.[subdistrict]
    if (!c) continue
    out.push({
      id: `${province}|${district}|${subdistrict}`,
      subdistrict,
      district,
      province,
      lat: c[0],
      lng: c[1],
      om: num(r.om),
      p: num(r.p),
      k: num(r.k),
      om_n: Number(r.om_n) || 0,
      p_n: Number(r.p_n) || 0,
      k_n: Number(r.k_n) || 0,
    })
  }
  return out
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * ค่าดิน ณ จุดที่ปักหมุด: แต่ละธาตุใช้จุดตัวอย่างที่ใกล้ที่สุดที่มีค่าธาตุนั้น ภายใน 30 กม.
 * คืน null ถ้าไม่มีจุดตัวอย่างใดเลยในรัศมี
 */
export async function getNearestSoil(lat: number, lng: number): Promise<NearestSoil | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const near = (await listSoilPoints())
    .map((pt) => ({ pt, km: haversineKm(lat, lng, pt.lat, pt.lng) }))
    .filter((x) => x.km <= NEAREST_MAX_KM)
    .sort((a, b) => a.km - b.km)

  const pick = (n: Nutrient) => near.find((x) => x.pt[n] != null) ?? null
  const chosen = { om: pick("om"), p: pick("p"), k: pick("k") }
  if (!chosen.om && !chosen.p && !chosen.k) return null

  const source = (n: Nutrient): SoilSource | null => {
    const c = chosen[n]
    if (!c) return null
    return {
      subdistrict: c.pt.subdistrict,
      district: c.pt.district,
      province: c.pt.province,
      distanceKm: Math.round(c.km * 10) / 10,
      samples: c.pt[`${n}_n`],
    }
  }
  const om = chosen.om?.pt.om ?? null
  const p = chosen.p?.pt.p ?? null
  const k = chosen.k?.pt.k ?? null
  return {
    lat,
    lng,
    om,
    p,
    k,
    omLevel: classify("om", om),
    pLevel: classify("p", p),
    kLevel: classify("k", k),
    sources: { om: source("om"), p: source("p"), k: source("k") },
  }
}
