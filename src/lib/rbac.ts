// นิยามเมนู + type ของระบบสิทธิ (ใช้ได้ทั้ง client และ server — ไม่มี side effect)

export const ADMIN_MENUS = [
  { key: "dashboard",   label: "ภาพรวม",             href: "/admin" },
  { key: "users",       label: "ผู้ใช้",              href: "/admin/users" },
  { key: "analyses",    label: "ประวัติการวิเคราะห์", href: "/admin/analyses" },
  { key: "crops",       label: "พืช/ปุ๋ย",            href: "/admin/crops" },
  { key: "fertilizers", label: "สูตรปุ๋ย",            href: "/admin/fertilizers" },
  { key: "settings",    label: "ตั้งค่าระบบ",         href: "/admin/settings" },
  { key: "roles",       label: "จัดการสิทธิ",         href: "/admin/roles" },
] as const

export type MenuKey = (typeof ADMIN_MENUS)[number]["key"]
export type PermAction = "view" | "create" | "edit" | "delete"

export interface Perm {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}
export type PermMap = Record<string, Perm>

export const EMPTY_PERM: Perm = { view: false, create: false, edit: false, delete: false }
export const FULL_PERM: Perm = { view: true, create: true, edit: true, delete: true }

/** map สิทธิ "เปิดหมด" ทุกเมนู (ใช้กับ admin) */
export function allPermissions(): PermMap {
  const m: PermMap = {}
  for (const menu of ADMIN_MENUS) m[menu.key] = { ...FULL_PERM }
  return m
}

/** อ่านสิทธิ 1 ช่องแบบปลอดภัย (ไม่มี = false) */
export function can(perms: PermMap, menu: MenuKey, action: PermAction): boolean {
  return perms[menu]?.[action] ?? false
}
