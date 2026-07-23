"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

// =============================================================================
// สูตรปุ๋ย (fertilizer_formulas)
//   - อ่าน: ทุกคน (ใช้ในหน้าคำนวณปุ๋ยฝั่งผู้ใช้)
//   - เพิ่ม/แก้/ลบ: เฉพาะ admin (/admin/fertilizers)
// =============================================================================

export interface FertilizerFormulaRow {
  id: string
  name: string
  grade: string | null
  n_percent: number
  p2o5_percent: number
  k2o_percent: number
  kind: "chemical" | "organic"
  is_active: boolean
  sort_order: number
  notes: string | null
}

export interface FertilizerFormulaInput {
  name: string
  grade?: string | null
  n_percent: number
  p2o5_percent: number
  k2o_percent: number
  kind?: "chemical" | "organic"
  is_active?: boolean
  sort_order?: number
  notes?: string | null
}

const COLS =
  "id, name, grade, n_percent, p2o5_percent, k2o_percent, kind, is_active, sort_order, notes"

/** รายการสูตรปุ๋ยที่เปิดใช้งาน — สำหรับผู้ใช้ทั่วไปเลือกตอนคำนวณ */
export async function listFertilizerFormulas(): Promise<FertilizerFormulaRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fertilizer_formulas")
    .select(COLS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as FertilizerFormulaRow[]
}

/** รายการทั้งหมด (รวมที่ปิดใช้งาน) — สำหรับหน้า admin */
export async function adminListFormulas(): Promise<FertilizerFormulaRow[]> {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fertilizer_formulas")
    .select(COLS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as FertilizerFormulaRow[]
}

export async function adminCreateFormula(
  input: FertilizerFormulaInput
): Promise<FertilizerFormulaRow> {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fertilizer_formulas")
    .insert({
      name: input.name.trim(),
      grade: input.grade?.trim() || null,
      n_percent: input.n_percent,
      p2o5_percent: input.p2o5_percent,
      k2o_percent: input.k2o_percent,
      kind: input.kind ?? "chemical",
      is_active: input.is_active ?? true,
      sort_order: input.sort_order ?? 100,
      notes: input.notes?.trim() || null,
    })
    .select(COLS)
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/admin/fertilizers")
  return data as FertilizerFormulaRow
}

export async function adminUpdateFormula(
  id: string,
  patch: Partial<FertilizerFormulaInput>
): Promise<FertilizerFormulaRow> {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fertilizer_formulas")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.grade !== undefined ? { grade: patch.grade?.trim() || null } : {}),
      ...(patch.n_percent !== undefined ? { n_percent: patch.n_percent } : {}),
      ...(patch.p2o5_percent !== undefined ? { p2o5_percent: patch.p2o5_percent } : {}),
      ...(patch.k2o_percent !== undefined ? { k2o_percent: patch.k2o_percent } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {}),
      ...(patch.sort_order !== undefined ? { sort_order: patch.sort_order } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
    })
    .eq("id", id)
    .select(COLS)
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/admin/fertilizers")
  return data as FertilizerFormulaRow
}

export async function adminDeleteFormula(id: string): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from("fertilizer_formulas")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/fertilizers")
}
