import { Settings } from "lucide-react"
import { getShowSoilMap, getSiteLogoSetting } from "@/lib/supabase/settings"
import MapVisibilityToggle from "./MapVisibilityToggle"
import SiteLogoUploader from "./SiteLogoUploader"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const [showMap, logo] = await Promise.all([getShowSoilMap(), getSiteLogoSetting().catch(() => null)])

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-[#1A4D2E]" />
        <div>
          <h1 className="text-xl font-bold text-gray-800">ตั้งค่าระบบ</h1>
          <p className="text-sm text-gray-500">โลโก้เว็บไซต์ และเปิด/ปิดฟีเจอร์ที่แสดงให้ผู้ใช้ทั่วไป</p>
        </div>
      </div>

      <SiteLogoUploader customised={!!logo} updatedAt={logo?.updated_at ?? null} />
      <MapVisibilityToggle initial={showMap} />
    </div>
  )
}
