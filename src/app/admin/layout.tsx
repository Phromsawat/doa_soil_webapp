import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminSidebar from "@/components/admin/AdminSidebar"
import { getMyPermissions } from "@/lib/supabase/permissions"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side guard — เข้าได้ถ้าเป็น admin หรือมีสิทธิ view เมนูแอดมินอย่างน้อย 1 อัน
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirect=/admin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, full_name, nickname")
    .eq("id", user.id)
    .single()

  const perms = await getMyPermissions()
  const canAccess = Object.values(perms).some((p) => p.view)
  if (!profile || !canAccess) {
    redirect("/?admin_denied=1")
  }

  return (
    <div className="flex min-h-screen -mt-16 pt-16 bg-gray-50 font-thai">
      <AdminSidebar
        perms={perms}
        user={{
          email: profile.email ?? user.email ?? "",
          name: profile.full_name ?? profile.nickname ?? "Admin",
        }}
      />
      <main className="flex-1 lg:ml-64 px-4 lg:px-8 py-6 pb-20 lg:pb-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
