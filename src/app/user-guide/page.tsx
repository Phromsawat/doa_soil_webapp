import ContentPageHeader from "@/components/content/ContentPageHeader"
import PageBlocks from "@/components/content/PageBlocks"
import { getPageContent } from "@/lib/supabase/pageContent"

// เนื้อหาแก้ได้จาก /admin/content — ยังไม่เคยแก้ = ใช้ค่าตั้งต้นใน lib/content/defaults.ts
export default async function UserGuidePage() {
  const { blocks, updated_at } = await getPageContent("user-guide")

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-thai">
      <ContentPageHeader current="user-guide" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
          <PageBlocks blocks={blocks} updatedAt={updated_at} />
        </div>
      </div>
    </div>
  )
}
