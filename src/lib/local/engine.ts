import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import type { QuerySpec, QueryResult } from "./query"

// engine.ts — รัน QuerySpec กับฐานข้อมูล JSON ในเครื่อง (local mode)
//   local-db/seed.json  : ข้อมูลตั้งต้นจาก migration (สร้างด้วย scripts/build_local_db.mjs)
//   local-db/db.json    : สถานะปัจจุบัน (สร้างจาก seed ครั้งแรก แล้วเขียนทับทุกครั้งที่มีการแก้ไข)

type Row = Record<string, unknown>
type DB = Record<string, Row[]>

const DIR = path.join(process.cwd(), "local-db")
const SEED = path.join(DIR, "seed.json")
const FILE = path.join(DIR, "db.json")

const g = globalThis as { __localDb?: DB }

function load(): DB {
  if (g.__localDb) return g.__localDb
  const src = fs.existsSync(FILE) ? FILE : SEED
  if (!fs.existsSync(src)) {
    throw new Error("local mode: ไม่พบ local-db/seed.json — รัน `node scripts/build_local_db.mjs` ก่อน")
  }
  g.__localDb = JSON.parse(fs.readFileSync(src, "utf8")) as DB
  return g.__localDb
}

function persist() {
  fs.writeFileSync(FILE, JSON.stringify(g.__localDb))
}

// ---------------------------------------------------------------- relations
// ชื่อ singular ของตาราง -> ใช้หา foreign key ชื่อ `${singular}_id`
const SINGULAR: Record<string, string> = {
  crop_types: "crop_type",
  crops: "crop",
  analyses: "analysis",
  analysis_images: "analysis_image",
  analysis_results: "analysis_result",
  fertilizer_recommendations: "recommendation",
  profiles: "profile",
}

interface Sel {
  cols: string[] // "*" หรือชื่อคอลัมน์
  embeds: { table: string; sel: Sel }[]
}

// แยก select list ระดับบนสุด เช่น "id, name, crop_types(name, x(y))"
function parseSelect(s: string | null): Sel {
  const src = (s ?? "*").replace(/\s+/g, "")
  const parts: string[] = []
  let depth = 0
  let cur = ""
  for (const ch of src) {
    if (ch === "(") depth++
    if (ch === ")") depth--
    if (ch === "," && depth === 0) {
      parts.push(cur)
      cur = ""
    } else cur += ch
  }
  if (cur) parts.push(cur)

  const sel: Sel = { cols: [], embeds: [] }
  for (const p of parts) {
    const m = p.match(/^([a-z_]+)\((.*)\)$/)
    if (m) sel.embeds.push({ table: m[1], sel: parseSelect(m[2]) })
    else sel.cols.push(p)
  }
  return sel
}

function project(db: DB, table: string, row: Row, sel: Sel): Row {
  const out: Row = {}
  if (sel.cols.includes("*") || sel.cols.length === 0) Object.assign(out, row)
  else for (const c of sel.cols) out[c] = row[c] ?? null

  for (const e of sel.embeds) {
    const fk = `${SINGULAR[e.table] ?? e.table}_id`
    const target = db[e.table] ?? []
    if (fk in row) {
      // many-to-one -> object
      const hit = target.find((r) => r.id === row[fk])
      out[e.table] = hit ? project(db, e.table, hit, e.sel) : null
    } else {
      // one-to-many -> array (ลูกมีคอลัมน์ `${parent}_id`)
      const back = `${SINGULAR[table] ?? table}_id`
      out[e.table] = target.filter((r) => r[back] === row.id).map((r) => project(db, e.table, r, e.sel))
    }
  }
  return out
}

// ---------------------------------------------------------------- filters
function like(v: unknown, pattern: unknown): boolean {
  if (v == null) return false
  const re = new RegExp(
    "^" + String(pattern).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$",
    "i"
  )
  return re.test(String(v))
}

function cmp(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), "th")
}

function test(row: Row, op: string, col: string, val: unknown): boolean {
  const v = row[col]
  switch (op) {
    case "eq": return v === val || (v != null && val != null && String(v) === String(val))
    case "neq": return !(v === val || String(v) === String(val))
    case "in": return (val as unknown[]).some((x) => x === v || String(x) === String(v))
    case "gt": return cmp(v, val) > 0
    case "gte": return cmp(v, val) >= 0
    case "lt": return cmp(v, val) < 0
    case "lte": return cmp(v, val) <= 0
    case "ilike": return like(v, val)
    case "is": return val === null ? v == null : v === val
    default: return true
  }
}

// "notes.ilike.%x%,province.ilike.%x%"
function testOr(row: Row, expr: string): boolean {
  return expr.split(",").some((part) => {
    const [col, op, ...rest] = part.split(".")
    return test(row, op, col, rest.join("."))
  })
}

// ---------------------------------------------------------------- execute
export async function executeLocal(spec: QuerySpec): Promise<QueryResult> {
  try {
    const db = load()
    const table = (db[spec.table] ??= [])
    const match = (r: Row) =>
      spec.filters.every((f) => test(r, f.op, f.col, f.val)) && spec.ors.every((o) => testOr(r, o))
    const sel = parseSelect(spec.columns)
    const now = new Date().toISOString()

    let rows: Row[]
    switch (spec.action) {
      case "select":
        rows = table.filter(match)
        break
      case "insert": {
        const list = (Array.isArray(spec.values) ? spec.values : [spec.values]) as Row[]
        rows = list.map((v) => ({
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
          ...(spec.table === "analyses" ? { status: "pending" } : {}),
          ...v,
        }))
        table.push(...rows)
        persist()
        break
      }
      case "update": {
        rows = table.filter(match)
        for (const r of rows) Object.assign(r, spec.values as Row, { updated_at: now })
        persist()
        break
      }
      case "upsert": {
        const keys = (spec.onConflict ?? (spec.table === "app_settings" ? "key" : "id")).split(",").map((s) => s.trim())
        const list = (Array.isArray(spec.values) ? spec.values : [spec.values]) as Row[]
        rows = list.map((v) => {
          const hit = table.find((r) => keys.every((k) => r[k] === v[k]))
          if (hit) return Object.assign(hit, v, { updated_at: now })
          const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...v }
          table.push(row)
          return row
        })
        persist()
        break
      }
      case "delete": {
        rows = table.filter(match)
        db[spec.table] = table.filter((r) => !match(r))
        // cascade แบบง่าย: ลบลูกที่อ้าง id นี้
        const fk = `${SINGULAR[spec.table] ?? spec.table}_id`
        const ids = new Set(rows.map((r) => r.id))
        for (const t of Object.keys(db)) {
          if (db[t].length && fk in db[t][0]) db[t] = db[t].filter((r) => !ids.has(r[fk]))
        }
        persist()
        break
      }
    }

    // เรียง / ตัดช่วง (เฉพาะ select)
    if (spec.action === "select") {
      for (const o of [...spec.order].reverse()) {
        rows = [...rows].sort((a, b) => (o.asc ? 1 : -1) * cmp(a[o.col], b[o.col]))
      }
    }
    const count = spec.count ? rows.length : null
    if (spec.range) rows = rows.slice(spec.range[0], spec.range[1] + 1)
    if (spec.limit != null) rows = rows.slice(0, spec.limit)

    if (spec.head) return { data: null, error: null, count }
    // insert/update/delete ที่ไม่ได้ขอ returning -> data = null
    if (spec.action !== "select" && spec.columns == null) return { data: null, error: null, count }

    const data = rows.map((r) => project(db, spec.table, r, sel))
    if (spec.single) {
      if (data.length === 0) {
        return spec.single === "maybe"
          ? { data: null, error: null, count }
          : { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" }, count }
      }
      return { data: data[0], error: null, count }
    }
    return { data, error: null, count }
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) }, count: null }
  }
}
