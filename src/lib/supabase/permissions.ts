"use server"

import { createClient } from "@/lib/supabase/server"
import { allPermissions, type MenuKey, type PermAction, type PermMap } from "@/lib/rbac"

// =============================================================================
// อ่าน/บังคับใช้สิทธิ (ไม่ import admin.ts เพื่อกัน circular) — admin ได้สิทธิเสมอ
// =============================================================================

async function currentRoleKey(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  return (data?.role as string) ?? null
}

/** สิทธิของผู้ใช้ปัจจุบัน (map เมนู→action). admin = เปิดหมด */
export async function getMyPermissions(): Promise<PermMap> {
  const roleKey = await currentRoleKey()
  if (!roleKey) return {}
  if (roleKey === "admin") return allPermissions()

  const supabase = await createClient()
  const { data: role } = await supabase.from("roles").select("id").eq("key", roleKey).maybeSingle()
  if (!role) return {}
  const { data: perms } = await supabase
    .from("role_permissions")
    .select("menu_key, can_view, can_create, can_edit, can_delete")
    .eq("role_id", role.id)

  const map: PermMap = {}
  for (const p of perms ?? []) {
    map[p.menu_key as string] = {
      view: p.can_view, create: p.can_create, edit: p.can_edit, delete: p.can_delete,
    }
  }
  return map
}

/** เข้าแผงแอดมินได้ไหม (admin หรือมี view อย่างน้อย 1 เมนู) */
export async function canAccessAdmin(): Promise<boolean> {
  const perms = await getMyPermissions()
  return Object.values(perms).some((p) => p.view)
}

/** ใช้ต้น server action — โยน error ถ้าไม่มีสิทธิ (admin ผ่านเสมอ) คืน user ปัจจุบัน */
export async function requirePermission(menu: MenuKey, action: PermAction) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role === "admin") return { user }
  const { data, error } = await supabase.rpc("has_permission", { p_menu: menu, p_action: action })
  if (error) throw new Error(`requirePermission: ${error.message}`)
  if (!data) throw new Error(`ไม่มีสิทธิ "${action}" ในเมนู "${menu}"`)
  return { user }
}
