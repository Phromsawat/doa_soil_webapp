"use server"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/supabase/permissions"

// =============================================================================
// สมุดบัญชีของผู้ใช้ทุกคน — ฝั่งแอดมิน (อ่านอย่างเดียว)
//
// อ่านผ่าน view ledger_season_summary (migration 036) ซึ่งรวมยอดรายรับ/รายจ่ายไว้แล้ว
// RLS ของ farm_seasons/farm_entries เปิดให้ role admin อ่านทุกแถว (ไม่มีสิทธิ์แก้/ลบ)
// =============================================================================

export interface LedgerFilters {
  search?: string        // ชื่อ/อีเมลผู้ใช้ หรือชื่อรอบ
  cropId?: string
  from?: string          // วันที่เริ่มรอบ ตั้งแต่ (YYYY-MM-DD)
  to?: string            // วันที่เริ่มรอบ ถึง (YYYY-MM-DD)
}

export interface LedgerSummaryRow {
  season_id: string
  user_id: string
  name: string
  crop_id: string | null
  crop_name: string | null
  started_on: string
  ended_on: string | null
  yield_kg: number | null
  income: number
  expense: number
  net: number
  entry_count: number
  owner_name: string | null
  owner_email: string | null
}

interface SummaryDbRow {
  season_id: string
  user_id: string
  name: string
  crop_id: string | null
  started_on: string
  ended_on: string | null
  yield_kg: number | string | null
  income: number | string
  expense: number | string
  entry_count: number | string
}

const SUMMARY_COLS = "season_id, user_id, name, crop_id, started_on, ended_on, yield_kg, income, expense, entry_count"

// อักขระที่มีความหมายในไวยากรณ์ตัวกรองของ PostgREST — ตัดทิ้งกันผู้ใช้กรอกแล้วกรองเพี้ยน
const clean = (s?: string) => (s ?? "").replace(/[,()*\\%]/g, " ").trim()

/** สร้าง query ของ view ตามตัวกรอง (ค้นชื่อ/อีเมลผู้ใช้ต้องหา user_id จาก profiles ก่อน) */
async function summaryQuery(f: LedgerFilters, opts: { count?: boolean } = {}) {
  const supabase = await createClient()
  let q = supabase
    .from("ledger_season_summary")
    .select(SUMMARY_COLS, opts.count ? { count: "exact" } : undefined)
    .order("started_on", { ascending: false })
    .order("created_at", { ascending: false })

  if (f.cropId) q = q.eq("crop_id", f.cropId)
  if (f.from) q = q.gte("started_on", f.from)
  if (f.to) q = q.lte("started_on", f.to)

  const s = clean(f.search)
  if (s) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id")
      .or(`email.ilike.%${s}%,full_name.ilike.%${s}%,nickname.ilike.%${s}%`)
      .limit(200) // id ต่อกันใน URL — จำกัดไว้ไม่ให้ยาวเกิน
    const ids = (people ?? []).map((p) => p.id as string)
    q = ids.length > 0 ? q.or(`name.ilike.%${s}%,user_id.in.(${ids.join(",")})`) : q.ilike("name", `%${s}%`)
  }
  return { supabase, q }
}

/** เติมชื่อ/อีเมลเจ้าของ + ชื่อพืช และแปลงตัวเลข (numeric จาก Postgres มาเป็น string) */
async function enrich(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: SummaryDbRow[]
): Promise<LedgerSummaryRow[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const cropIds = [...new Set(rows.map((r) => r.crop_id).filter((x): x is string => !!x))]
  const [{ data: profiles }, { data: crops }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, email, full_name, nickname").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; email: string | null; full_name: string | null; nickname: string | null }[] }),
    cropIds.length
      ? supabase.from("crops").select("id, name").in("id", cropIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])
  const who = new Map((profiles ?? []).map((p) => [p.id, p]))
  const cropName = new Map((crops ?? []).map((c) => [c.id, c.name]))

  return rows.map((r) => {
    const income = Number(r.income) || 0
    const expense = Number(r.expense) || 0
    const p = who.get(r.user_id)
    return {
      season_id: r.season_id,
      user_id: r.user_id,
      name: r.name,
      crop_id: r.crop_id,
      crop_name: r.crop_id ? cropName.get(r.crop_id) ?? null : null,
      started_on: r.started_on,
      ended_on: r.ended_on,
      yield_kg: r.yield_kg == null ? null : Number(r.yield_kg),
      income,
      expense,
      net: income - expense,
      entry_count: Number(r.entry_count) || 0,
      owner_name: p?.full_name?.trim() || p?.nickname?.trim() || null,
      owner_email: p?.email ?? null,
    }
  })
}

/** ทุกแถวที่ตรงตัวกรอง — ดึงทีละ 1,000 (เพดานของ PostgREST) จนครบ */
async function fetchAll(f: LedgerFilters): Promise<LedgerSummaryRow[]> {
  const out: SummaryDbRow[] = []
  const { supabase } = await summaryQuery(f)
  for (let from = 0; ; from += 1000) {
    const { q } = await summaryQuery(f)
    const { data, error } = await q.range(from, from + 999)
    if (error) throw new Error(`ledger summary: ${error.message}`)
    out.push(...((data ?? []) as SummaryDbRow[]))
    if (!data || data.length < 1000) break
  }
  return enrich(supabase, out)
}

/** หน้ารายการ: แถวของหน้านี้ + จำนวนทั้งหมดที่ตรงตัวกรอง */
export async function adminListLedgers(
  f: LedgerFilters & { limit?: number; offset?: number }
): Promise<{ rows: LedgerSummaryRow[]; total: number }> {
  await requirePermission("ledgers", "view")
  const limit = f.limit ?? 20
  const offset = f.offset ?? 0

  const { supabase, q } = await summaryQuery(f, { count: true })
  const { data, error, count } = await q.range(offset, offset + limit - 1)
  if (error) throw new Error(`adminListLedgers: ${error.message}`)
  return { rows: await enrich(supabase, (data ?? []) as SummaryDbRow[]), total: count ?? 0 }
}

/** ข้อมูลสำหรับ export Excel — ทุกแถวที่ตรงตัวกรอง */
export async function adminExportLedgers(f: LedgerFilters): Promise<LedgerSummaryRow[]> {
  await requirePermission("ledgers", "view")
  return fetchAll(f)
}

/** รายละเอียดหนึ่งรอบ: สรุป + เจ้าของ + รายการทั้งหมด */
export async function adminGetLedgerSeason(seasonId: string) {
  await requirePermission("ledgers", "view")
  const supabase = await createClient()
  const [{ data: summary, error }, { data: entries, error: eErr }, { data: season }] = await Promise.all([
    supabase.from("ledger_season_summary").select(SUMMARY_COLS).eq("season_id", seasonId).maybeSingle(),
    supabase
      .from("farm_entries")
      .select("id, kind, category, title, amount, happened_on")
      .eq("season_id", seasonId)
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("farm_seasons").select("note").eq("id", seasonId).maybeSingle(),
  ])
  if (error) throw new Error(`adminGetLedgerSeason: ${error.message}`)
  if (eErr) throw new Error(`adminGetLedgerSeason: ${eErr.message}`)
  if (!summary) return null

  const [row] = await enrich(supabase, [summary as SummaryDbRow])
  return {
    ...row,
    note: (season?.note as string | null) ?? null,
    entries: (entries ?? []).map((e) => ({
      id: e.id as string,
      kind: e.kind as "income" | "expense",
      category: e.category as string,
      title: (e.title as string | null) ?? null,
      amount: Number(e.amount) || 0,
      happened_on: e.happened_on as string,
    })),
  }
}
