"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

/**
 * React hook that returns the current Supabase user (or null) reactively.
 * Re-renders whenever the auth state changes (sign in, sign out, anon, etc.).
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Initial load
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isAnonymous = user?.is_anonymous === true
  const isAuthenticated = !!user && !isAnonymous

  /**
   * Raw display name from user metadata.
   * Returns null for anonymous users — callers should localize themselves.
   *   user_metadata.full_name > user_metadata.name > email prefix > phone > null
   */
  const displayName = (() => {
    if (!user || isAnonymous) return null
    const meta = user.user_metadata as Record<string, unknown> | undefined
    if (meta?.full_name && typeof meta.full_name === "string") return meta.full_name
    if (meta?.name && typeof meta.name === "string") return meta.name
    if (user.email) return user.email.split("@")[0]
    if (user.phone) return user.phone
    return null
  })()

  // Anonymous → "?" (callers can override with a localized initial)
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?"

  return {
    user,
    loading,
    isAnonymous,
    isAuthenticated,
    displayName,
    initial,
  }
}
