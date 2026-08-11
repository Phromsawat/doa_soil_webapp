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
