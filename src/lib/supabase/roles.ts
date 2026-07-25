"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { ADMIN_MENUS, EMPTY_PERM, type PermMap } from "@/lib/rbac"

// =============================================================================
// RBAC — จัดการ role + สิทธิของแต่ละ role (admin เท่านั้น)
//   การอ่าน/บังคับใช้สิทธิของผู้ใช้ปัจจุบัน อยู่ที่ permissions.ts
// =============================================================================

export interface RoleRow {
  id: string
  key: string
  name: string
  description: string | null
  is_system: boolean
}

// ---------------------------------------------------------------- role CRUD (admin)
export async function adminListRoles(): Promise<RoleRow[]> {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("roles")
    .select("id, key, name, description, is_system")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })
  if (error) throw new Error(`adminListRoles: ${error.message}`)
  return (data ?? []) as RoleRow[]
}

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, "-").replace(/^-+|-+$/g, "") || "role"
}

export async function adminCreateRole(input: { name: string; description?: string | null }): Promise<string> {
  await requireAdmin()
  const supabase = await createClient()
  const key = slugify(input.name) + "-" + Math.random().toString(36).slice(2, 6)
  const { data, error } = await supabase
    .from("roles")
    .insert({ key, name: input.name.trim(), description: input.description?.trim() || null, is_system: false })
    .select("id")
    .single()
  if (error) throw new Error(`adminCreateRole: ${error.message}`)
  revalidatePath("/admin/roles")
  return data.id as string
}

export async function adminUpdateRole(id: string, patch: { name?: string; description?: string | null }): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from("roles")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description?.trim() || null } : {}),
    })
    .eq("id", id)
  if (error) throw new Error(`adminUpdateRole: ${error.message}`)
  revalidatePath("/admin/roles")
}

export async function adminDeleteRole(id: string): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  const { data: role } = await supabase.from("roles").select("key, is_system").eq("id", id).single()
  if (!role) throw new Error("ไม่พบ role")
  if (role.is_system) throw new Error("ลบ role ระบบไม่ได้ (admin/user)")
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", role.key)
  if ((count ?? 0) > 0) throw new Error(`ยังมีผู้ใช้ ${count} คนใช้ role นี้อยู่ — ย้าย role ผู้ใช้ก่อน`)
  const { error } = await supabase.from("roles").delete().eq("id", id)
  if (error) throw new Error(`adminDeleteRole: ${error.message}`)
  revalidatePath("/admin/roles")
}

/** สิทธิของ role หนึ่ง (ทุกเมนู) สำหรับหน้าตั้งค่า */
export async function adminGetRolePermissions(roleId: string): Promise<PermMap> {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("role_permissions")
    .select("menu_key, can_view, can_create, can_edit, can_delete")
    .eq("role_id", roleId)
  if (error) throw new Error(`adminGetRolePermissions: ${error.message}`)

  const map: PermMap = {}
  for (const menu of ADMIN_MENUS) map[menu.key] = { ...EMPTY_PERM }
  for (const p of data ?? []) {
    map[p.menu_key as string] = {
      view: p.can_view, create: p.can_create, edit: p.can_edit, delete: p.can_delete,
    }
  }
  return map
}

/** บันทึกสิทธิทั้ง matrix ของ role (upsert ทุกเมนู) */
export async function adminSaveRolePermissions(roleId: string, perms: PermMap): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  const rows = ADMIN_MENUS.map((menu) => {
    const p = perms[menu.key] ?? EMPTY_PERM
    return {
      role_id: roleId,
      menu_key: menu.key,
      can_view: p.view, can_create: p.create, can_edit: p.edit, can_delete: p.delete,
    }
  })
  const { error } = await supabase
    .from("role_permissions")
    .upsert(rows, { onConflict: "role_id,menu_key" })
  if (error) throw new Error(`adminSaveRolePermissions: ${error.message}`)
  revalidatePath("/admin/roles")
}
