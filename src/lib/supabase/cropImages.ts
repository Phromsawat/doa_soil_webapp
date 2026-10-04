"use server"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/supabase/permissions"
import { revalidatePath } from "next/cache"
import {
  CROP_IMAGE_BUCKET,
  CROP_IMAGE_FOLDER,
  CROP_IMAGE_MAX_BYTES,
  CROP_IMAGE_TYPES,
  cropImagePath,
} from "@/lib/content/cropImage"

// =============================================================================
// รูปพืช (crops.image_url) และรูปประเภทพืช (crop_types.image_url)
//   - อัปโหลด/ลบ: ผู้มีสิทธิ์แก้ไขเมนูพืช (migration 039)
//   - null = ใช้ไอคอน SVG เดิมในโค้ด
// =============================================================================

type Target = { table: "crops" | "crop_types"; prefix: "crop" | "type" }
const CROP: Target = { table: "crops", prefix: "crop" }
const TYPE: Target = { table: "crop_types", prefix: "type" }

async function currentImage(t: Target, id: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from(t.table).select("image_url").eq("id", id).maybeSingle()
  if (error) throw new Error(`อ่านข้อมูลไม่สำเร็จ: ${error.message}`)
  if (!data) throw new Error("ไม่พบรายการที่จะแก้ไข")
  return (data.image_url as string | null) ?? null
}

async function setImage(t: Target, id: string, url: string | null) {
  const supabase = await createClient()
  const { data, error } = await supabase.from(t.table).update({ image_url: url }).eq("id", id).select("id")
  if (error) throw new Error(`บันทึกรูปไม่สำเร็จ: ${error.message}`)
  if (!data?.length) throw new Error("บันทึกรูปไม่สำเร็จ — ไม่มีสิทธิ์แก้ไขรายการนี้")
}

async function removeFile(url: string | null) {
  const path = cropImagePath(url)
  if (!path) return
  const supabase = await createClient()
  // ไฟล์เก่าไม่ได้ใช้แล้ว — ลบไม่สำเร็จก็ไม่เป็นไร
  await supabase.storage.from(CROP_IMAGE_BUCKET).remove([path])
}

async function upload(t: Target, id: string, formData: FormData): Promise<string> {
  await requirePermission("crops", "edit")
  const file = formData.get("file")
  if (!(file instanceof File)) throw new Error("ไม่พบไฟล์ที่อัปโหลด")
  const ext = CROP_IMAGE_TYPES[file.type]
  if (!ext) throw new Error("รองรับเฉพาะไฟล์ PNG, JPG หรือ WebP")
  if (file.size > CROP_IMAGE_MAX_BYTES) throw new Error("ไฟล์ใหญ่เกิน 2 MB")

  const previous = await currentImage(t, id)
  const supabase = await createClient()
  const path = `${CROP_IMAGE_FOLDER}/${t.prefix}-${id}-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(CROP_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) throw new Error(`อัปโหลดไม่สำเร็จ: ${upErr.message}`)

  const url = supabase.storage.from(CROP_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
  try {
    await setImage(t, id, url)
  } catch (e) {
    await supabase.storage.from(CROP_IMAGE_BUCKET).remove([path])
    throw e
  }
  await removeFile(previous)
  revalidatePath("/admin/crops")
  return url
}

async function reset(t: Target, id: string): Promise<void> {
  await requirePermission("crops", "edit")
  const previous = await currentImage(t, id)
  await setImage(t, id, null)
  await removeFile(previous)
  revalidatePath("/admin/crops")
}

/** อัปโหลดรูปพืช (แทนของเดิม) — คืน URL ใหม่ */
export async function uploadCropImage(cropId: string, formData: FormData): Promise<string> {
  return upload(CROP, cropId, formData)
}

/** กลับไปใช้ไอคอนตั้งต้นของพืช */
export async function resetCropImage(cropId: string): Promise<void> {
  return reset(CROP, cropId)
}

/** อัปโหลดรูปประเภทพืช (แทนของเดิม) — คืน URL ใหม่ */
export async function uploadCropTypeImage(typeId: string, formData: FormData): Promise<string> {
  return upload(TYPE, typeId, formData)
}

/** กลับไปใช้ไอคอนตั้งต้นของประเภทพืช */
export async function resetCropTypeImage(typeId: string): Promise<void> {
  return reset(TYPE, typeId)
}
