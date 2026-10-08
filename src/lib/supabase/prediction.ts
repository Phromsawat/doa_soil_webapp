"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { predictSoil, type ModelElement } from "@/lib/soilModel/client"
import type { NutrientCode } from "@/types/database"

// =============================================================================
// ทำนายค่า OM/P/K ของรายการวิเคราะห์แบบอัปโหลดรูป ด้วยแบบจำลองของทีม AI
//   1. ตรวจ session + ต้องเป็นเจ้าของรายการ
//   2. อ่านภาพต้นฉบับจาก Storage ของเราเอง (bucket soil-images, path ขึ้นต้นด้วย uid/analysis)
//      — ไม่ใช่สำเนาย่อ: แบบจำลองอ่านค่าจากสี ต้องได้ไฟล์เดียวกับที่ผู้ใช้ถ่าย
//   3. ส่งให้แบบจำลอง แล้วบันทึกค่าลงรายการ — สถานะ "completed" หลังบันทึกสำเร็จเท่านั้น
//   4. ลบต้นฉบับทิ้ง เหลือสำเนาย่อไว้ในประวัติ (migration 041)
// ข้อผิดพลาดที่คาดได้คืนเป็นค่า (ไม่ throw) เพื่อให้หน้าเว็บแสดงข้อความภาษาไทยได้ตรง ๆ
// =============================================================================

const BUCKET = "soil-images"

export type PredictResult =
  | {
      ok: true
      om_value: number | null
      p_value: number | null
      k_value: number | null
      model_version: string | null
    }
  | {
      ok: false
      kind: "rejected" | "busy" | "too_large" | "timeout" | "error"
      /** ภาพที่ไม่ผ่านการตรวจ (เฉพาะ kind = "rejected") */
      element?: NutrientCode | null
      message: string
    }

const fail = (message: string): PredictResult => ({ ok: false, kind: "error", message })

export async function predictAnalysis(analysisId: string, elements: NutrientCode[]): Promise<PredictResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail("เซสชันหมดอายุ กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง")

  const { data: analysis, error } = await supabase
    .from("analyses")
    .select("id, input_mode, status, om_value, p_value, k_value, ai_result, analysis_images(nutrient_code, storage_path, original_path)")
    .eq("id", analysisId)
    .eq("user_id", user.id) // แอดมินอ่านได้ทุกแถวผ่าน RLS — ทำนายได้เฉพาะของตัวเอง
    .maybeSingle()
  if (error) {
    console.error("predictAnalysis: load", error.message)
    return fail("โหลดรายการวิเคราะห์ไม่สำเร็จ")
  }
  if (!analysis || analysis.input_mode !== "image_upload") return fail("ไม่พบรายการวิเคราะห์นี้")

  // ทำนายสำเร็จไปแล้ว — คืนค่าที่บันทึกไว้ ไม่เรียกแบบจำลองซ้ำ
  const saved = analysis.ai_result as { model_version?: string | null } | null
  if (analysis.status === "completed" && saved) {
    return {
      ok: true,
      om_value: analysis.om_value,
      p_value: analysis.p_value,
      k_value: analysis.k_value,
      model_version: saved.model_version ?? null,
    }
  }

  const wanted = new Set(elements.filter((e): e is ModelElement => e === "OM" || e === "P" || e === "K"))
  if (wanted.size === 0) return fail("กรุณาเลือกรูปอย่างน้อย 1 รูป")

  const prefix = `${user.id}/${analysisId}/`
  const images: Partial<Record<ModelElement, Blob>> = {}
  const originals: string[] = []
  for (const img of analysis.analysis_images ?? []) {
    const el = img.nutrient_code as ModelElement
    // รายการก่อน 041 ไม่มีต้นฉบับแยก — ใช้ไฟล์ที่เก็บไว้แทน
    const path: string = img.original_path ?? img.storage_path
    if (!wanted.has(el) || !path.startsWith(prefix)) continue
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path)
    if (dlErr || !blob) {
      console.error("predictAnalysis: download", path, dlErr?.message)
      return fail(`อ่านรูป ${el} ไม่สำเร็จ กรุณาอัปโหลดใหม่`)
    }
    images[el] = blob
    if (img.original_path) originals.push(img.original_path)
  }
  const missing = [...wanted].filter((el) => !images[el])
  if (missing.length) return fail(`ไม่พบรูป ${missing.join(", ")} กรุณาอัปโหลดใหม่`)

  // sample_id = รหัสรายการของเรา (ไม่มีข้อมูลส่วนบุคคล) ใช้ไล่ log ร่วมกับทีม AI
  const outcome = await predictSoil(images, analysisId)
  if (!outcome.ok) {
    return {
      ok: false,
      kind: outcome.kind,
      element: outcome.kind === "rejected" ? outcome.element : undefined,
      message: outcome.message,
    }
  }

  const p = outcome.prediction
  const { data: updated, error: upErr } = await supabase
    .from("analyses")
    .update({
      om_value: p.om_value,
      p_value: p.p_value,
      k_value: p.k_value,
      status: "completed",
      ai_result: {
        ...p,
        images: (["OM", "P", "K"] as const).filter((el) => images[el]),
        predicted_at: new Date().toISOString(),
      },
    })
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .select("id")
  if (upErr || !updated?.length) {
    console.error("predictAnalysis: save", upErr?.message)
    return fail("ทำนายสำเร็จแต่บันทึกผลไม่สำเร็จ กรุณาลองอีกครั้ง")
  }

  // ทำนายเสร็จแล้ว ไม่ต้องใช้ต้นฉบับอีก — ลบไฟล์ (ไม่สำเร็จก็ไม่กระทบผล แค่ไฟล์ค้าง)
  if (originals.length) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove(originals)
    if (rmErr) console.error("predictAnalysis: remove originals", rmErr.message)
    else {
      const { error: clrErr } = await supabase
        .from("analysis_images")
        .update({ original_path: null })
        .eq("analysis_id", analysisId)
        .in("original_path", originals)
      if (clrErr) console.error("predictAnalysis: clear original_path", clrErr.message)
    }
  }

  revalidatePath("/history")
  return { ok: true, om_value: p.om_value, p_value: p.p_value, k_value: p.k_value, model_version: p.model_version }
}
