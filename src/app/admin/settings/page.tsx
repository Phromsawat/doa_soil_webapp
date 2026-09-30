import { Settings } from "lucide-react"
import { getHomeContent, getShowSoilMap } from "@/lib/supabase/settings"
import MapVisibilityToggle from "./MapVisibilityToggle"
import HomeContentEditor from "./HomeContentEditor"

export default async function AdminSettingsPage() {
  const [showMap, homeContent] = await Promise.all([getShowSoilMap(), getHomeContent()])

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-[#1A4D2E]" />
        <div>
          <h1 className="text-xl font-bold text-gray-800">ตั้งค่าระบบ</h1>
          <p className="text-sm text-gray-500">เปิด/ปิดฟีเจอร์ และแก้ไขเนื้อหาที่แสดงให้ผู้ใช้ทั่วไป</p>
        </div>
      </div>

      <MapVisibilityToggle initial={showMap} />
      <HomeContentEditor initial={homeContent} />
    </div>
  )
}
