import { notFound } from "next/navigation"
import ContentEditor from "./ContentEditor"
import { getPageContent } from "@/lib/content/getPageContent"
import { getMyPermissions } from "@/lib/supabase/permissions"
import { can } from "@/lib/rbac"
import { PAGE_SLUGS, PAGE_TITLES, type PageSlug } from "@/types/content"

export const dynamic = "force-dynamic"

export default async function AdminContentEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!(PAGE_SLUGS as readonly string[]).includes(slug)) notFound()
  const pageSlug = slug as PageSlug

  const [content, perms] = await Promise.all([getPageContent(pageSlug), getMyPermissions()])
  if (!can(perms, "content", "view")) notFound()

  return (
    <ContentEditor
      slug={pageSlug}
      title={PAGE_TITLES[pageSlug]}
      initialBlocks={content.blocks}
      updatedAt={content.updated_at}
      customised={content.updated_at !== null}
      canReset={can(perms, "content", "delete")}
    />
  )
}
