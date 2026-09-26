import { notFound } from "next/navigation"
import HomeContentEditor from "./HomeContentEditor"
import { getHomeContent } from "@/lib/content/getHomeContent"
import { resolveHome } from "@/lib/content/home"
import { getMyPermissions } from "@/lib/supabase/permissions"
import { can } from "@/lib/rbac"

export const dynamic = "force-dynamic"

// ฟอร์มเติมข้อความที่หน้าเว็บแสดงอยู่จริงทุกช่อง (ทั้งไทยและอังกฤษ) ให้แก้ต่อได้เลย
// ช่องที่เคยบันทึกเป็นค่าว่าง = แสดงข้อความตั้งต้น จึงเติมค่านั้นให้เห็นตรงกับหน้าเว็บ
export default async function AdminHomeContentPage() {
  const [{ stored, updated_at }, perms] = await Promise.all([getHomeContent(), getMyPermissions()])
  if (!can(perms, "content", "view")) notFound()

  return (
    <HomeContentEditor
      initial={resolveHome(stored)}
      updatedAt={updated_at}
      customised={stored !== null}
      canReset={can(perms, "content", "delete")}
    />
  )
}
