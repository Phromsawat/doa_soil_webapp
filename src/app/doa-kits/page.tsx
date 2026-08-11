import ContentPageHeader from "@/components/content/ContentPageHeader"
import PageBlocks from "@/components/content/PageBlocks"
import { getPageContent } from "@/lib/content/getPageContent"

// เนื้อหาแก้ได้จาก /admin/content — ยังไม่เคยแก้ = ใช้ค่าตั้งต้นใน lib/content/defaults.ts
//
// หน้านี้เป็น static (ไม่แตะ cookie) เสิร์ฟจาก CDN ได้เต็มที่
// แอดมินกดบันทึก -> revalidatePath ใน savePageContent สั่งสร้างหน้าใหม่ทันที
// ตัวเลขด้านล่างเป็นแค่ตาข่ายกันพลาด (รีเฟรชเองทุก 1 ชม.)
export const revalidate = 3600

export default async function DoaKitsPage() {
  const { blocks, updated_at } = await getPageContent("doa-kits")

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-thai">
      <ContentPageHeader current="doa-kits" />
      <div className="p-4 max-w-4xl mx-auto">
        <PageBlocks blocks={blocks} updatedAt={updated_at} />
      </div>
    </div>
  )
}
