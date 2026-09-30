import { redirect } from "next/navigation"
import { getShowSoilMap } from "@/lib/supabase/settings"
import { isCurrentUserAdmin } from "@/lib/supabase/admin"
import MapClient from "./MapClient"

// แผนที่ดินถูกซ่อนไว้เป็นค่าเริ่มต้น — เข้าถึงได้เมื่อ admin เปิด หรือผู้เข้าชมเป็น admin
export default async function MapPage() {
  const [show, admin] = await Promise.all([getShowSoilMap(), isCurrentUserAdmin()])
  if (!show && !admin) redirect("/")
  return <MapClient />
}
