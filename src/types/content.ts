// นิยามบล็อกเนื้อหาสำหรับหน้าข้อมูล (doa-kits / soil-sampling / user-guide)
// หน้า = ลำดับของบล็อก แอดมินเพิ่ม/ลบ/สลับลำดับได้จาก /admin/content
// แต่ละชนิดบล็อก render ด้วยดีไซน์ที่กำหนดไว้ตายตัว แอดมินแก้ได้แค่ "เนื้อหา" ไม่ใช่ "หน้าตา"

export const PAGE_SLUGS = ["doa-kits", "soil-sampling", "user-guide"] as const
export type PageSlug = (typeof PAGE_SLUGS)[number]

export const PAGE_TITLES: Record<PageSlug, string> = {
  "doa-kits": "การวิเคราะห์ดินด้วย DOA-Soil Test Kits",
  "soil-sampling": "วิธีการเก็บตัวอย่างดิน",
  "user-guide": "คู่มือการใช้เว็บแอปฯ",
}

export type ImageSize = "sm" | "md" | "lg" | "full"

export interface BlockImage {
  src: string
  alt?: string
  size?: ImageSize      // ไม่ระบุ = lg
}

export interface NoteItem {
  title?: string
  text: string
}

/** หัวข้อใหญ่ — ใช้รีเซ็ตเลขลำดับของบล็อก step ที่ตามมาด้วย */
export interface HeadingBlock {
  id: string
  type: "heading"
  text: string
  align?: "left" | "center"
}

export interface ParagraphBlock {
  id: string
  type: "paragraph"
  text: string
}

/** การ์ดขาว หัวข้อหนา + ย่อหน้า (เช่น "1. การเตรียมอุปกรณ์") */
export interface CardBlock {
  id: string
  type: "card"
  title: string
  text: string
}

export interface ImageBlock {
  id: string
  type: "image"
  image: BlockImage
}

export interface VideoBlock {
  id: string
  type: "video"
  url: string            // ลิงก์ YouTube (ปกติหรือ embed ก็ได้)
  title?: string
  description?: string
}

/** กล่องสี — เหลือง (warning) สำหรับหมายเหตุ, เขียว (info) สำหรับข้อมูลเพิ่มเติม */
export interface NoteBlock {
  id: string
  type: "note"
  tone: "warning" | "info"
  title?: string
  intro?: string
  items: NoteItem[]
  footnote?: string
  showUpdatedAt?: boolean   // true = แสดง "แก้ไขข้อมูลเมื่อวันที่ …" จากเวลาที่บันทึกจริง
}

/** ขั้นตอนมีเลข — เลขนับต่อเนื่องและรีเซ็ตทุกครั้งที่เจอบล็อก heading */
export interface StepBlock {
  id: string
  type: "step"
  text: string
  hint?: string
  warning?: string
  images?: BlockImage[]
}

export interface ContactBlock {
  id: string
  type: "contact"
  title?: string
  org?: string
  address?: string
  phone?: string
  phoneNote?: string
  email?: string
}

export interface ButtonBlock {
  id: string
  type: "button"
  label: string
  href: string
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | CardBlock
  | ImageBlock
  | VideoBlock
  | NoteBlock
  | StepBlock
  | ContactBlock
  | ButtonBlock

export type BlockType = Block["type"]

/** ป้ายชื่อภาษาไทยของแต่ละชนิดบล็อก — ใช้ในเมนู "เพิ่มบล็อก" ของแอดมิน */
export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "หัวข้อใหญ่",
  paragraph: "ย่อหน้า",
  card: "การ์ดหัวข้อ",
  image: "รูปภาพ",
  video: "วิดีโอ YouTube",
  note: "กล่องหมายเหตุ",
  step: "ขั้นตอน (มีเลข)",
  contact: "ข้อมูลติดต่อ",
  button: "ปุ่มลิงก์",
}

export interface PageContent {
  slug: PageSlug
  blocks: Block[]
  updated_at: string | null
}

/** สร้าง id สั้น ๆ ให้บล็อกใหม่ (ใช้เป็น React key และอ้างอิงตอนสลับลำดับ) */
export function newBlockId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** บล็อกเปล่าตามชนิด — ใช้ตอนกด "เพิ่มบล็อก" */
export function emptyBlock(type: BlockType): Block {
  const id = newBlockId()
  switch (type) {
    case "heading":   return { id, type, text: "" }
    case "paragraph": return { id, type, text: "" }
    case "card":      return { id, type, title: "", text: "" }
    case "image":     return { id, type, image: { src: "", alt: "" } }
    case "video":     return { id, type, url: "" }
    case "note":      return { id, type, tone: "warning", title: "หมายเหตุ", items: [{ text: "" }] }
    case "step":      return { id, type, text: "" }
    case "contact":   return { id, type, title: "สอบถามข้อมูลเพิ่มเติม" }
    case "button":    return { id, type, label: "", href: "/" }
  }
}
