// อ่านเนื้อหาหน้าหลัก — ไม่แตะ cookie หน้าหลักจึงยังเป็น static ได้
// อัปเดตผ่าน revalidatePath("/") ตอนแอดมินบันทึก (saveHomeContent)

import { createPublicClient } from "@/lib/supabase/public"
import {
  HOME_SLUG,
  resolveHome,
  sanitizeHome,
  type HomeContent,
  type HomeContentInput,
} from "@/lib/content/home"

export async function getHomeContent(): Promise<{
  /** ค่าที่แอดมินบันทึกไว้ (null = ยังไม่เคยแก้) — ใช้เติมฟอร์มแก้ไข */
  stored: HomeContentInput | null
  /** ค่าที่ใช้แสดงผลจริง */
  content: HomeContent
  updated_at: string | null
}> {
  try {
    const { data } = await createPublicClient()
      .from("page_contents")
      .select("blocks, updated_at")
      .eq("slug", HOME_SLUG)
      .maybeSingle()
    const stored = data ? sanitizeHome(data.blocks) : null
    return { stored, content: resolveHome(stored), updated_at: data?.updated_at ?? null }
  } catch {
    // อ่านฐานข้อมูลไม่ได้ (เช่นตอน build) — ใช้ข้อความตั้งต้น หน้าไม่มีทางว่าง
    return { stored: null, content: resolveHome(null), updated_at: null }
  }
}
