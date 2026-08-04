"use server"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/supabase/permissions"

// =============================================================================
// ADMIN SERVER ACTIONS
// All actions check admin role via RLS + explicit guard.
// =============================================================================

/**
 * ทำความสะอาดคำค้นก่อนยัดเข้า PostgREST `.or()` filter string.
 * ตัดอักขระที่มีความหมายในไวยากรณ์ filter (comma, วงเล็บ, `*`, `\`)
 * เพื่อกันไม่ให้คำค้นแทรกเงื่อนไขเพิ่ม (filter injection). คืน "" ถ้าไม่เหลืออะไร
 */
function sanitizeFilterTerm(s: string | undefined | null): string {
  return (s ?? "").replace(/[,()*\\]/g, " ").trim()
}

/**
 * Throw if the current user is not an admin.
 * Use at the top of every admin server action.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden — admin only")
  }

  return { user, profile }
}

/**
 * Check (without throwing) — useful for UI gating.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    await requireAdmin()
    return true
  } catch {
    return false
  }
}

/**
 * Dashboard overview stats.
 */
export async function getAdminStats() {
  await requirePermission("dashboard", "view")
  const supabase = await createClient()

  const [profilesQ, analysesQ, cropsQ, recsQ] = await Promise.all([
    supabase.from("profiles").select("id, role", { count: "exact", head: false }),
    supabase.from("analyses").select("id, status, created_at", { count: "exact", head: false }),
    supabase.from("crops").select("id", { count: "exact", head: true }),
    supabase.from("fertilizer_recommendations").select("id", { count: "exact", head: true }),
  ])

  const profiles = profilesQ.data ?? []
  const analyses = analysesQ.data ?? []

  // Recent activity — analyses in last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentAnalyses = analyses.filter(
    (a) => new Date(a.created_at).getTime() > sevenDaysAgo
  ).length

  return {
    totalUsers: profilesQ.count ?? 0,
    adminCount: profiles.filter((p) => p.role === "admin").length,
    totalAnalyses: analysesQ.count ?? 0,
    completedAnalyses: analyses.filter((a) => a.status === "completed").length,
    pendingAnalyses: analyses.filter((a) => a.status === "pending").length,
    recentAnalyses,
    totalCrops: cropsQ.count ?? 0,
    totalRecommendations: recsQ.count ?? 0,
  }
}

// =============================================================================
// ADMIN — Analyses viewer
// =============================================================================

/**
 * List all analyses (admin sees all users' data).
 */
export async function adminListAnalyses(opts: {
  limit?: number
  offset?: number
  status?: "all" | "completed" | "pending" | "failed"
  search?: string
} = {}) {
  await requirePermission("analyses", "view")
  const supabase = await createClient()
  const limit  = opts.limit ?? 20
  const offset = opts.offset ?? 0

  let q = supabase
    .from("analyses")
    .select(
      `id, created_at, status, input_mode,
       om_value, p_value, k_value,
       province, amphur, district,
       notes, user_id,
       analysis_images(nutrient_code, public_url),
       crops(name, crop_types(name))`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status && opts.status !== "all") {
    q = q.eq("status", opts.status)
  }
  const s = sanitizeFilterTerm(opts.search)
  if (s) {
    q = q.or(
      `notes.ilike.%${s}%,province.ilike.%${s}%,amphur.ilike.%${s}%,district.ilike.%${s}%`
    )
  }

  const { data, error, count } = await q
  if (error) throw new Error(`adminListAnalyses: ${error.message}`)

  // Enrich each analysis with user email/name (separate query — RLS allows admin)
  const userIds = Array.from(new Set((data ?? []).map((a) => a.user_id)))
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, nickname")
    .in("id", userIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const enriched = (data ?? []).map((a) => ({
    ...a,
    user: profileMap.get(a.user_id) ?? null,
  }))

  return { rows: enriched, total: count ?? 0 }
}

/**
 * Fetch one analysis with full image set (admin can read any).
 */
export async function adminGetAnalysis(analysisId: string) {
  await requirePermission("analyses", "view")
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("analyses")
    .select(
      `*,
       analysis_images(*),
       analysis_results(*),
       crops(name, crop_types(name))`
    )
    .eq("id", analysisId)
    .single()
  if (error) throw new Error(`adminGetAnalysis: ${error.message}`)

  // Attach user info
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, nickname, phone, role")
    .eq("id", data.user_id)
    .single()

  return { ...data, user: profile }
}

// =============================================================================
// ADMIN — User management
// =============================================================================

export type AdminUserRow = {
  id: string
  email: string | null
  full_name: string | null
  nickname: string | null
  phone: string | null
  role: string
  created_at: string
  // Last activity = most recent analysis created_at (joined separately)
  last_analysis_at: string | null
  analysis_count: number
}

/**
 * List all users (admin only).
 * Enriches each row with analysis count + last activity.
 */
export async function adminListUsers(opts: {
  limit?: number
  offset?: number
  role?: "all" | "user" | "admin"
  search?: string
} = {}): Promise<{ rows: AdminUserRow[]; total: number }> {
  await requirePermission("users", "view")
  const supabase = await createClient()
  const limit  = opts.limit ?? 20
  const offset = opts.offset ?? 0

  let q = supabase
    .from("profiles")
    .select("id, email, full_name, nickname, phone, role, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.role && opts.role !== "all") q = q.eq("role", opts.role)

  const s = sanitizeFilterTerm(opts.search)
  if (s) {
    q = q.or(`email.ilike.%${s}%,full_name.ilike.%${s}%,nickname.ilike.%${s}%`)
  }

  const { data: profiles, error, count } = await q
  if (error) throw new Error(`adminListUsers: ${error.message}`)

  // Enrich with analysis stats (one query for everyone in this page)
  const userIds = (profiles ?? []).map((p) => p.id)
  const { data: analyses } = await supabase
    .from("analyses")
    .select("user_id, created_at")
    .in("user_id", userIds.length > 0 ? userIds : ["__none__"])
    .order("created_at", { ascending: false })

  const stats = new Map<string, { count: number; last: string | null }>()
  for (const a of analyses ?? []) {
    const cur = stats.get(a.user_id) ?? { count: 0, last: null }
    cur.count += 1
    if (!cur.last) cur.last = a.created_at  // first = latest (sorted desc)
    stats.set(a.user_id, cur)
  }

  const rows: AdminUserRow[] = (profiles ?? []).map((p) => {
    const s = stats.get(p.id)
    return {
      ...p,
      role: (p.role as string) ?? "user",
      last_analysis_at: s?.last ?? null,
      analysis_count: s?.count ?? 0,
    }
  })

  return { rows, total: count ?? 0 }
}

/**
 * Promote/demote a user. Cannot demote yourself.
 */
export async function adminUpdateUserRole(userId: string, newRole: string) {
  const { user: currentUser } = await requirePermission("users", "edit")
  if (userId === currentUser.id && newRole !== "admin") {
    throw new Error("ไม่สามารถเปลี่ยน role ของตัวเองออกจาก admin ได้")
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)
  if (error) throw new Error(`adminUpdateUserRole: ${error.message}`)
}

/**
 * Delete a user (and all their data via FK cascade).
 * NOTE: Uses the auth.admin API which requires SERVICE_ROLE key.
 */
export async function adminDeleteUser(userId: string) {
  const { user: currentUser } = await requirePermission("users", "delete")
  if (userId === currentUser.id) {
    throw new Error("ไม่สามารถลบบัญชีตัวเองได้")
  }

  // Use admin client (service_role) — bypasses RLS, can delete auth.users
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Cleanup Storage first (best-effort)
  const supabase = await createClient()
  const { data: userAnalyses } = await supabase
    .from("analyses")
    .select("id")
    .eq("user_id", userId)
  const analysisIds = (userAnalyses ?? []).map((a) => a.id)
  const { data: images } = analysisIds.length
    ? await supabase
        .from("analysis_images")
        .select("storage_path")
        .in("analysis_id", analysisIds)
    : { data: [] as { storage_path: string }[] }
  const paths = (images ?? []).map((i) => i.storage_path).filter(Boolean)
  if (paths.length > 0) {
    await admin.storage.from("soil-images").remove(paths)
  }

  // Delete the auth user — cascades to profiles, analyses, etc.
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(`adminDeleteUser: ${error.message}`)
}

// =============================================================================
// ADMIN — Crops CRUD
// =============================================================================

export type AdminCropRow = {
  id: string
  name: string
  name_en: string | null
  description: string | null
  is_active: boolean
  crop_type_id: string
  crop_type_name: string
  crop_type_unit: string
  recommendation_count: number
  created_at: string
}

export async function adminListCrops(opts: {
  limit?: number
  offset?: number
  crop_type_id?: string
  search?: string
} = {}): Promise<{ rows: AdminCropRow[]; total: number }> {
  await requirePermission("crops", "view")
  const supabase = await createClient()
  const limit  = opts.limit ?? 50
  const offset = opts.offset ?? 0

  let q = supabase
    .from("crops")
    .select(
      `id, name, name_en, description, is_active, crop_type_id, created_at,
       crop_types(name, unit_basis)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1)

  if (opts.crop_type_id) q = q.eq("crop_type_id", opts.crop_type_id)
  const s = sanitizeFilterTerm(opts.search)
  if (s) {
    q = q.or(`name.ilike.%${s}%,name_en.ilike.%${s}%`)
  }

  const { data, error, count } = await q
  if (error) throw new Error(`adminListCrops: ${error.message}`)

  // Count recommendations per crop (one query)
  const cropIds = (data ?? []).map((c) => c.id)
  const { data: recs } = await supabase
    .from("fertilizer_recommendations")
    .select("crop_id")
    .in("crop_id", cropIds.length > 0 ? cropIds : ["__none__"])

  const recCounts = new Map<string, number>()
  for (const r of recs ?? []) {
    recCounts.set(r.crop_id, (recCounts.get(r.crop_id) ?? 0) + 1)
  }

  const rows: AdminCropRow[] = (data ?? []).map((c) => {
    const ct = Array.isArray(c.crop_types) ? c.crop_types[0] : c.crop_types
    return {
      id: c.id,
      name: c.name,
      name_en: c.name_en,
      description: c.description,
      is_active: c.is_active,
      crop_type_id: c.crop_type_id,
      crop_type_name: ct?.name ?? "",
      crop_type_unit: ct?.unit_basis ?? "",
      recommendation_count: recCounts.get(c.id) ?? 0,
      created_at: c.created_at,
    }
  })

  return { rows, total: count ?? 0 }
}

export async function adminListCropTypes() {
  await requirePermission("crops", "view")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("crop_types")
    .select("id, name, unit_basis")
    .eq("is_active", true)
    .order("order_by")
  if (error) throw new Error(`adminListCropTypes: ${error.message}`)
  return data ?? []
}

export async function adminCreateCrop(input: {
  name: string
  name_en?: string | null
  crop_type_id: string
  description?: string | null
}) {
  await requirePermission("crops", "create")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("crops")
    .insert({
      name: input.name,
      name_en: input.name_en ?? null,
      crop_type_id: input.crop_type_id,
      description: input.description ?? null,
    })
    .select("id")
    .single()
  if (error) throw new Error(`adminCreateCrop: ${error.message}`)
  return data.id as string
}

export async function adminUpdateCrop(
  cropId: string,
  input: {
    name?: string
    name_en?: string | null
    crop_type_id?: string
    description?: string | null
    is_active?: boolean
    fertilizer_note?: string | null
    fertilizer_note_source?: string | null
  }
) {
  await requirePermission("crops", "edit")
  const supabase = await createClient()
  const { error } = await supabase.from("crops").update(input).eq("id", cropId)
  if (error) throw new Error(`adminUpdateCrop: ${error.message}`)
}

export async function adminDeleteCrop(cropId: string) {
  await requirePermission("crops", "delete")
  const supabase = await createClient()
  const { error } = await supabase.from("crops").delete().eq("id", cropId)
  if (error) throw new Error(`adminDeleteCrop: ${error.message}`)
}

// =============================================================================
// ADMIN — Fertilizer Recommendations CRUD
// =============================================================================

export type AdminRecommendationRow = {
  id: string
  crop_id: string
  mode: string
  om_min: number | null
  om_max: number | null
  p_min: number | null
  p_max: number | null
  k_min: number | null
  k_max: number | null
  target_n: number | null
  target_p2o5: number | null
  target_k2o: number | null
  target_unit: string
  notes: string | null
}

export async function adminListRecommendations(cropId: string) {
  await requirePermission("crops", "view")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fertilizer_recommendations")
    .select("*")
    .eq("crop_id", cropId)
    .order("created_at", { ascending: true })
  if (error) throw new Error(`adminListRecommendations: ${error.message}`)
  return (data ?? []) as AdminRecommendationRow[]
}

export async function adminCreateRecommendation(input: {
  crop_id: string
  mode?: string
  om_min?: number | null; om_max?: number | null
  p_min?: number | null;  p_max?: number | null
  k_min?: number | null;  k_max?: number | null
  target_n?: number | null; target_p2o5?: number | null; target_k2o?: number | null
  target_unit: string
  notes?: string | null
}) {
  await requirePermission("crops", "create")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fertilizer_recommendations")
    .insert({
      crop_id: input.crop_id,
      mode: input.mode ?? "100%",
      om_min: input.om_min ?? null, om_max: input.om_max ?? null,
      p_min: input.p_min ?? null,   p_max: input.p_max ?? null,
      k_min: input.k_min ?? null,   k_max: input.k_max ?? null,
      target_n: input.target_n ?? null,
      target_p2o5: input.target_p2o5 ?? null,
      target_k2o: input.target_k2o ?? null,
      target_unit: input.target_unit,
      notes: input.notes ?? null,
    })
    .select("id")
    .single()
  if (error) throw new Error(`adminCreateRecommendation: ${error.message}`)
  return data.id as string
}

export async function adminUpdateRecommendation(
  recId: string,
  input: Partial<Omit<AdminRecommendationRow, "id" | "crop_id">>
) {
  await requirePermission("crops", "edit")
  const supabase = await createClient()
  const { error } = await supabase
    .from("fertilizer_recommendations")
    .update(input)
    .eq("id", recId)
  if (error) throw new Error(`adminUpdateRecommendation: ${error.message}`)
}

export async function adminDeleteRecommendation(recId: string) {
  await requirePermission("crops", "delete")
  const supabase = await createClient()
  const { error } = await supabase
    .from("fertilizer_recommendations")
    .delete()
    .eq("id", recId)
  if (error) throw new Error(`adminDeleteRecommendation: ${error.message}`)
}

/**
 * Delete an analysis (admin only). Also cleans up Storage files.
 */
export async function adminDeleteAnalysis(analysisId: string) {
  await requirePermission("analyses", "delete")
  const supabase = await createClient()

  // First fetch the images to know storage paths
  const { data: images } = await supabase
    .from("analysis_images")
    .select("storage_path")
    .eq("analysis_id", analysisId)

  const paths = (images ?? []).map((i) => i.storage_path).filter(Boolean)
  if (paths.length > 0) {
    await supabase.storage.from("soil-images").remove(paths)
  }

  // DB rows cascade-delete via FK
  const { error } = await supabase.from("analyses").delete().eq("id", analysisId)
  if (error) throw new Error(`adminDeleteAnalysis: ${error.message}`)
}
