"use client"

import { createClient } from "@/lib/supabase/client"

// =============================================================================
// AUTH HELPERS — use these from client components
// =============================================================================

/**
 * Sign in as an anonymous user.
 * Creates a temporary user identity tied to the current browser session.
 * The user can later link this identity to Google/email to make it permanent.
 */
export async function signInAnonymously() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.user
}

/**
 * Sign in with Google OAuth.
 * Redirects to Google's consent screen, then back to /auth/callback.
 */
export async function signInWithGoogle(redirectTo?: string) {
  const supabase = createClient()
  const origin = window.location.origin
  const callback = `${origin}/auth/callback${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback,
    },
  })
  if (error) throw error
  return data
}

/**
 * Link the current anonymous user to a Google account.
 * Keeps all the anonymous user's data intact under the new identity.
 */
export async function linkGoogleIdentity() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
  return data
}

/**
 * Sign up with email + password.
 * If "Confirm email" is disabled in Supabase, user is signed in immediately.
 * Otherwise, user receives a verification email and must click the link.
 */
export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
  return data
}

/**
 * Sign in with email + password.
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

/**
 * Send a password-reset email.
 */
export async function sendPasswordReset(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  if (error) throw error
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get the current user (client-side).
 * Returns null if not signed in.
 */
export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Check whether the current user is anonymous.
 * Anonymous users have `is_anonymous: true` in their JWT app_metadata.
 */
export function isAnonymousUser(user: { is_anonymous?: boolean } | null) {
  return user?.is_anonymous === true
}

/**
 * Ensure the user has *some* session — either an existing one or a fresh anonymous.
 * Useful for "guest access" routes that still need RLS-scoped data access.
 */
export async function ensureSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user
  return signInAnonymously()
}
