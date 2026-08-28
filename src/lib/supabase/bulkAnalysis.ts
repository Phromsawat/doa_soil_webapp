"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { blendFertilizer, type Formula } from "@/lib/fertilizer/blend"

// =============================================================================
// นำเข้าผลวิเคราะห์ดินหลายรายการพร้อมกัน (จากไฟล์ Excel/CSV)
//
// สำคัญ: ห้ามวนลูปเรียก calculateFertilizer + saveManualAnalysis ทีละแถว
// เพราะแต่ละครั้งต้องคุยกับ Supabase ใหม่ (~90 ms) ไฟล์ 100 แถวจะใช้เวลาเป็นสิบวินาที
// ที่นี่จึงดึงตารางอ้างอิงมา "ครั้งเดียว" คำนวณในหน่วยความจำ แล้ว insert ทีเดียว
// =============================================================================

export interface BulkInputRow {
  rowNumber: number
  crop?: string
  om?: string
  p?: string
  k?: string
  ph?: string
  fert1?: string
  fert2?: string
  fert3?: string
  province?: string
  amphur?: string
  district?: string
  notes?: string
}

export interface BulkRowResult {
  rowNumber: number
  ok: boolean
  errors: string[]
  cropName: string | null
  om: number | null
  p: number | null
  k: number | null
  ph: number | null
  /** ชื่อสูตรปุ๋ยที่จับคู่ได้ */
  formulas: string[]
  target: { n: number | null; p2o5: number | null; k2o: number | null } | null
  unit: string | null
  /** ปริมาณปุ๋ยที่ต้องใช้ต่อสูตร (คำนวณจาก target) */
  blend: { grade: string; amount: number }[]
}

export interface BulkPreview {
  rows: BulkRowResult[]
  okCount: number
  errorCount: number
}

interface CropRow { id: string; name: string }
interface FormulaRow {
  id: string; name: string; grade: string | null
  n_percent: number; p2o5_percent: number; k2o_percent: number
}
interface RecRow {
  crop_id: string
  om_min: number | null; om_max: number | null
  p_min: number | null;  p_max: number | null
  k_min: number | null;  k_max: number | null
  target_n: number | null; target_p2o5: number | null; target_k2o: number | null
  target_unit: string
}

const norm = (s: string) => s.replace(/[\s.\-_]/g, "").toLowerCase()
const num = (v: string | undefined): number | null => {
  if (v === undefined) return null
  const c = v.replace(/,/g, "").replace(/\s/g, "")
  if (c === "") return null
  const n = Number(c)
  return Number.isFinite(n) ? n : null
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนนำเข้าไฟล์")
  if (user.is_anonymous) throw new Error("บัญชีชั่วคราวนำเข้าไฟล์ไม่ได้ กรุณาสมัครสมาชิก")
  return { supabase, userId: user.id }
}

/**
 * ตรวจ + คำนวณทุกแถว โดยดึงข้อมูลอ้างอิงเพียง 3 query
 * คืนทั้งผลลัพธ์สำหรับแสดงพรีวิว และแถวที่พร้อมบันทึกจริง
 */
async function resolveRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: BulkInputRow[]
) {
  const [{ data: cropData }, { data: formulaData }] = await Promise.all([
    supabase.from("crops").select("id, name").eq("is_active", true),
    supabase
      .from("fertilizer_formulas")
      .select("id, name, grade, n_percent, p2o5_percent, k2o_percent")
      .eq("is_active", true),
  ])

  const crops = (cropData ?? []) as CropRow[]
  const formulas = (formulaData ?? []) as FormulaRow[]
  const cropByName = new Map(crops.map((c) => [norm(c.name), c]))
  const formulaByKey = new Map<string, FormulaRow>()
  for (const f of formulas) {
    if (f.grade) formulaByKey.set(norm(f.grade), f)
    formulaByKey.set(norm(f.name), f)
  }

  // จับคู่พืชก่อน เพื่อจะได้ดึงตารางคำแนะนำเฉพาะพืชที่ใช้จริง
  const matchedCropIds = new Set<string>()
  for (const row of input) {
    const c = row.crop ? cropByName.get(norm(row.crop)) : undefined
    if (c) matchedCropIds.add(c.id)
  }

  let recs: RecRow[] = []
  if (matchedCropIds.size > 0) {
    const { data } = await supabase
      .from("fertilizer_recommendations")
      .select("crop_id, om_min, om_max, p_min, p_max, k_min, k_max, target_n, target_p2o5, target_k2o, target_unit")
      .in("crop_id", [...matchedCropIds])
      .eq("mode", "100%")
    recs = (data ?? []) as RecRow[]
  }
  const recsByCrop = new Map<string, RecRow[]>()
  for (const r of recs) {
    const list = recsByCrop.get(r.crop_id)
    if (list) list.push(r)
    else recsByCrop.set(r.crop_id, [r])
  }

  const results: BulkRowResult[] = []
  const ready: {
    row: BulkRowResult
    cropId: string
    formulaIds: string[]
  }[] = []

  for (const row of input) {
    const errors: string[] = []
    const crop = row.crop ? cropByName.get(norm(row.crop)) : undefined
    if (!row.crop) errors.push("ไม่ได้ระบุพืช")
    else if (!crop) errors.push(`ไม่รู้จักพืช "${row.crop}"`)

    const om = num(row.om), p = num(row.p), k = num(row.k), ph = num(row.ph)
    if (om === null) errors.push("ไม่มีค่า OM")
    if (p === null) errors.push("ไม่มีค่า P")
    if (k === null) errors.push("ไม่มีค่า K")

    const picked: FormulaRow[] = []
    for (const raw of [row.fert1, row.fert2, row.fert3]) {
      if (!raw) continue
      const f = formulaByKey.get(norm(raw))
      if (!f) errors.push(`ไม่รู้จักปุ๋ย "${raw}"`)
      else if (!picked.some((x) => x.id === f.id)) picked.push(f)
    }
    if (picked.length === 0) errors.push("ไม่ได้เลือกปุ๋ย")

    // คำนวณธาตุอาหารเป้าหมาย — กติกาเดียวกับ calculateFertilizer (min ≤ ค่า ≤ max)
    let target: BulkRowResult["target"] = null
    let unit: string | null = null
    let blend: BulkRowResult["blend"] = []

    if (crop) {
      const list = recsByCrop.get(crop.id) ?? []
      if (list.length === 0) errors.push(`ยังไม่มีตารางคำแนะนำสำหรับ${crop.name}`)
      else {
        unit = list[0].target_unit
        const hit = (lo: keyof RecRow, hi: keyof RecRow, v: number | null) =>
          v === null ? undefined : list.find((r) => {
            const a = r[lo] as number | null
            const b = r[hi] as number | null
            return a !== null && b !== null && a <= v && v <= b
          })
        const omRow = hit("om_min", "om_max", om)
        const pRow = hit("p_min", "p_max", p)
        const kRow = hit("k_min", "k_max", k)
        if (om !== null && omRow?.target_n == null) errors.push(`ค่า OM=${om} ไม่อยู่ในช่วงของตาราง`)
        if (p !== null && pRow?.target_p2o5 == null) errors.push(`ค่า P=${p} ไม่อยู่ในช่วงของตาราง`)
        if (k !== null && kRow?.target_k2o == null) errors.push(`ค่า K=${k} ไม่อยู่ในช่วงของตาราง`)
        target = {
          n: omRow?.target_n != null ? Number(omRow.target_n) : null,
          p2o5: pRow?.target_p2o5 != null ? Number(pRow.target_p2o5) : null,
          k2o: kRow?.target_k2o != null ? Number(kRow.target_k2o) : null,
        }
      }
    }

    if (errors.length === 0 && target) {
      const selected: Formula[] = picked.map((f) => ({
        id: f.id, name: f.name, grade: f.grade,
        n: f.n_percent, p2o5: f.p2o5_percent, k2o: f.k2o_percent,
      }))
      const r = blendFertilizer(
        { n: target.n ?? 0, p2o5: target.p2o5 ?? 0, k2o: target.k2o ?? 0 },
        selected
      )
      blend = r.items.map((it) => ({
        grade: it.formula.grade ?? it.formula.name,
        amount: Math.round(it.kg),
      }))
    }

    const result: BulkRowResult = {
      rowNumber: row.rowNumber,
      ok: errors.length === 0,
      errors,
      cropName: crop?.name ?? row.crop ?? null,
      om, p, k, ph,
      formulas: picked.map((f) => f.grade ?? f.name),
      target,
      unit,
      blend,
    }
    results.push(result)
    if (result.ok && crop) {
      ready.push({ row: result, cropId: crop.id, formulaIds: picked.map((f) => f.id) })
    }
  }

  return { results, ready, inputByRow: new Map(input.map((r) => [r.rowNumber, r])) }
}

/** ตรวจไฟล์และคำนวณให้ดูก่อน ยังไม่บันทึกอะไร */
export async function previewBulkAnalyses(input: BulkInputRow[]): Promise<BulkPreview> {
  const { supabase } = await requireUser()
  const { results } = await resolveRows(supabase, input)
  return {
    rows: results,
    okCount: results.filter((r) => r.ok).length,
    errorCount: results.filter((r) => !r.ok).length,
  }
}

/**
 * บันทึกเฉพาะแถวที่ผ่านการตรวจ ลงประวัติของผู้ใช้ที่ล็อกอินอยู่
 * insert 2 ครั้ง (analyses แล้ว analysis_results) ไม่ว่าไฟล์จะมีกี่แถว
 */
export async function saveBulkAnalyses(
  input: BulkInputRow[]
): Promise<{ saved: number; skipped: number; rows: BulkRowResult[] }> {
  const { supabase, userId } = await requireUser()
  const { results, ready, inputByRow } = await resolveRows(supabase, input)

  if (ready.length === 0) {
    return { saved: 0, skipped: results.length, rows: results }
  }

  const payload = ready.map(({ row, cropId, formulaIds }) => {
    const src = inputByRow.get(row.rowNumber)
    return {
      user_id: userId,
      crop_id: cropId,
      input_mode: "manual_form" as const,
      status: "completed" as const,
      om_value: row.om,
      p_value: row.p,
      k_value: row.k,
      ph_value: row.ph,
      province: src?.province ?? null,
      amphur: src?.amphur ?? null,
      district: src?.district ?? null,
      latitude: null,
      longitude: null,
      notes: src?.notes ?? `นำเข้าจากไฟล์ · พืช: ${row.cropName}`,
      blend_formula_ids: formulaIds.slice(0, 3),
    }
  })

  const { data: inserted, error } = await supabase
    .from("analyses")
    .insert(payload)
    .select("id")
  if (error) throw new Error(`saveBulkAnalyses: ${error.message}`)

  // ลำดับที่ Postgres คืนกลับตรงกับลำดับที่ส่งเข้าไป จึงจับคู่กับ ready ได้ตรง ๆ
  const resultRows = (inserted ?? []).map((a, i) => ({
    analysis_id: (a as { id: string }).id,
    recommendation_id: null,
    recommended_n: ready[i].row.target?.n ?? null,
    recommended_p2o5: ready[i].row.target?.p2o5 ?? null,
    recommended_k2o: ready[i].row.target?.k2o ?? null,
    unit: ready[i].row.unit,
    fertilizer_plan: null,
  }))

  if (resultRows.length > 0) {
    const { error: resErr } = await supabase
      .from("analysis_results")
      .upsert(resultRows, { onConflict: "analysis_id" })
    // ผลคำนวณบันทึกไม่ได้ไม่ควรทำให้ทั้งชุดล้ม — ตัววิเคราะห์บันทึกไปแล้ว
    if (resErr) console.warn("saveBulkAnalyses: analysis_results", resErr.message)
  }

  revalidatePath("/history")
  return {
    saved: inserted?.length ?? 0,
    skipped: results.length - (inserted?.length ?? 0),
    rows: results,
  }
}
