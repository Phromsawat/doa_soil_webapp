import ContentPageHeader from "@/components/content/ContentPageHeader"
import PageBlocks from "@/components/content/PageBlocks"
import { getPageContent } from "@/lib/content/getPageContent"

// เนื้อหาแก้ได้จาก /admin/content — static + revalidate เมื่อแอดมินบันทึก
// (ดูคำอธิบายเต็มใน src/app/doa-kits/page.tsx)
export const revalidate = 3600

export default async function SoilSamplingPage() {
  const { blocks, updated_at } = await getPageContent("soil-sampling")

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-thai">
      <ContentPageHeader current="soil-sampling" />
      <div className="p-4 max-w-4xl mx-auto">
        <PageBlocks blocks={blocks} updatedAt={updated_at} />
      </div>
    </div>
  )
}
