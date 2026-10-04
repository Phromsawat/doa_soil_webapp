import { NextResponse, type NextRequest } from "next/server"
import { createPublicClient } from "@/lib/supabase/public"

// โลโก้เว็บไซต์ — ทุกหน้าใช้ <img src="/api/site-logo"> จุดเดียว แอดมินเปลี่ยนรูปแล้วเปลี่ยนทั้งเว็บ
// (แถบเมนู, หน้า login/สมัคร/ลืมรหัส, หัวรายงาน PDF)
//
// ส่งต่อไฟล์จาก Supabase Storage ผ่านโดเมนเราเอง (ไม่ redirect) เพราะรายงาน PDF ถ่ายภาพหน้าจอ
// ด้วย html-to-image ซึ่งต้องโหลดรูปแบบ same-origin
//
// ความปลอดภัย:
// - ดึงเฉพาะไฟล์ใน bucket page-images/site/ ของโปรเจกต์เราเท่านั้น (กันถูกใช้ดึง URL อื่น)
// - CSP sandbox: ถ้าเป็น SVG ที่มีสคริปต์แฝง แล้วมีคนเปิด URL นี้ตรง ๆ สคริปต์จะไม่ทำงานบนโดเมนเรา

export const dynamic = "force-dynamic"

const DEFAULT_LOGO = "/doa-logo.svg"
const ALLOWED_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/page-images/site/`

export async function GET(request: NextRequest) {
  const fallback = () => NextResponse.redirect(new URL(DEFAULT_LOGO, request.url), 307)

  try {
    const { data } = await createPublicClient()
      .from("app_settings")
      .select("value")
      .eq("key", "site_logo")
      .maybeSingle()
    const url = (data?.value as { url?: string } | null)?.url
    if (!url || !url.startsWith(ALLOWED_PREFIX)) return fallback()

    const upstream = await fetch(url, { cache: "no-store" })
    const type = upstream.headers.get("content-type") ?? ""
    if (!upstream.ok || !type.startsWith("image/")) return fallback()

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": type,
        // เปลี่ยนโลโก้แล้วเห็นผลภายใน ~1 นาที
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=600",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return fallback()
  }
}
