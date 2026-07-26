#!/usr/bin/env node
/**
 * import_boundaries.js
 * ดาวน์โหลด mapthai (OCHA/RTSD) Thailand ADM1/2/3 แล้ว import เข้า Supabase
 *
 * ต้องการ: node >= 18, NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน .env.local
 * รัน: node scripts/import_boundaries.js
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

function loadEnv() {
  const envPath = join(ROOT, ".env.local")
  if (!existsSync(envPath)) throw new Error(".env.local not found")
  const env = {}
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const [k, ...v] = line.split("=")
    if (k && v.length) env[k.trim()] = v.join("=").trim()
  }
  return env
}

const BASE = "https://raw.githubusercontent.com/piyayut-ch/mapthai/master/data-raw/geojson"
const SOURCES = {
  adm1: `${BASE}/th_adm1.geojson`,
  adm2: `${BASE}/th_adm2.geojson`,
  adm3: `${BASE}/th_adm3.geojson`,
}
const CACHE_DIR = join(ROOT, ".gadm_cache")

async function downloadGeoJSON(url, cacheFile) {
  if (existsSync(cacheFile)) {
    console.log(`  cache hit: ${cacheFile}`)
    return JSON.parse(readFileSync(cacheFile, "utf-8"))
  }
  console.log(`  downloading ${url} ...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const data = await res.json()
  writeFileSync(cacheFile, JSON.stringify(data))
  console.log(`  cached`)
  return data
}

async function importProvinces(supabase, geojson) {
  const features = geojson.features
  console.log(`\n[Province] ${features.length} features`)
  let ok = 0, fail = 0
  for (const f of features) {
    const p = f.properties
    const { error } = await supabase.rpc("insert_province", {
      p_name_th: p.ADM1_TH || p.ADM1_EN,
      p_name_en: p.ADM1_EN,
      p_code: p.ADM1_PCODE || null,
      p_geom_geojson: JSON.stringify(f.geometry),
    })
    if (error) { fail++; if (fail <= 3) console.error(`  ✗ ${p.ADM1_EN}: ${error.message}`) }
    else ok++
    process.stdout.write(`\r  ${ok + fail}/${features.length} (ok=${ok} fail=${fail})`)
  }
  console.log(`\n  done`)
}

async function importDistricts(supabase, geojson) {
  const features = geojson.features
  console.log(`\n[District] ${features.length} features`)

  // PCODE matching: ADM1_PCODE → province id
  const { data: provinces } = await supabase.from("provinces").select("id,code")
  const provMap = {}
  for (const p of provinces || []) if (p.code) provMap[p.code] = p.id

  let ok = 0, fail = 0, noParent = 0
  for (const f of features) {
    const p = f.properties
    const provinceId = provMap[p.ADM1_PCODE] ?? null
    if (!provinceId) noParent++
    const { error } = await supabase.rpc("insert_district", {
      p_province_id: provinceId,
      p_name_th: p.ADM2_TH || p.ADM2_EN,
      p_name_en: p.ADM2_EN,
      p_code: p.ADM2_PCODE || null,
      p_geom_geojson: JSON.stringify(f.geometry),
    })
    if (error) { fail++; if (fail <= 3) console.error(`  ✗ ${p.ADM2_EN}: ${error.message}`) }
    else ok++
    process.stdout.write(`\r  ${ok + fail}/${features.length} (ok=${ok} fail=${fail} noParent=${noParent})`)
  }
  console.log(`\n  done`)
}

async function importSubdistricts(supabase, geojson) {
  const features = geojson.features
  console.log(`\n[Subdistrict] ${features.length} features`)

  // PCODE matching: ADM2_PCODE → district id
  const { data: districts } = await supabase.from("districts").select("id,code")
  const distMap = {}
  for (const d of districts || []) if (d.code) distMap[d.code] = d.id

  let ok = 0, fail = 0, noParent = 0
  for (const f of features) {
    const p = f.properties
    const districtId = distMap[p.ADM2_PCODE] ?? null
    if (!districtId) noParent++
    const { error } = await supabase.rpc("insert_subdistrict", {
      p_district_id: districtId,
      p_name_th: p.ADM3_TH || p.ADM3_EN,
      p_name_en: p.ADM3_EN,
      p_code: p.ADM3_PCODE || null,
      p_geom_geojson: JSON.stringify(f.geometry),
    })
    if (error) { fail++; if (fail <= 3) console.error(`  ✗ ${p.ADM3_EN}: ${error.message}`) }
    else ok++
    process.stdout.write(`\r  ${ok + fail}/${features.length} (ok=${ok} fail=${fail} noParent=${noParent})`)
  }
  console.log(`\n  done`)
}

async function main() {
  const env = loadEnv()
  const url = env["NEXT_PUBLIC_SUPABASE_URL"]
  const key = env["SUPABASE_SERVICE_ROLE_KEY"]
  if (!url || !key) throw new Error("ต้องการ NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local")

  const supabase = createClient(url, key)
  console.log("Supabase connected:", url)
  mkdirSync(CACHE_DIR, { recursive: true })

  // ลบ cache เก่า (GADM) ถ้ายังมีอยู่
  const oldFiles = ["tha_l1.json", "tha_l2.json", "tha_l3.json"]
  for (const f of oldFiles) {
    const p = join(CACHE_DIR, f)
    if (existsSync(p)) { import("fs").then(fs => fs.unlinkSync(p)); console.log(`  removed old cache: ${f}`) }
  }

  const adm1 = await downloadGeoJSON(SOURCES.adm1, join(CACHE_DIR, "mapthai_adm1.json"))
  const adm2 = await downloadGeoJSON(SOURCES.adm2, join(CACHE_DIR, "mapthai_adm2.json"))
  const adm3 = await downloadGeoJSON(SOURCES.adm3, join(CACHE_DIR, "mapthai_adm3.json"))

  await importProvinces(supabase, adm1)
  await importDistricts(supabase, adm2)
  await importSubdistricts(supabase, adm3)

  console.log("\n✓ import complete")
}

main().catch((e) => { console.error(e); process.exit(1) })
