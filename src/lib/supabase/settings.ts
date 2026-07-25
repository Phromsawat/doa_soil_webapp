"use server"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/supabase/permissions"
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

/** เปิด/ปิดการแสดงแผนที่ดิน (admin เท่านั้น) */
export async function setShowSoilMap(value: boolean): Promise<void> {
  await requirePermission("settings", "edit")
  const supabase = await createClient()
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: SHOW_SOIL_MAP, value }, { onConflict: "key" })
  if (error) throw new Error(`setShowSoilMap: ${error.message}`)
  revalidatePath("/")
  revalidatePath("/map")
  revalidatePath("/admin/settings")
}
