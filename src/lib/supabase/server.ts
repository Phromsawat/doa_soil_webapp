import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { LOCAL_MODE, createLocalClient } from "@/lib/local/query"
import { executeLocal } from "@/lib/local/engine"

type CookieStore = Awaited<ReturnType<typeof cookies>>

function supabaseClient(cookieStore: CookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — middleware refreshes the session
          }
        },
      },
    }
  )
}

type Client = ReturnType<typeof supabaseClient>

// local mode (ไม่มี Supabase key): ใช้ฐานข้อมูล JSON ในเครื่อง — ดู src/lib/local/
function localClient(): Client {
  return createLocalClient(executeLocal) as unknown as Client
}

export async function createClient(): Promise<Client> {
  if (LOCAL_MODE) return localClient()
  return supabaseClient(await cookies())
}

export function createAdminClient(): Client {
  if (LOCAL_MODE) return localClient()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Admin client doesn't persist sessions
        },
      },
    }
  )
}
