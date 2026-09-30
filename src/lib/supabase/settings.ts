"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

// =============================================================================
// ตั้งค่าระบบ (app_settings) — feature flags
//   - อ่าน: ทุกคน
//   - เขียน: เฉพาะ admin (ตรวจด้วย requireAdmin + RLS)
// =============================================================================

const SHOW_SOIL_MAP = "show_soil_map"

/** จะโชว์เมนู/หน้าแผนที่ดินให้ผู้ใช้ทั่วไปไหม (default: false = ซ่อน) */
export async function getShowSoilMap(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SHOW_SOIL_MAP)
      .maybeSingle()
    return data?.value === true
  } catch {
    // ถ้ายังไม่ได้รัน migration 006 หรืออ่านไม่ได้ -> ถือว่าซ่อนไว้ก่อน
    return false
  }
}

// ---------------------------------------------------------------- เนื้อหาหน้าแรก
// รายละเอียดโครงการในหน้าแรก แก้ได้จาก /admin/settings (null = ใช้ข้อความตั้งต้นใน TH_ENG.ts)
const HOME_CONTENT = "home_content"

export interface HomeContent {
  title?: string
  subtitle?: string
  projectDetailsTitle?: string
  projectDescription?: string
  organizedByTitle?: string
  organizedByDesc?: string
  contact?: string // หลายบรรทัด
  address?: string
  businessHours?: string
  phone?: string
  email?: string
}

export async function getHomeContent(): Promise<HomeContent | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", HOME_CONTENT)
      .maybeSingle()
    return (data?.value as HomeContent | null) ?? null
  } catch {
    return null
  }
}

export async function setHomeContent(value: HomeContent): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  // ตัดช่องว่างทิ้ง -> ช่องที่เว้นว่างจะกลับไปใช้ข้อความตั้งต้น
  const clean = Object.fromEntries(
    Object.entries(value).filter(([, v]) => typeof v === "string" && v.trim() !== "")
  )
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: HOME_CONTENT, value: clean }, { onConflict: "key" })
  if (error) throw new Error(`setHomeContent: ${error.message}`)
  revalidatePath("/")
  revalidatePath("/admin/settings")
}

/** เปิด/ปิดการแสดงแผนที่ดิน (admin เท่านั้น) */
export async function setShowSoilMap(value: boolean): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: SHOW_SOIL_MAP, value }, { onConflict: "key" })
  if (error) throw new Error(`setShowSoilMap: ${error.message}`)
  revalidatePath("/")
  revalidatePath("/map")
  revalidatePath("/admin/settings")
}
