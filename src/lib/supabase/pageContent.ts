"use server"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/supabase/permissions"
import { revalidatePath } from "next/cache"
import { DEFAULT_CONTENT } from "@/lib/content/defaults"
import { isValidSlug } from "@/lib/content/getPageContent"
import { PAGE_SLUGS, type Block, type PageSlug } from "@/types/content"

// =============================================================================
// เนื้อหาหน้าข้อมูล — ฝั่งเขียน/แอดมิน (ต้องมีสิทธิ์เมนู "content")
// ฝั่งอ่านสำหรับ render อยู่ที่ lib/content/getPageContent.ts (ไม่แตะ cookie
// หน้าจึงเป็น static ได้)
// =============================================================================

/** รายการหน้าทั้งหมด + เวลาที่แก้ล่าสุด — สำหรับหน้ารวมในแผงแอดมิน */
export async function listPageContents(): Promise<
  Array<{ slug: PageSlug; updated_at: string | null; blockCount: number; customised: boolean }>
> {
  await requirePermission("content", "view")
  const supabase = await createClient()
  const { data } = await supabase.from("page_contents").select("slug, blocks, updated_at")

  const bySlug = new Map((data ?? []).map((r) => [r.slug as string, r]))
  return PAGE_SLUGS.map((slug) => {
    const row = bySlug.get(slug)
    const blocks = (row?.blocks as Block[] | undefined) ?? null
    const customised = !!blocks && blocks.length > 0
    return {
      slug,
      updated_at: (row?.updated_at as string | undefined) ?? null,
      blockCount: customised ? blocks.length : DEFAULT_CONTENT[slug].length,
      customised,
    }
  })
}

/** บันทึกเนื้อหา (upsert) */
export async function savePageContent(slug: string, blocks: Block[]) {
  if (!isValidSlug(slug)) throw new Error(`ไม่รู้จักหน้า "${slug}"`)
  const { user } = await requirePermission("content", "edit")

  const supabase = await createClient()
  const { error } = await supabase
    .from("page_contents")
    .upsert(
      { slug, blocks, updated_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: "slug" }
    )
  if (error) throw new Error(`savePageContent: ${error.message}`)

  revalidatePath(`/${slug}`)
  revalidatePath("/admin/content")
}

const IMAGE_BUCKET = "page-images"
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]

/**
 * อัปโหลดรูปสำหรับใช้ในเนื้อหา แล้วคืน URL สาธารณะไปใส่ในบล็อก
 * จำกัดชนิดและขนาดไฟล์ที่นี่อีกชั้น (นอกเหนือจาก policy ของ bucket)
 */
export async function uploadContentImage(formData: FormData): Promise<string> {
  await requirePermission("content", "edit")

  const file = formData.get("file")
  if (!(file instanceof File)) throw new Error("ไม่พบไฟล์ที่อัปโหลด")
  if (file.size > MAX_IMAGE_BYTES) throw new Error("ไฟล์ใหญ่เกิน 5 MB")
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP, GIF, SVG)")
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const supabase = await createClient()
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`อัปโหลดไม่สำเร็จ: ${error.message}`)

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** คืนค่าหน้าให้กลับไปใช้เนื้อหาตั้งต้น (ลบแถวใน DB ทิ้ง) */
export async function resetPageContent(slug: string) {
  if (!isValidSlug(slug)) throw new Error(`ไม่รู้จักหน้า "${slug}"`)
  await requirePermission("content", "delete")

  const supabase = await createClient()
  const { error } = await supabase.from("page_contents").delete().eq("slug", slug)
  if (error) throw new Error(`resetPageContent: ${error.message}`)

  revalidatePath(`/${slug}`)
  revalidatePath("/admin/content")
}
