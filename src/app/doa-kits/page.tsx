import ContentPageHeader from "@/components/content/ContentPageHeader"
import PageBlocks from "@/components/content/PageBlocks"
import { getPageContent } from "@/lib/supabase/pageContent"

// เนื้อหาแก้ได้จาก /admin/content — ยังไม่เคยแก้ = ใช้ค่าตั้งต้นใน lib/content/defaults.ts
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
