// อ่านเนื้อหาหน้าข้อมูล — ฟังก์ชันธรรมดา (ไม่ใช่ server action) และไม่แตะ cookie
// หน้าที่เรียกจึงยังเป็น static ได้ อัปเดตผ่าน revalidatePath() ตอนแอดมินบันทึก
//
// การเขียน/รายการสำหรับแอดมิน อยู่ที่ src/lib/supabase/pageContent.ts

import { createPublicClient } from "@/lib/supabase/public"
import { DEFAULT_CONTENT } from "@/lib/content/defaults"
import { PAGE_SLUGS, type Block, type PageContent, type PageSlug } from "@/types/content"

export function isValidSlug(slug: string): slug is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(slug)
}

/** เนื้อหาของหน้าเดียว — คืนค่าตั้งต้นถ้ายังไม่เคยบันทึก (หรืออ่าน DB ไม่ได้) */
export async function getPageContent(slug: string): Promise<PageContent> {
  if (!isValidSlug(slug)) throw new Error(`ไม่รู้จักหน้า "${slug}"`)

  const supabase = createPublicClient()
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
