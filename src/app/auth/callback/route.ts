import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * OAuth callback handler.
 * Google (and other OAuth providers) redirect here with a `code` query param.
 * We exchange it for a session, then redirect to the intended page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }

    console.error("OAuth exchange error:", error.message)
  }

  // Something went wrong — bounce to login with an error flag
  return NextResponse.redirect(`${origin}/login?auth_error=1`)
}
