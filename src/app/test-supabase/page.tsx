import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function TestSupabasePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // "Auth session missing" is normal when no user is logged in — not a real error
  const isSessionMissing = error?.message === "Auth session missing!"
  const isRealError = error && !isSessionMissing

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasPublishable = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const hasSecret = !!process.env.SUPABASE_SECRET_KEY

  return (
    <div className="font-thai max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#1A4D2E]">Supabase Connection Test</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Environment</h2>
        <ul className="text-sm space-y-2 text-gray-700">
          <li>
            <span className="font-medium">Project URL:</span>{" "}
            <code className="bg-gray-50 px-2 py-1 rounded">{projectUrl}</code>
          </li>
          <li>
            <span className="font-medium">Publishable key:</span>{" "}
            <span className={hasPublishable ? "text-green-600" : "text-red-600"}>
              {hasPublishable ? "✓ loaded" : "✗ missing"}
            </span>
          </li>
          <li>
            <span className="font-medium">Secret key:</span>{" "}
            <span className={hasSecret ? "text-green-600" : "text-red-600"}>
              {hasSecret ? "✓ loaded" : "✗ missing"}
            </span>
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Auth Status</h2>
        {isRealError ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">
            <p className="font-semibold">Connection error:</p>
            <pre className="mt-2 whitespace-pre-wrap">{error?.message}</pre>
          </div>
        ) : user ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm">
            <p className="font-semibold">✓ Connected — Logged in</p>
            <p className="mt-2">User ID: {user.id}</p>
            <p>Email: {user.email}</p>
          </div>
        ) : (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm">
            <p className="font-semibold">✓ Supabase connected successfully</p>
            <p className="mt-2 text-xs">
              No user logged in — this is expected. Auth system is reachable and ready to accept logins.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
