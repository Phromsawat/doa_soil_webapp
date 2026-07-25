"use client"

import { useEffect, useState, useTransition } from "react"
import { ShieldCheck, Loader2, Plus, Trash2, Settings2, X, Check } from "lucide-react"
import {
  adminListRoles,
  adminCreateRole,
  adminDeleteRole,
  adminGetRolePermissions,
  adminSaveRolePermissions,
  type RoleRow,
} from "@/lib/supabase/roles"
import { ADMIN_MENUS, type PermMap, type PermAction } from "@/lib/rbac"

const ACTIONS: { key: PermAction; label: string }[] = [
  { key: "view", label: "ดู" },
  { key: "create", label: "เพิ่ม" },
  { key: "edit", label: "แก้ไข" },
  { key: "delete", label: "ลบ" },
]

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null)
  const [pending, startTransition] = useTransition()

  async function reload() {
    try {
      setRoles(await adminListRoles())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    let cancelled = false
    adminListRoles()
      .then((r) => !cancelled && setRoles(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  function handleCreate() {
    if (!newName.trim()) return setError("กรอกชื่อ role")
    startTransition(async () => {
      try {
        await adminCreateRole({ name: newName, description: newDesc })
        setNewName(""); setNewDesc(""); setAdding(false)
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  function handleDelete(r: RoleRow) {
    if (!confirm(`ลบ role "${r.name}" ?`)) return
    startTransition(async () => {
      try {
        await adminDeleteRole(r.id)
        setRoles((prev) => prev.filter((x) => x.id !== r.id))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[#1A4D2E]" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">จัดการสิทธิ (Roles)</h1>
            <p className="text-xs text-gray-500">กำหนดสิทธิของแต่ละ role ต่อเมนู × การกระทำ</p>
          </div>
        </div>
        <button
          onClick={() => { setAdding((v) => !v); setError(null) }}
          className="flex items-center gap-1 rounded-xl bg-[#1A4D2E] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> สร้าง role
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {adding && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ชื่อ role เช่น เจ้าหน้าที่ภาค"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="คำอธิบาย (ไม่บังคับ)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={pending}
            className="mt-2 rounded-lg bg-[#1A4D2E] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> กำลังโหลด…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2">ชื่อ</th>
                <th className="px-4 py-2">คำอธิบาย</th>
                <th className="px-4 py-2 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-gray-800">{r.name}</span>
                    {r.is_system && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                        ระบบ
                      </span>
                    )}
                    <div className="text-[11px] text-gray-400">{r.key}</div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{r.description || "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditingRole(r)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[#1A4D2E] hover:bg-[#1A4D2E]/10"
                      >
                        <Settings2 className="h-3.5 w-3.5" /> ตั้งค่าสิทธิ
                      </button>
                      {!r.is_system && (
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={pending}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="ลบ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingRole && (
        <PermissionModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
        />
      )}
    </div>
  )
}

function PermissionModal({ role, onClose }: { role: RoleRow; onClose: () => void }) {
  const [perms, setPerms] = useState<PermMap | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminGetRolePermissions(role.id)
      .then((p) => !cancelled && setPerms(p))
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : String(e)))
    return () => { cancelled = true }
  }, [role.id])

  function toggle(menu: string, action: PermAction) {
    setPerms((prev) =>
      prev ? { ...prev, [menu]: { ...prev[menu], [action]: !prev[menu][action] } } : prev
    )
  }

  async function save() {
    if (!perms) return
    setSaving(true); setErr(null)
    try {
      await adminSaveRolePermissions(role.id, perms)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const isAdminRole = role.key === "admin"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">ตั้งค่าสิทธิ · {role.name}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isAdminRole && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            role &ldquo;admin&rdquo; มีสิทธิทุกอย่างเสมอ (แก้ที่นี่ไม่มีผลกับการเข้าถึงจริงของ admin)
          </p>
        )}
        {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{err}</div>}

        {!perms ? (
          <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดสิทธิ…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">เมนู</th>
                  {ACTIONS.map((a) => (
                    <th key={a.key} className="px-3 py-2 text-center">{a.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ADMIN_MENUS.map((menu) => (
                  <tr key={menu.key}>
                    <td className="px-3 py-2 text-gray-700">{menu.label}</td>
                    {ACTIONS.map((a) => (
                      <td key={a.key} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perms[menu.key]?.[a.key] ?? false}
                          onChange={() => toggle(menu.key, a.key)}
                          className="h-4 w-4 rounded accent-[#1A4D2E]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            ปิด
          </button>
          <button
            onClick={save}
            disabled={saving || !perms}
            className="flex items-center gap-1 rounded-full bg-[#1A4D2E] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}
