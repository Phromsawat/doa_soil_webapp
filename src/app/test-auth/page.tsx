"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  signInAnonymously,
  signInWithGoogle,
  linkGoogleIdentity,
  signOut,
} from "@/lib/supabase/auth"
import type { User } from "@supabase/supabase-js"

export default function TestAuthPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initial load
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    // Subscribe to changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  async function handle(action: () => Promise<unknown>, label: string) {
    setError(null)
    setActionMsg(null)
    try {
      await action()
      setActionMsg(`✓ ${label} success`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const isAnonymous = user?.is_anonymous === true

  return (
    <div className="font-thai max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#1A4D2E]">Auth Test</h1>

      {/* Current session */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
        <h2 className="font-semibold text-gray-800">Current Session</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : user ? (
          <div className="space-y-2 text-sm">
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              isAnonymous
                ? "bg-orange-100 text-orange-700"
                : "bg-green-100 text-green-700"
            }`}>
              {isAnonymous ? "👤 Anonymous user" : "✅ Authenticated user"}
            </div>
            <p><span className="font-medium">User ID:</span> <code className="bg-gray-50 px-2 py-0.5 rounded text-xs">{user.id}</code></p>
            {user.email && <p><span className="font-medium">Email:</span> {user.email}</p>}
            {user.phone && <p><span className="font-medium">Phone:</span> {user.phone}</p>}
            <p><span className="font-medium">Provider:</span> {user.app_metadata?.provider ?? "anonymous"}</p>
            <p><span className="font-medium">Created:</span> {new Date(user.created_at).toLocaleString()}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No session — not signed in</p>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
        <h2 className="font-semibold text-gray-800">Actions</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => handle(signInAnonymously, "Anonymous sign-in")}
            disabled={!!user}
            className="px-4 py-2 bg-[#1A4D2E] text-white rounded-full text-sm font-medium hover:bg-[#143a22] disabled:opacity-50"
          >
            👤 Sign in anonymously
          </button>

          <button
            onClick={() => handle(() => signInWithGoogle("/test-auth"), "Google sign-in")}
            disabled={!!user && !isAnonymous}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            🔵 Sign in with Google
          </button>

          {isAnonymous && (
            <button
              onClick={() => handle(linkGoogleIdentity, "Link Google to anonymous account")}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 sm:col-span-2"
            >
              🔗 Convert anonymous → Google account
            </button>
          )}

          {user && (
            <button
              onClick={() => handle(signOut, "Sign out")}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-medium hover:bg-red-100 sm:col-span-2"
            >
              🚪 Sign out
            </button>
          )}
        </div>
      </div>

      {/* Result */}
      {actionMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-sm">{actionMsg}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm">
          <p className="font-semibold">Error:</p>
          <pre className="whitespace-pre-wrap mt-1 text-xs">{error}</pre>
        </div>
      )}

      {/* Help */}
      <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl text-xs space-y-1">
        <p className="font-semibold">⚠️ ก่อนใช้:</p>
        <p>• Anonymous sign-in ต้องเปิดใน Supabase Dashboard → Authentication → Sign In / Providers</p>
        <p>• Google sign-in ต้อง setup Google OAuth ก่อน (ดู Phase 2b)</p>
      </div>
    </div>
  )
}
