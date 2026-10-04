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

// =============================================================================
// โลโก้เว็บไซต์ — ทุกหน้าใช้ <img src="/api/site-logo"> (route ส่งรูปที่ตั้งไว้ หรือโลโก้ตั้งต้น)
// เก็บไฟล์ใน bucket page-images โฟลเดอร์ site/ และเก็บ URL ไว้ใน app_settings.site_logo
// =============================================================================

const SITE_LOGO = "site_logo"
const LOGO_BUCKET = "page-images"
const LOGO_MAX_BYTES = 2 * 1024 * 1024
const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
}

export interface SiteLogoSetting {
  url: string
  path: string
}

/** โลโก้ที่แอดมินตั้งไว้ (null = ใช้โลโก้ตั้งต้น) */
export async function getSiteLogoSetting(): Promise<(SiteLogoSetting & { updated_at: string }) | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", SITE_LOGO)
    .maybeSingle()
  const v = data?.value as Partial<SiteLogoSetting> | null | undefined
  return v?.url && v.path ? { url: v.url, path: v.path, updated_at: data!.updated_at as string } : null
}

/** อัปโหลดโลโก้ใหม่ (แทนของเดิม) */
export async function uploadSiteLogo(formData: FormData): Promise<void> {
  await requirePermission("settings", "edit")
  const file = formData.get("file")
  if (!(file instanceof File)) throw new Error("ไม่พบไฟล์ที่อัปโหลด")
  const ext = LOGO_TYPES[file.type]
  if (!ext) throw new Error("รองรับเฉพาะไฟล์ PNG, JPG, WebP หรือ SVG")
  if (file.size > LOGO_MAX_BYTES) throw new Error("ไฟล์ใหญ่เกิน 2 MB")

  const supabase = await createClient()
  const previous = await getSiteLogoSetting()
  const path = `site/logo-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) throw new Error(`อัปโหลดไม่สำเร็จ: ${upErr.message}`)

  const url = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: SITE_LOGO, value: { url, path } satisfies SiteLogoSetting }, { onConflict: "key" })
  if (error) {
    await supabase.storage.from(LOGO_BUCKET).remove([path])
    throw new Error(`บันทึกโลโก้ไม่สำเร็จ: ${error.message}`)
  }
  // ไฟล์เก่าไม่ได้ใช้แล้ว — ลบทิ้ง (ไม่สำเร็จก็ไม่เป็นไร)
  if (previous?.path) await supabase.storage.from(LOGO_BUCKET).remove([previous.path])
  revalidatePath("/admin/settings")
}

/** กลับไปใช้โลโก้ตั้งต้น (ตาราง app_settings ไม่มี policy ลบ จึงตั้งค่าเป็น null) */
export async function resetSiteLogo(): Promise<void> {
  await requirePermission("settings", "edit")
  const supabase = await createClient()
  const previous = await getSiteLogoSetting()
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: SITE_LOGO, value: null }, { onConflict: "key" })
  if (error) throw new Error(`resetSiteLogo: ${error.message}`)
  if (previous?.path) await supabase.storage.from(LOGO_BUCKET).remove([previous.path])
  revalidatePath("/admin/settings")
}
