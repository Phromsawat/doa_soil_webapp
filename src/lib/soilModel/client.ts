// ตัวเรียกระบบทำนายค่า OM/P/K จากภาพแผ่นทดสอบ (แบบจำลองของทีม AI บน Azure Container Apps)
//
// ใช้ฝั่ง server เท่านั้น: MODEL_API_KEY ไม่ได้ขึ้นต้นด้วย NEXT_PUBLIC_ จึงไม่ถูกฝังในโค้ดฝั่งเบราว์เซอร์
// เรียกผ่าน predictAnalysis() (lib/supabase/prediction.ts) ซึ่งตรวจ session/เจ้าของรายการ
// และอ่านภาพจาก Storage ของเราเองก่อน — ไม่รับ URL ภาพจากผู้ใช้
//
// สัญญากับทีม AI: POST {MODEL_API_URL}/v1/predict, Authorization: Bearer <key>
//   multipart: om_image / p_image / k_image (อย่างน้อย 1 ภาพ, ≤ 12 MiB ต่อไฟล์), sample_id (ไม่บังคับ)
//   200 → { status: "completed", om_value, p_value, k_value, model_version, request_id }
//         OM เป็น %, P/K เป็น mg/kg — ธาตุที่ไม่ได้ส่งภาพได้ null
//   401 key ผิด · 413 ไฟล์ใหญ่เกิน · 422 ภาพไม่ผ่านการตรวจ (detail.element, detail.message)
//   503 ระบบไม่ว่าง (Retry-After)

export type ModelElement = "OM" | "P" | "K"

export interface ModelPrediction {
  om_value: number | null
  p_value: number | null
  k_value: number | null
  model_version: string | null
  request_id: string | null
}

export type ModelOutcome =
  | { ok: true; prediction: ModelPrediction }
  | { ok: false; kind: "rejected"; element: ModelElement | null; message: string }
  | { ok: false; kind: "busy"; retryAfter: number | null; message: string }
  | { ok: false; kind: "too_large" | "timeout" | "error"; message: string }

const FIELD: Record<ModelElement, string> = { OM: "om_image", P: "p_image", K: "k_image" }
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

// เครื่องที่หยุดพักอยู่ต้องเปิดใหม่ก่อน — คำขอแรกอาจช้ามาก (ทีม AI แนะนำรอได้ถึง 2 นาที)
const TIMEOUT_MS = 120_000
// 503 ที่ขอให้รอไม่นาน — รอแล้วลองให้อีกครั้งเอง ผู้ใช้ไม่ต้องกดใหม่
const AUTO_RETRY_MAX_WAIT_S = 10

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null)
const str = (v: unknown) => (typeof v === "string" && v ? v : null)

function detailMessage(body: unknown): string | null {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === "string") return detail
  return str((detail as { message?: unknown } | null)?.message)
}

async function callOnce(images: Partial<Record<ModelElement, Blob>>, sampleId: string | null) {
  const url = process.env.MODEL_API_URL
  const key = process.env.MODEL_API_KEY
  if (!url || !key) {
    console.error("soilModel: MODEL_API_URL / MODEL_API_KEY is not set")
    return { outcome: { ok: false, kind: "error", message: "ยังไม่ได้ตั้งค่าระบบวิเคราะห์ภาพ กรุณาแจ้งผู้ดูแลระบบ" } as ModelOutcome }
  }

  const form = new FormData()
  for (const el of ["OM", "P", "K"] as const) {
    const blob = images[el]
    if (blob) form.append(FIELD[el], blob, `${el.toLowerCase()}.${EXT[blob.type] ?? "jpg"}`)
  }
  if (sampleId) form.append("sample_id", sampleId.slice(0, 120))

  let res: Response
  try {
    res = await fetch(`${url.replace(/\/+$/, "")}/v1/predict`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` }, // ไม่ตั้ง Content-Type เอง — ให้ FormData ใส่ boundary
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")
    console.error("soilModel: request failed", e)
    return {
      outcome: {
        ok: false,
        kind: timeout ? "timeout" : "error",
        message: timeout
          ? "ระบบวิเคราะห์ภาพใช้เวลานานเกินไป กรุณาลองอีกครั้ง"
          : "ติดต่อระบบวิเคราะห์ภาพไม่ได้ กรุณาลองอีกครั้ง",
      } as ModelOutcome,
    }
  }

  const body: unknown = await res.json().catch(() => null)

  if (res.ok) {
    const b = (body ?? {}) as Record<string, unknown>
    if (b.status !== "completed") {
      console.error("soilModel: unexpected response", body)
      return { outcome: { ok: false, kind: "error", message: "ได้รับผลวิเคราะห์ที่ไม่สมบูรณ์ กรุณาลองอีกครั้ง" } as ModelOutcome }
    }
    return {
      outcome: {
        ok: true,
        prediction: {
          om_value: num(b.om_value),
          p_value: num(b.p_value),
          k_value: num(b.k_value),
          model_version: str(b.model_version),
          request_id: str(b.request_id),
        },
      } as ModelOutcome,
    }
  }

  const message = detailMessage(body)
  switch (res.status) {
    case 422: {
      const el = (body as { detail?: { element?: unknown } } | null)?.detail?.element
      return {
        outcome: {
          ok: false,
          kind: "rejected",
          element: el === "OM" || el === "P" || el === "K" ? el : null,
          message: message ?? "ภาพไม่ผ่านการตรวจ กรุณาเปลี่ยนภาพ",
        } as ModelOutcome,
      }
    }
    case 413:
      return { outcome: { ok: false, kind: "too_large", message: "ไฟล์ภาพใหญ่เกินไป (ไม่เกิน 12 MB ต่อภาพ)" } as ModelOutcome }
    case 503: {
      const ra = Number(res.headers.get("retry-after"))
      const retryAfter = Number.isFinite(ra) && ra >= 0 ? ra : null
      return {
        retryAfter,
        outcome: {
          ok: false,
          kind: "busy",
          retryAfter,
          message: retryAfter
            ? `ระบบวิเคราะห์ภาพกำลังทำงานอื่นอยู่ กรุณาลองใหม่ในอีก ${retryAfter} วินาที`
            : "ระบบวิเคราะห์ภาพกำลังทำงานอื่นอยู่ กรุณาลองใหม่อีกครั้ง",
        } as ModelOutcome,
      }
    }
    case 401:
      console.error("soilModel: 401 — MODEL_API_KEY ไม่ถูกต้องหรือถูกเปลี่ยน")
      return { outcome: { ok: false, kind: "error", message: "ระบบวิเคราะห์ภาพปฏิเสธการเชื่อมต่อ กรุณาแจ้งผู้ดูแลระบบ" } as ModelOutcome }
    default:
      console.error(`soilModel: HTTP ${res.status}`, body)
      return { outcome: { ok: false, kind: "error", message: message ?? "วิเคราะห์ไม่สำเร็จ กรุณาลองอีกครั้ง" } as ModelOutcome }
  }
}

/** ส่งภาพให้แบบจำลองทำนาย — คืนผลหรือข้อผิดพลาดที่แสดงให้ผู้ใช้ได้ (ไม่ throw) */
export async function predictSoil(
  images: Partial<Record<ModelElement, Blob>>,
  sampleId: string | null = null
): Promise<ModelOutcome> {
  const first = await callOnce(images, sampleId)
  const wait = "retryAfter" in first ? first.retryAfter : null
  if (wait != null && wait <= AUTO_RETRY_MAX_WAIT_S) {
    await new Promise((r) => setTimeout(r, Math.max(1, wait) * 1000))
    return (await callOnce(images, sampleId)).outcome
  }
  return first.outcome
}
