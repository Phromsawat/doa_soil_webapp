"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2, Check,
  Eye, EyeOff, RotateCcw, ExternalLink, X, Upload,
} from "lucide-react"
import PageBlocks from "@/components/content/PageBlocks"
import { savePageContent, resetPageContent, uploadContentImage } from "@/lib/supabase/pageContent"
import {
  BLOCK_LABELS, emptyBlock, newBlockId,
  type Block, type BlockType, type ImageSize, type PageSlug,
} from "@/types/content"

const BLOCK_ORDER: BlockType[] = [
  "heading", "step", "paragraph", "card", "image", "video", "note", "contact", "button",
]

const SIZE_LABELS: Record<ImageSize, string> = {
  sm: "เล็ก", md: "กลาง", lg: "ใหญ่", full: "เต็มความกว้าง",
}

// ---------------------------------------------------------------- ช่องกรอกย่อย

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A4D2E] focus:outline-none"

function TextInput({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

function TextArea({
  label, value, onChange, rows = 3, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <Field label={label}>
      <textarea
        className={`${inputCls} leading-relaxed`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

/** ช่องใส่ที่อยู่รูป + ปุ่มอัปโหลดไฟล์ (อัปโหลดเสร็จเติม URL ให้อัตโนมัติ) */
function ImageSrcInput({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      onChange(await uploadContentImage(fd))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Field label="ที่อยู่รูป">
        <div className="mt-1 flex gap-2">
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A4D2E] focus:outline-none"
            value={value}
            placeholder="/img/example.png หรือกดอัปโหลด"
            onChange={(e) => onChange(e.target.value)}
          />
          <label
            className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 ${
              busy ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {busy ? "กำลังอัปโหลด" : "อัปโหลด"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </div>
      </Field>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 h-16 rounded border border-gray-100 object-contain" />
      )}
    </div>
  )
}

/** แก้รายการรูป (ใช้ในบล็อก step) */
function ImageListEditor({
  images, onChange,
}: {
  images: { src: string; alt?: string; size?: ImageSize }[]
  onChange: (v: { src: string; alt?: string; size?: ImageSize }[]) => void
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-gray-500">รูปประกอบ</span>
      {images.map((img, i) => (
        <div key={i} className="flex items-end gap-2 rounded-lg bg-gray-50 p-2">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <ImageSrcInput
              value={img.src}
              onChange={(v) => onChange(images.map((x, j) => (j === i ? { ...x, src: v } : x)))}
            />
            <TextInput
              label="คำอธิบายรูป"
              value={img.alt ?? ""}
              onChange={(v) => onChange(images.map((x, j) => (j === i ? { ...x, alt: v } : x)))}
            />
            <Field label="ขนาด">
              <select
                className={inputCls}
                value={img.size ?? "lg"}
                onChange={(e) =>
                  onChange(images.map((x, j) => (j === i ? { ...x, size: e.target.value as ImageSize } : x)))
                }
              >
                {(Object.keys(SIZE_LABELS) as ImageSize[]).map((s) => (
                  <option key={s} value={s}>{SIZE_LABELS[s]}</option>
                ))}
              </select>
            </Field>
          </div>
          <button
            onClick={() => onChange(images.filter((_, j) => j !== i))}
            className="mb-1 rounded-lg p-2 text-gray-400 hover:bg-gray-200"
            aria-label="ลบรูป"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...images, { src: "", alt: "", size: "lg" }])}
        className="flex items-center gap-1 text-xs font-medium text-[#1A4D2E] hover:opacity-80"
      >
        <Plus className="h-3.5 w-3.5" /> เพิ่มรูป
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- ฟอร์มต่อบล็อก

function BlockFields({ block, patch }: { block: Block; patch: (p: Partial<Block>) => void }) {
  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-3">
          <TextInput label="ข้อความหัวข้อ" value={block.text} onChange={(v) => patch({ text: v } as Partial<Block>)} />
          <Field label="การจัดวาง">
            <select
              className={inputCls}
              value={block.align ?? "left"}
              onChange={(e) => patch({ align: e.target.value as "left" | "center" } as Partial<Block>)}
            >
              <option value="left">ชิดซ้าย (มีแถบเขียว)</option>
              <option value="center">กึ่งกลาง</option>
            </select>
          </Field>
          <p className="text-[11px] text-gray-400">หมายเหตุ: เลขของบล็อก “ขั้นตอน” จะเริ่มนับ 1 ใหม่หลังหัวข้อนี้</p>
        </div>
      )

    case "paragraph":
      return <TextArea label="ข้อความ" value={block.text} onChange={(v) => patch({ text: v } as Partial<Block>)} />

    case "card":
      return (
        <div className="space-y-3">
          <TextInput label="หัวข้อการ์ด" value={block.title} onChange={(v) => patch({ title: v } as Partial<Block>)} />
          <TextArea label="เนื้อหา" value={block.text} onChange={(v) => patch({ text: v } as Partial<Block>)} />
        </div>
      )

    case "image":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
          <ImageSrcInput
            value={block.image.src}
            onChange={(v) => patch({ image: { ...block.image, src: v } } as Partial<Block>)}
          />
          <TextInput
            label="คำอธิบายรูป"
            value={block.image.alt ?? ""}
            onChange={(v) => patch({ image: { ...block.image, alt: v } } as Partial<Block>)}
          />
          <Field label="ขนาด">
            <select
              className={inputCls}
              value={block.image.size ?? "lg"}
              onChange={(e) => patch({ image: { ...block.image, size: e.target.value as ImageSize } } as Partial<Block>)}
            >
              {(Object.keys(SIZE_LABELS) as ImageSize[]).map((s) => (
                <option key={s} value={s}>{SIZE_LABELS[s]}</option>
              ))}
            </select>
          </Field>
        </div>
      )

    case "video":
      return (
        <div className="space-y-3">
          <TextInput
            label="ลิงก์ YouTube"
            value={block.url}
            placeholder="https://www.youtube.com/watch?v=..."
            onChange={(v) => patch({ url: v } as Partial<Block>)}
          />
          <TextInput label="หัวข้อ" value={block.title ?? ""} onChange={(v) => patch({ title: v } as Partial<Block>)} />
          <TextArea label="คำอธิบาย" value={block.description ?? ""} onChange={(v) => patch({ description: v } as Partial<Block>)} />
        </div>
      )

    case "note":
      return (
        <div className="space-y-3">
          <Field label="สีกล่อง">
            <select
              className={inputCls}
              value={block.tone}
              onChange={(e) => patch({ tone: e.target.value as "warning" | "info" } as Partial<Block>)}
            >
              <option value="warning">เหลือง (หมายเหตุ/คำเตือน)</option>
              <option value="info">เขียว (ข้อมูลเพิ่มเติม)</option>
            </select>
          </Field>
          <TextInput label="หัวข้อกล่อง" value={block.title ?? ""} onChange={(v) => patch({ title: v } as Partial<Block>)} />
          <TextArea label="ข้อความนำ (ไม่บังคับ)" value={block.intro ?? ""} rows={2} onChange={(v) => patch({ intro: v } as Partial<Block>)} />

          <div className="space-y-2">
            <span className="text-xs font-medium text-gray-500">รายการย่อย</span>
            {block.items.map((it, i) => (
              <div key={i} className="flex items-end gap-2 rounded-lg bg-gray-50 p-2">
                <div className="flex-1 space-y-2">
                  <TextInput
                    label="หัวข้อย่อย (เว้นว่างได้ = แสดงเป็นจุดนำ)"
                    value={it.title ?? ""}
                    onChange={(v) => patch({ items: block.items.map((x, j) => (j === i ? { ...x, title: v } : x)) } as Partial<Block>)}
                  />
                  <TextArea
                    label="ข้อความ"
                    rows={2}
                    value={it.text}
                    onChange={(v) => patch({ items: block.items.map((x, j) => (j === i ? { ...x, text: v } : x)) } as Partial<Block>)}
                  />
                </div>
                <button
                  onClick={() => patch({ items: block.items.filter((_, j) => j !== i) } as Partial<Block>)}
                  className="mb-1 rounded-lg p-2 text-gray-400 hover:bg-gray-200"
                  aria-label="ลบรายการ"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => patch({ items: [...block.items, { text: "" }] } as Partial<Block>)}
              className="flex items-center gap-1 text-xs font-medium text-[#1A4D2E] hover:opacity-80"
            >
              <Plus className="h-3.5 w-3.5" /> เพิ่มรายการ
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={block.showUpdatedAt ?? false}
              onChange={(e) => patch({ showUpdatedAt: e.target.checked } as Partial<Block>)}
            />
            แสดง “แก้ไขข้อมูลเมื่อวันที่ …” อัตโนมัติจากเวลาที่บันทึก
          </label>
          {!block.showUpdatedAt && (
            <TextInput label="ข้อความท้ายกล่อง" value={block.footnote ?? ""} onChange={(v) => patch({ footnote: v } as Partial<Block>)} />
          )}
        </div>
      )

    case "step":
      return (
        <div className="space-y-3">
          <TextArea label="ข้อความขั้นตอน" value={block.text} onChange={(v) => patch({ text: v } as Partial<Block>)} />
          <TextArea label="คำอธิบายเสริม (สีเทา)" rows={2} value={block.hint ?? ""} onChange={(v) => patch({ hint: v } as Partial<Block>)} />
          <TextArea label="กล่องคำเตือน (สีแดง)" rows={2} value={block.warning ?? ""} onChange={(v) => patch({ warning: v } as Partial<Block>)} />
          <ImageListEditor images={block.images ?? []} onChange={(v) => patch({ images: v } as Partial<Block>)} />
        </div>
      )

    case "contact":
      return (
        <div className="space-y-3">
          <TextInput label="หัวข้อ" value={block.title ?? ""} onChange={(v) => patch({ title: v } as Partial<Block>)} />
          <TextArea label="ชื่อหน่วยงาน" rows={2} value={block.org ?? ""} onChange={(v) => patch({ org: v } as Partial<Block>)} />
          <TextArea label="ที่อยู่" rows={2} value={block.address ?? ""} onChange={(v) => patch({ address: v } as Partial<Block>)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput label="โทรศัพท์" value={block.phone ?? ""} onChange={(v) => patch({ phone: v } as Partial<Block>)} />
            <TextInput label="ต่อ / หมายเหตุ" value={block.phoneNote ?? ""} onChange={(v) => patch({ phoneNote: v } as Partial<Block>)} />
          </div>
          <TextInput label="อีเมล" value={block.email ?? ""} onChange={(v) => patch({ email: v } as Partial<Block>)} />
        </div>
      )

    case "button":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput label="ข้อความบนปุ่ม" value={block.label} onChange={(v) => patch({ label: v } as Partial<Block>)} />
          <TextInput label="ลิงก์ปลายทาง" value={block.href} placeholder="/analyze/form" onChange={(v) => patch({ href: v } as Partial<Block>)} />
        </div>
      )
  }
}

// ---------------------------------------------------------------- ตัวแก้ไขหลัก

export default function ContentEditor({
  slug, title, initialBlocks, updatedAt, customised, canReset,
}: {
  slug: PageSlug
  title: string
  initialBlocks: Block[]
  updatedAt: string | null
  customised: boolean
  canReset: boolean
}) {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    // บล็อกจากค่าตั้งต้นใช้ id คงที่ — ให้ id ใหม่กันชนกันเวลาเพิ่มบล็อก
    initialBlocks.map((b) => ({ ...b, id: b.id || newBlockId() }))
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [adding, setAdding] = useState(false)

  function mutate(next: Block[]) {
    setBlocks(next)
    setDirty(true)
    setSaved(false)
  }

  const patchBlock = (id: string, p: Partial<Block>) =>
    mutate(blocks.map((b) => (b.id === id ? ({ ...b, ...p } as Block) : b)))

  const removeBlock = (id: string) => mutate(blocks.filter((b) => b.id !== id))

  function moveBlock(id: string, dir: -1 | 1) {
    const i = blocks.findIndex((b) => b.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    mutate(next)
  }

  function addBlock(type: BlockType) {
    mutate([...blocks, emptyBlock(type)])
    setAdding(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await savePageContent(slug, blocks)
      setDirty(false)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm("คืนค่าหน้านี้กลับไปใช้เนื้อหาตั้งต้น? การแก้ไขที่บันทึกไว้จะถูกลบทิ้ง")) return
    setSaving(true)
    setError(null)
    try {
      await resetPageContent(slug)
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <div className="font-thai space-y-5 pb-24">
      {/* หัวเรื่อง + ปุ่มหลัก */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Link href="/admin/content" className="text-xs text-gray-500 hover:text-gray-700">
            ← จัดการเนื้อหา
          </Link>
          <h1 className="text-xl font-bold text-gray-800 mt-1">{title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            /{slug} · {blocks.length} บล็อก
            {!customised && <span className="text-gray-400"> · ยังใช้เนื้อหาตั้งต้น</span>}
          </p>
        </div>

        <Link
          href={`/${slug}`}
          target="_blank"
          className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" /> ดูหน้าจริง
        </Link>
        <button
          onClick={() => setPreview((p) => !p)}
          className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {preview ? "ซ่อนตัวอย่าง" : "ดูตัวอย่าง"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 rounded-full bg-[#1A4D2E] px-5 py-2 text-sm font-medium text-white hover:bg-[#143a22] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "กำลังบันทึก…" : saved && !dirty ? "บันทึกแล้ว" : "บันทึก"}
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {dirty && <p className="text-xs text-amber-600">มีการแก้ไขที่ยังไม่ได้บันทึก</p>}

      {/* ตัวอย่าง */}
      {preview && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-medium text-gray-500">ตัวอย่างหน้าจริง</p>
          <div className="rounded-xl bg-white p-4">
            <PageBlocks blocks={blocks} updatedAt={updatedAt ?? new Date().toISOString()} />
          </div>
        </div>
      )}

      {/* รายการบล็อก */}
      <div className="space-y-3">
        {blocks.map((b, i) => (
          <div key={b.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-[#E1F0E5] px-2.5 py-0.5 text-[11px] font-bold text-[#1A4D2E]">
                {BLOCK_LABELS[b.type]}
              </span>
              <span className="text-[11px] text-gray-400">#{i + 1}</span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => moveBlock(b.id, -1)}
                  disabled={i === 0}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="เลื่อนขึ้น"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveBlock(b.id, 1)}
                  disabled={i === blocks.length - 1}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="เลื่อนลง"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeBlock(b.id)}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                  aria-label="ลบบล็อก"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <BlockFields block={b} patch={(p) => patchBlock(b.id, p)} />
          </div>
        ))}
      </div>

      {/* เพิ่มบล็อก */}
      <div className="relative">
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-[#1A4D2E] hover:text-[#1A4D2E]"
        >
          <Plus className="h-4 w-4" /> เพิ่มบล็อก
        </button>
        {adding && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAdding(false)} />
            <div className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-xl">
              {BLOCK_ORDER.map((t) => (
                <button
                  key={t}
                  onClick={() => addBlock(t)}
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-[#f0fdf4]"
                >
                  {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* คืนค่าตั้งต้น */}
      {customised && canReset && (
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> คืนค่าเนื้อหาตั้งต้น
          </button>
        </div>
      )}
    </div>
  )
}
