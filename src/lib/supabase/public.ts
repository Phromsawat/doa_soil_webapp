import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Client สำหรับอ่าน "ข้อมูลสาธารณะ" ฝั่ง server (เนื้อหาหน้าเว็บ ฯลฯ)
 *
 * ต่างจาก createClient() ใน server.ts ตรงที่ไม่แตะ cookies() — สำคัญมาก เพราะ
 * การเรียก cookies() จะบังคับให้หน้ากลายเป็น dynamic (render ใหม่ทุก request)
 * ข้อมูลพวกนี้เหมือนกันสำหรับทุกคน ไม่ต้องรู้ว่าใครเปิด หน้าจึงเป็น static ได้
 * และอัปเดตผ่าน revalidatePath() ตอนแอดมินกดบันทึก
 *
 * ใช้ publishable key เท่านั้น -> ยังอยู่ใต้ RLS ตามปกติ
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
