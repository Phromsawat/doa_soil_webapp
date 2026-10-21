// export_storage.mjs — ดาวน์โหลดไฟล์ทั้งหมดใน Supabase Storage (ทุก bucket) ลงเครื่อง
// pg_dump / supabase db dump ไม่รวมตัวไฟล์ (มีแค่รายการใน storage.objects) จึงต้องดึงแยก
//
//   node scripts/export_storage.mjs <โฟลเดอร์ปลายทาง>
//
// ต้องมี NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SECRET_KEY ใน .env.local (service role — อ่านได้ทุก bucket)
// ได้ <ปลายทาง>/<bucket>/<path ตามเดิม> + manifest.json (รายการไฟล์ ขนาด ชนิด)
// คืนไฟล์ขึ้นโปรเจกต์ใหม่: สร้าง bucket ชื่อเดิม (ดู migration 026, 034, 041) แล้วอัปโหลดตาม path เดิม

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..")
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
)
const out = process.argv[2]
if (!out) {
  console.error("usage: node scripts/export_storage.mjs <output-folder>")
  process.exit(1)
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function walk(bucket, prefix = "") {
  const files = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    for (const item of data) {
      const p = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null || !item.metadata) files.push(...(await walk(bucket, p))) // โฟลเดอร์
      else files.push({ path: p, size: item.metadata.size, type: item.metadata.mimetype, updated_at: item.updated_at })
    }
    if (data.length < 1000) return files
  }
}

const { data: buckets, error } = await sb.storage.listBuckets()
if (error) throw new Error(error.message)
const manifest = []
for (const b of buckets) {
  const files = await walk(b.id)
  let bytes = 0
  for (const f of files) {
    const { data: blob, error: dlErr } = await sb.storage.from(b.id).download(f.path)
    if (dlErr) { console.error(`  ! ${b.id}/${f.path}: ${dlErr.message}`); continue }
    const dest = path.join(out, b.id, ...f.path.split("/"))
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, Buffer.from(await blob.arrayBuffer()))
    bytes += f.size ?? 0
  }
  manifest.push({ bucket: b.id, public: b.public, file_size_limit: b.file_size_limit, files })
  console.log(`${b.id}${b.public ? " (public)" : ""}: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB`)
}
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ exported_at: new Date().toISOString(), buckets: manifest }, null, 2))
console.log("wrote", path.join(out, "manifest.json"))
