// report.ts — ข้อมูลรายงานผลวิเคราะห์ดินและคำแนะนำปุ๋ย (ใช้ทั้งหน้าพิมพ์ และเก็บใน analysis_results.fertilizer_plan)

import type { FertMode, StagePlanResult } from "@/lib/fertilizer/stagePlan"
import type { Nutrients } from "@/lib/fertilizer/blend"

export interface FarmerInfo {
  name: string
  phone: string
  address: string // บ้านเลขที่/หมู่/ถนน
  plot: string // ชื่อแปลง
  district: string // ตำบล
  amphur: string // อำเภอ
  province: string // จังหวัด
  lat: string
  lng: string
}

export const EMPTY_FARMER: FarmerInfo = {
  name: "",
  phone: "",
  address: "",
  plot: "",
  district: "",
  amphur: "",
  province: "",
  lat: "",
  lng: "",
}

export interface ReportData {
  version: 1
  created_at: string
  analysis_id?: string | null
  farmer: FarmerInfo
  crop: { id: string; name: string; type: string }
  soil: { om: number | null; p: number | null; k: number | null; ph: number | null }
  levels: { om: string | null; p: string | null; k: string | null }
  need: Nutrients // ธาตุอาหารที่พืชต้องการ (100%)
  needUnit: string // เช่น "กรัม/ต้น/ปี"
  mode: FertMode
  plan: StagePlanResult // ปริมาณปุ๋ยที่ต้องใช้ (จากสูตรที่เลือก)
}

export const REPORT_STORAGE_KEY = "report_data"

export function fullAddress(f: FarmerInfo): string {
  return [
    f.address,
    f.district && `ต.${f.district}`,
    f.amphur && `อ.${f.amphur}`,
    f.province && `จ.${f.province}`,
  ]
    .filter(Boolean)
    .join(" ")
}

export function thaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
}
