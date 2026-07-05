import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminSidebar from "@/components/admin/AdminSidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side guard — block non-admins immediately
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

  if (!profile || profile.role !== "admin") {
    redirect("/?admin_denied=1")
  }

  return (
    <div className="flex min-h-screen -mt-16 pt-16 bg-gray-50 font-thai">
      <AdminSidebar
        user={{
          email: profile.email ?? user.email ?? "",
          name: profile.full_name ?? profile.nickname ?? "Admin",
        }}
      />
      <main className="flex-1 lg:ml-64 px-4 lg:px-8 py-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
