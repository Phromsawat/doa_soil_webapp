import { createBrowserClient } from "@supabase/ssr"
import { LOCAL_MODE, createLocalClient, type QuerySpec, type QueryResult } from "@/lib/local/query"

function supabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

// local mode (ไม่มี Supabase key): query วิ่งไป /api/local-db แทน
async function browserExec(spec: QuerySpec): Promise<QueryResult> {
  const res = await fetch("/api/local-db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(spec),
  })
  return res.json()
}

export function createClient(): ReturnType<typeof supabaseClient> {
  if (LOCAL_MODE) {
    return createLocalClient(browserExec) as unknown as ReturnType<typeof supabaseClient>
  }
  return supabaseClient()
}
