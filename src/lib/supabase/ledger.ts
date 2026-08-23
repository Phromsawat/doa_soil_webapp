"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { EntryKind } from "@/lib/ledger/categories"

// =============================================================================
// สมุดบัญชี — รอบเพาะปลูก / หมวดหมู่ที่เพิ่มเอง / รายการรายรับรายจ่าย
// ทุก action ต้องล็อกอินจริง (anonymous ใช้ไม่ได้ เพราะข้อมูลจะหายไปกับ session)
// RLS บังคับเจ้าของอยู่แล้ว ตรงนี้ยัด user_id ให้ตรงกันอีกชั้น
// =============================================================================

export interface Season {
  id: string
  name: string
  crop_id: string | null
  started_on: string
  ended_on: string | null
  yield_kg: number | null
  note: string | null
}

export interface Entry {
  id: string
  season_id: string
  kind: EntryKind
  category: string
  title: string | null
  amount: number
  happened_on: string
}

export interface CustomCategory {
  id: string
  kind: EntryKind
  name: string
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้สมุดบัญชี")
  if (user.is_anonymous) throw new Error("บัญชีชั่วคราวใช้สมุดบัญชีไม่ได้ กรุณาสมัครสมาชิก")
  return { supabase, userId: user.id }
}

// ----------------------------------------------------------------- รอบเพาะปลูก

export async function listSeasons(): Promise<Season[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from("farm_seasons")
    .select("id, name, crop_id, started_on, ended_on, yield_kg, note")
    .order("started_on", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) throw new Error(`listSeasons: ${error.message}`)
  return (data ?? []) as Season[]
}

export async function createSeason(input: {
  name: string
  crop_id?: string | null
  started_on?: string
  ended_on?: string | null
  yield_kg?: number | null
  note?: string | null
}): Promise<Season> {
  const { supabase, userId } = await requireUser()
  const { data, error } = await supabase
    .from("farm_seasons")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      crop_id: input.crop_id ?? null,
      started_on: input.started_on ?? new Date().toISOString().slice(0, 10),
      ended_on: input.ended_on ?? null,
      yield_kg: input.yield_kg ?? null,
      note: input.note ?? null,
    })
    .select("id, name, crop_id, started_on, ended_on, yield_kg, note")
    .single()
  if (error) throw new Error(`createSeason: ${error.message}`)
  revalidatePath("/ledger")
  return data as Season
}

export async function updateSeason(
  id: string,
  patch: Partial<Omit<Season, "id">>
): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("farm_seasons").update(patch).eq("id", id)
  if (error) throw new Error(`updateSeason: ${error.message}`)
  revalidatePath("/ledger")
}

/** ลบรอบ -> รายการในรอบนั้นถูกลบตามไปด้วย (on delete cascade) */
export async function deleteSeason(id: string): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("farm_seasons").delete().eq("id", id)
  if (error) throw new Error(`deleteSeason: ${error.message}`)
  revalidatePath("/ledger")
}

// -------------------------------------------------------- หมวดหมู่ที่เพิ่มเอง

export async function listCustomCategories(): Promise<CustomCategory[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from("farm_categories")
    .select("id, kind, name")
    .order("created_at", { ascending: true })
  if (error) throw new Error(`listCustomCategories: ${error.message}`)
  return (data ?? []) as CustomCategory[]
}

export async function createCustomCategory(input: {
  kind: EntryKind
  name: string
}): Promise<CustomCategory> {
  const { supabase, userId } = await requireUser()
  const name = input.name.trim()
  if (!name) throw new Error("ชื่อหมวดหมู่ว่างไม่ได้")
  const { data, error } = await supabase
    .from("farm_categories")
    .insert({ user_id: userId, kind: input.kind, name })
    .select("id, kind, name")
    .single()
  if (error) {
    // 23505 = unique violation -> ผู้ใช้เคยเพิ่มหมวดชื่อนี้ไว้แล้ว
    if (error.code === "23505") throw new Error(`มีหมวด "${name}" อยู่แล้ว`)
    throw new Error(`createCustomCategory: ${error.message}`)
  }
  revalidatePath("/ledger")
  return data as CustomCategory
}

/** ลบหมวดที่เพิ่มเอง — รายการเก่ายังคงชื่อหมวดเดิมไว้ เพราะเก็บเป็นข้อความ */
export async function deleteCustomCategory(id: string): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("farm_categories").delete().eq("id", id)
  if (error) throw new Error(`deleteCustomCategory: ${error.message}`)
  revalidatePath("/ledger")
}

// ------------------------------------------------------------------- รายการ

export async function listEntries(seasonId: string): Promise<Entry[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from("farm_entries")
    .select("id, season_id, kind, category, title, amount, happened_on")
    .eq("season_id", seasonId)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) throw new Error(`listEntries: ${error.message}`)
  return (data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) as Entry[]
}

export async function createEntry(input: {
  season_id: string
  kind: EntryKind
  category: string
  title?: string | null
  amount: number
  happened_on: string
}): Promise<Entry> {
  const { supabase, userId } = await requireUser()
  if (!(input.amount >= 0)) throw new Error("จำนวนเงินต้องไม่ติดลบ")
  const { data, error } = await supabase
    .from("farm_entries")
    .insert({
      user_id: userId,
      season_id: input.season_id,
      kind: input.kind,
      category: input.category,
      title: input.title?.trim() || null,
      amount: input.amount,
      happened_on: input.happened_on,
    })
    .select("id, season_id, kind, category, title, amount, happened_on")
    .single()
  if (error) throw new Error(`createEntry: ${error.message}`)
  revalidatePath("/ledger")
  return { ...data, amount: Number(data.amount) } as Entry
}

export async function updateEntry(
  id: string,
  patch: Partial<Omit<Entry, "id" | "season_id">>
): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("farm_entries").update(patch).eq("id", id)
  if (error) throw new Error(`updateEntry: ${error.message}`)
  revalidatePath("/ledger")
}

export async function deleteEntry(id: string): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("farm_entries").delete().eq("id", id)
  if (error) throw new Error(`deleteEntry: ${error.message}`)
  revalidatePath("/ledger")
}
