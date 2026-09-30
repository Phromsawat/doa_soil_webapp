#!/usr/bin/env node
/**
 * import_boundaries.js
 * ดาวน์โหลด GADM 4.1 Thailand (Province + District) แล้ว import เข้า Supabase
 *
 * ต้องการ:
 *   node >= 18  (fetch built-in)
 *   NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local
 *
 * รัน:
 *   node scripts/import_boundaries.js
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "fs"
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

// โหลด env จาก .env.local
function loadEnv() {
  const envPath = join(ROOT, ".env.local")
  if (!existsSync(envPath)) throw new Error(".env.local not found")
  const lines = readFileSync(envPath, "utf-8").split("\n")
  const env = {}
  for (const line of lines) {
    const [k, ...v] = line.split("=")
    if (k && v.length) env[k.trim()] = v.join("=").trim()
  }
  return env
}

const GADM_BASE = "https://geodata.ucdavis.edu/gadm/gadm4.1/json"
const LEVEL1_URL = `${GADM_BASE}/gadm41_THA_1.json`
const LEVEL2_URL = `${GADM_BASE}/gadm41_THA_2.json`
const LEVEL3_URL = `${GADM_BASE}/gadm41_THA_3.json`
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
  console.log(`  saved to cache`)
  return data
}

// GADM name fields: NAME_1 = EN province, NL_NAME_1 = TH province
function extractName(props, enKey, thKey) {
  return {
    name_en: (props[enKey] || "").trim(),
    name_th: (props[thKey] || props[enKey] || "").trim(),
  }
}

async function importProvinces(supabase, geojson) {
  console.log(`\n[Province] ${geojson.features.length} features`)
  const rows = geojson.features.map((f) => {
    const p = f.properties
    const { name_en, name_th } = extractName(p, "NAME_1", "NL_NAME_1")
    return {
      name_en,
      name_th: name_th || name_en,
      code: p.HASC_1 || null,
      geom: `SRID=4326;${JSON.stringify(f.geometry)}`, // GeoJSON → WKT via PostGIS cast
    }
  })

  // Supabase REST ไม่รับ geometry โดยตรง — ใช้ RPC แทน
  // insert ทีละ batch ผ่าน raw SQL via rpc
  let inserted = 0
  for (const row of rows) {
    const { error } = await supabase.rpc("insert_province", {
      p_name_th: row.name_th,
      p_name_en: row.name_en,
      p_code: row.code,
      p_geom_geojson: JSON.stringify(geojson.features[rows.indexOf(row)].geometry),
    })
    if (error) {
      console.error(`  ✗ ${row.name_en}: ${error.message}`)
    } else {
      inserted++
      process.stdout.write(`\r  ${inserted}/${rows.length} provinces inserted`)
    }
  }
  console.log(`\n  done`)
}

async function importDistricts(supabase, geojson) {
  console.log(`\n[District] ${geojson.features.length} features`)

  // โหลด province map ก่อน
  const { data: provinces } = await supabase.from("provinces").select("id,name_en")
  const provMap = {}
  for (const p of provinces || []) provMap[p.name_en.toLowerCase()] = p.id

  let inserted = 0
  let skipped = 0
  for (const f of geojson.features) {
    const p = f.properties
    const { name_en: distName, name_th: distNameTh } = extractName(p, "NAME_2", "NL_NAME_2")
    const provNameEn = (p.NAME_1 || "").toLowerCase()
    const provinceId = provMap[provNameEn] ?? null

    const { error } = await supabase.rpc("insert_district", {
      p_province_id: provinceId,
      p_name_th: distNameTh || distName,
      p_name_en: distName,
      p_code: p.HASC_2 || null,
      p_geom_geojson: JSON.stringify(f.geometry),
    })
    if (error) {
      skipped++
    } else {
      inserted++
    }
    process.stdout.write(`\r  ${inserted + skipped}/${geojson.features.length} (ok=${inserted} skip=${skipped})`)
  }
  console.log(`\n  done`)
}

async function importSubdistricts(supabase, geojson) {
  console.log(`\n[Subdistrict] ${geojson.features.length} features`)

  // โหลด district map ก่อน (key = name_en ของ district + province)
  const { data: districts } = await supabase.from("districts").select("id,name_en,province_id")
  const distMap = {}
  for (const d of districts || []) distMap[d.name_en.toLowerCase()] = d.id

  let inserted = 0
  let skipped = 0
  for (const f of geojson.features) {
    const p = f.properties
    const { name_en: subName, name_th: subNameTh } = extractName(p, "NAME_3", "NL_NAME_3")
    const distNameEn = (p.NAME_2 || "").toLowerCase()
    const districtId = distMap[distNameEn] ?? null

    const { error } = await supabase.rpc("insert_subdistrict", {
      p_district_id: districtId,
      p_name_th: subNameTh || subName,
      p_name_en: subName,
      p_code: p.HASC_3 || null,
      p_geom_geojson: JSON.stringify(f.geometry),
    })
    if (error) {
      skipped++
    } else {
      inserted++
    }
    process.stdout.write(`\r  ${inserted + skipped}/${geojson.features.length} (ok=${inserted} skip=${skipped})`)
  }
  console.log(`\n  done`)
}

async function main() {
  const env = loadEnv()
  const url = env["NEXT_PUBLIC_SUPABASE_URL"]
  const key = env["SUPABASE_SERVICE_ROLE_KEY"]
  if (!url || !key) {
    throw new Error("ต้องการ NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local")
  }

  const supabase = createClient(url, key)
  console.log("Supabase connected:", url)

  // สร้าง cache dir
  import("fs").then((fs) => fs.mkdirSync(CACHE_DIR, { recursive: true }))

  const level1 = await downloadGeoJSON(LEVEL1_URL, join(ROOT, ".gadm_cache", "tha_l1.json"))
  const level2 = await downloadGeoJSON(LEVEL2_URL, join(ROOT, ".gadm_cache", "tha_l2.json"))
  const level3 = await downloadGeoJSON(LEVEL3_URL, join(ROOT, ".gadm_cache", "tha_l3.json"))

  await importProvinces(supabase, level1)
  await importDistricts(supabase, level2)
  await importSubdistricts(supabase, level3)

  console.log("\n✓ import complete")
}

main().catch((e) => { console.error(e); process.exit(1) })
