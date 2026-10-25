// ผลของผู้ที่ไม่ได้ล็อกอิน — ไม่บันทึกลงฐานข้อมูล เก็บไว้ใน sessionStorage ของแท็บนั้นเท่านั้น (ปิดแท็บแล้วหาย)
// ใช้ส่งต่อค่าระหว่างหน้า: อัปโหลดรูป → คำนวณปุ๋ย (/analyze/form?from=guest) → รายงาน PDF (/analyze/result/print?guest=1)
// ใช้ฝั่งเบราว์เซอร์เท่านั้น

import type { PlanTab } from "@/lib/fertilizer/chemicalPlan"

/** ค่าดินที่แบบจำลองทำนายจากรูป + พื้นที่ที่กรอกในหน้าอัปโหลด */
export interface GuestSoil {
  om_value: number | null
  p_value: number | null
  k_value: number | null
  province: string | null
  amphur: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
}

/** ทุกอย่างที่รายงาน PDF ต้องใช้ — โครงเดียวกับคอลัมน์ของ analyses ที่รายงานอ่าน */
export interface GuestReport extends GuestSoil {
  crop_id: string
  ph_value: number | null
  blend_formula_ids: string[]
  plan_tab: PlanTab
  created_at: string
}

const SOIL_KEY = "doa_guest_soil"
const REPORT_KEY = "doa_guest_report"

// sessionStorage ใช้ไม่ได้ในบางโหมด (เช่นหน้าต่างส่วนตัวบางเบราว์เซอร์) — ไม่ให้หน้าพัง แค่ส่งต่อค่าไม่ได้
function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export const saveGuestSoil = (soil: GuestSoil) => write(SOIL_KEY, soil)
export const readGuestSoil = () => read<GuestSoil>(SOIL_KEY)
export const saveGuestReport = (report: GuestReport) => write(REPORT_KEY, report)
export const readGuestReport = () => read<GuestReport>(REPORT_KEY)
