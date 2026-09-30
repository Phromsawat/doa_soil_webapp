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

/**
 * Lightweight admin-role hook.
 *
 * Persists last-known value in localStorage so it survives navigation between
 * routes without flicker. The cached value is purely a UX hint — the real
 * authorization still happens server-side (RLS + admin layout guard).
 */
const ADMIN_CACHE_KEY = "doa.isAdmin"

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(ADMIN_CACHE_KEY) === "true"
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const applyResult = (next: boolean) => {
      if (!mounted) return
      setIsAdmin(next)
      setLoading(false)
      try { window.localStorage.setItem(ADMIN_CACHE_KEY, String(next)) } catch {}
    }

    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          applyResult(false)
          try { window.localStorage.removeItem(ADMIN_CACHE_KEY) } catch {}
          return
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        if (error) {
          // Don't downgrade the cached value if the query failed (could be a
          // transient network/RLS hiccup during navigation).
          console.warn("[useIsAdmin] role query failed:", error.message)
          if (mounted) setLoading(false)
          return
        }
        applyResult(data?.role === "admin")
      } catch (err) {
        console.warn("[useIsAdmin] check failed:", err)
        if (mounted) setLoading(false)
      }
    }

    check()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        applyResult(false)
        try { window.localStorage.removeItem(ADMIN_CACHE_KEY) } catch {}
      } else {
        check()
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  return { isAdmin, loading }
}
