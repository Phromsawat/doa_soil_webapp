import Home_1 from "./Home_1"
import { getHomeContent } from "@/lib/supabase/settings"

export const dynamic = "force-dynamic"

export default async function Page() {
  // รายละเอียดโครงการที่ admin แก้ไว้ (null = ใช้ข้อความตั้งต้น)
  const content = await getHomeContent()
  return <Home_1 content={content} />
}
