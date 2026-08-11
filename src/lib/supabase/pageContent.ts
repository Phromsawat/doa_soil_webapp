"use server"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/supabase/permissions"
import { revalidatePath } from "next/cache"
import { DEFAULT_CONTENT } from "@/lib/content/defaults"
import { PAGE_SLUGS, type Block, type PageContent, type PageSlug } from "@/types/content"

// =============================================================================
// เนื้อหาหน้าข้อมูล — อ่าน: ทุกคน / เขียน: ต้องมีสิทธิ์เมนู "content"
// ยังไม่มีแถวใน DB = ใช้เนื้อหาตั้งต้นจากโค้ด (หน้าไม่มีทางว่าง)
// =============================================================================

function isValidSlug(slug: string): slug is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(slug)
}

/** เนื้อหาของหน้าเดียว — คืนค่าตั้งต้นถ้ายังไม่เคยบันทึก */
export async function getPageContent(slug: string): Promise<PageContent> {
  if (!isValidSlug(slug)) throw new Error(`ไม่รู้จักหน้า "${slug}"`)

  const supabase = await createClient()
  const { data } = await supabase
    .from("page_contents")
    .select("blocks, updated_at")
    .eq("slug", slug)
    .maybeSingle()

  const blocks = (data?.blocks as Block[] | undefined) ?? null
  return {
    slug,
    blocks: blocks && blocks.length > 0 ? blocks : DEFAULT_CONTENT[slug],
    updated_at: data?.updated_at ?? null,
  }
}

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
