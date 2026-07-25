"use server"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/supabase/permissions"
import { revalidatePath } from "next/cache"
import type { UseType } from "@/lib/supabase/fertilizerPlan"

// =============================================================================
// ADMIN — จัดการตารางปุ๋ยตามระยะ (crop_fertilizer_plan)
//   แก้ปริมาณปุ๋ยจริงต่อระยะ ต่อช่วงค่าดิน ต่อโหมด (แม่ปุ๋ย/ผสม/70%)
// =============================================================================

export interface AdminPlanRow {
  id: string
  crop_id: string
  use_type: UseType
  om_min: number | null; om_max: number | null
  p_min: number | null;  p_max: number | null
  k_min: number | null;  k_max: number | null
  stage: string
  stage_order: number
  grade: string
  amount: number
  unit: string
}

const COLS =
  "id, crop_id, use_type, om_min, om_max, p_min, p_max, k_min, k_max, stage, stage_order, grade, amount, unit"

/** ทุกแถวของพืชหนึ่ง (ทุกโหมด) เรียงตาม โหมด → ระยะ */
export async function adminListCropPlan(cropId: string): Promise<AdminPlanRow[]> {
  await requirePermission("crops", "view")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("crop_fertilizer_plan")
    .select(COLS)
    .eq("crop_id", cropId)
    .order("use_type", { ascending: true })
    .order("stage_order", { ascending: true })
  if (error) throw new Error(`adminListCropPlan: ${error.message}`)
  return (data ?? []) as AdminPlanRow[]
}

export type AdminPlanPatch = Partial<
  Pick<
    AdminPlanRow,
    "amount" | "grade" | "unit" | "stage" | "stage_order" |
    "om_min" | "om_max" | "p_min" | "p_max" | "k_min" | "k_max"
  >
>

export async function adminUpdatePlanRow(id: string, patch: AdminPlanPatch): Promise<void> {
  await requirePermission("crops", "edit")
  const supabase = await createClient()
  const { error } = await supabase.from("crop_fertilizer_plan").update(patch).eq("id", id)
  if (error) throw new Error(`adminUpdatePlanRow: ${error.message}`)
  revalidatePath("/analyze/form")
}

export async function adminCreatePlanRow(input: {
  crop_id: string
  use_type: UseType
  om_min: number | null; om_max: number | null
  p_min: number | null;  p_max: number | null
  k_min: number | null;  k_max: number | null
  stage: string
  stage_order: number
  grade: string
  amount: number
  unit: string
}): Promise<string> {
  await requirePermission("crops", "create")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("crop_fertilizer_plan")
    .insert(input)
    .select("id")
    .single()
  if (error) throw new Error(`adminCreatePlanRow: ${error.message}`)
  revalidatePath("/analyze/form")
  return data.id as string
}

export async function adminDeletePlanRow(id: string): Promise<void> {
  await requirePermission("crops", "delete")
  const supabase = await createClient()
  const { error } = await supabase.from("crop_fertilizer_plan").delete().eq("id", id)
  if (error) throw new Error(`adminDeletePlanRow: ${error.message}`)
  revalidatePath("/analyze/form")
}
