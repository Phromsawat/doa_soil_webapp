"use server"

import { createClient } from "@/lib/supabase/server"
import { classify, toGridIndex, type SoilLevel } from "@/lib/soil/grid"

export interface SoilAtPoint {
  lat: number
  lng: number
  om: number | null
  p: number | null
  k: number | null
  omLevel: SoilLevel | null
  pLevel: SoilLevel | null
  kLevel: SoilLevel | null
}

// คลิกจุด -> ดึงค่า OM/P/K จากตาราง soil_grid (PK lookup ที่ (grid_row, grid_col))
// คืน null ถ้าจุดอยู่นอกพื้นที่ข้อมูล (ทะเล / นอกประเทศ)
export async function getSoilAtPoint(
  lat: number,
  lng: number
): Promise<SoilAtPoint | null> {
  const idx = toGridIndex(lat, lng)
  if (!idx) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("soil_grid")
    .select("om, p, k")
    .eq("grid_row", idx.row)
    .eq("grid_col", idx.col)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    lat,
    lng,
    om: data.om,
    p: data.p,
    k: data.k,
    omLevel: classify("om", data.om),
    pLevel: classify("p", data.p),
    kLevel: classify("k", data.k),
  }
}
