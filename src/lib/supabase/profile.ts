"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Profile } from "@/types/database"

/**
 * Get the current user's profile.
 * Returns null if not signed in.
 */
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) throw new Error(`getMyProfile: ${error.message}`)
  return data as Profile
}

/**
 * Update the current user's profile fields.
 * Only profile-table fields — for email/password use auth.updateUser instead.
 */
export async function updateMyProfile(input: {
  full_name?: string | null
  nickname?: string | null
  phone?: string | null
  avatar_url?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name ?? null,
      nickname: input.nickname ?? null,
      phone: input.phone ?? null,
      avatar_url: input.avatar_url ?? null,
    })
    .eq("id", user.id)

  if (error) throw new Error(`updateMyProfile: ${error.message}`)

  // ซิงก์ชื่อกลับไปที่ user_metadata ด้วย — useUser() อ่านชื่อจากตรงนั้น
  // (คำทักทายหน้าแรก/ตัวย่อในเมนู) ถ้าไม่อัปเดตจะค้างเป็นชื่อตอนสมัคร
  if (input.full_name !== undefined || input.nickname !== undefined) {
    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        ...(input.full_name !== undefined ? { full_name: input.full_name ?? null } : {}),
        ...(input.nickname !== undefined ? { nickname: input.nickname ?? null } : {}),
      },
    })
    if (metaErr) console.warn(`updateMyProfile: sync metadata failed — ${metaErr.message}`)
  }

  revalidatePath("/profile")
}
