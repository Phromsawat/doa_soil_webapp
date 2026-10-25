// Supabase client ด้วย service role — ข้าม RLS ทั้งหมด ใช้ฝั่ง server เท่านั้น
// (SUPABASE_SECRET_KEY ไม่ได้ขึ้นต้นด้วย NEXT_PUBLIC_ จึงไม่ถูกฝังในโค้ดฝั่งเบราว์เซอร์)
// ผู้เรียกต้องตรวจสิทธิ์/ความเป็นเจ้าของเองก่อนเสมอ

import { createClient } from "@supabase/supabase-js"

export function createServiceClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set")
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
