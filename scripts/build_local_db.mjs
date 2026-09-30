// build_local_db.mjs — สร้าง local-db/seed.json จากไฟล์ migration SQL
// ใช้กับ "local mode" (รันโดยไม่มี Supabase key) — ดู src/lib/local/
//
//   node scripts/build_local_db.mjs
//
// อ่านเฉพาะข้อมูลที่แอปใช้: crop_types, crops, fertilizer_recommendations,
// fertilizer_formulas, crop_fertilizer_plan, soil_grid

import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..")
const MIG = path.join(ROOT, "supabase", "migrations")
const OUT_DIR = path.join(ROOT, "local-db")
const read = (f) => fs.readFileSync(path.join(MIG, f), "utf8")
const uuid = () => crypto.randomUUID()
const now = new Date().toISOString()

// ---------------------------------------------------------------- crop_types
const cropTypes = [
  ["ไม้ผล", "Fruit tree", "per_tree", 1],
  ["พืชไร่", "Field crop", "per_rai", 2],
  ["พืชผัก", "Vegetable", "per_rai", 3],
  ["ข้าว", "Rice", "per_rai", 4],
].map(([name, name_en, unit_basis, order_by]) => ({
  id: uuid(), name, name_en, unit_basis, order_by, is_active: true, created_at: now,
}))
const typeByName = new Map(cropTypes.map((t) => [t.name, t]))

// ---------------------------------------------------------------- crops (002)
const sql002 = read("002_import_orchard.sql")
const crops = []
const cropKey = (name, type) => `${name}|${type}`
const cropByKey = new Map()
for (const m of sql002.matchAll(/INSERT INTO public\.crops \(name, crop_type_id\) SELECT '([^']+)', id FROM public\.crop_types WHERE name = '([^']+)'/g)) {
  const [, name, type] = m
  const t = typeByName.get(type)
  if (!t || cropByKey.has(cropKey(name, type))) continue
  const c = {
    id: uuid(), name, name_en: null, crop_type_id: t.id, description: null,
    image_url: null, is_active: true, created_at: now, updated_at: now,
  }
  crops.push(c)
  cropByKey.set(cropKey(name, type), c)
}

// ---------------------------------------------------------------- recommendations (002)
const num = (s) => (s === "NULL" ? null : Number(s))
const recommendations = []
for (const m of sql002.matchAll(/INSERT INTO public\.fertilizer_recommendations \([^)]*\) SELECT c\.id, '([^']+)', ([^;]+?), '([^']+)' FROM public\.crops c JOIN public\.crop_types ct ON c\.crop_type_id = ct\.id WHERE c\.name = '([^']+)' AND ct\.name = '([^']+)'/g)) {
  const [, mode, nums, unit, name, type] = m
  const c = cropByKey.get(cropKey(name, type))
  if (!c) continue
  const v = nums.split(",").map((s) => num(s.trim()))
  recommendations.push({
    id: uuid(), crop_id: c.id, mode,
    om_min: v[0], om_max: v[1], p_min: v[2], p_max: v[3], k_min: v[4], k_max: v[5],
    target_n: v[6], target_p2o5: v[7], target_k2o: v[8], target_unit: unit,
    notes: null, created_at: now, updated_at: now,
  })
}

// ---------------------------------------------------------------- formulas (005)
const sql005 = read("005_fertilizer_formulas.sql")
const formulas = []
for (const m of sql005.matchAll(/\(\s*'([^']+)',\s*'([^']+)',\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*'(\w+)',\s*(\d+)\)/g)) {
  const [, name, grade, n, p, k, kind, sort] = m
  formulas.push({
    id: uuid(), name, grade, n_percent: +n, p2o5_percent: +p, k2o_percent: +k,
    kind, is_active: true, sort_order: +sort, notes: null, created_at: now, updated_at: now,
  })
}
// ปุ๋ยอินทรีย์ (014) — ค่าเฉลี่ยอ้างอิง ปรับได้ในหน้า admin
const sql014 = fs.existsSync(path.join(MIG, "014_report_organic_accuracy.sql")) ? read("014_report_organic_accuracy.sql") : ""
for (const m of sql014.matchAll(/\(\s*'([^']+)',\s*(NULL|'[^']*'),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*'(organic)',\s*(\d+),\s*'([^']*)'\)/g)) {
  const [, name, grade, n, p, k, kind, sort, notes] = m
  formulas.push({
    id: uuid(), name, grade: grade === "NULL" ? null : grade.slice(1, -1),
    n_percent: +n, p2o5_percent: +p, k2o_percent: +k,
    kind, is_active: true, sort_order: +sort, notes, created_at: now, updated_at: now,
  })
}

// ---------------------------------------------------------------- plan (008, 009)
const plan = []
const cropByName = new Map(crops.map((c) => [c.name, c]))
for (const f of ["008_import_fertilizer_plan.sql", "009_import_fertilizer_plan_70.sql"]) {
  const sql = read(f)
  const re = /^\('([^']+)', '(\w+)', ([^']+?), '([^']+)', (\d+), '([^']+)', ([\d.]+)(?:::numeric)?, '([^']+)'\)/gm
  for (const m of sql.matchAll(re)) {
    const [, cropName, use_type, nums, stage, stage_order, grade, amount, unit] = m
    const c = cropByName.get(cropName)
    if (!c) continue
    const v = nums.split(",").map((s) => num(s.trim().replace("::numeric", "")))
    plan.push({
      id: uuid(), crop_id: c.id, use_type,
      om_min: v[0], om_max: v[1], p_min: v[2], p_max: v[3], k_min: v[4], k_max: v[5],
      stage, stage_order: +stage_order, grade, amount: +amount, unit, created_at: now,
    })
  }
}

// ---------------------------------------------------------------- soil_grid (003)
const soilGrid = []
for (const m of read("003_soil_grid.sql").matchAll(/^\((\d+),(\d+),([\d.]+|NULL),([\d.]+|NULL),([\d.]+|NULL)\)/gm)) {
  soilGrid.push({ grid_row: +m[1], grid_col: +m[2], om: num(m[3]), p: num(m[4]), k: num(m[5]) })
}

// ---------------------------------------------------------------- local admin user
const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001"
const profiles = [{
  id: LOCAL_USER_ID, phone: null, email: "admin@local.test", full_name: "ผู้ดูแลระบบ (local)",
  nickname: "admin", role: "admin", avatar_url: null, created_at: now, updated_at: now,
}]

const db = {
  crop_types: cropTypes,
  crops,
  nutrients: [
    { code: "OM", name_th: "อินทรียวัตถุ", name_en: "Organic Matter", unit: "%", order_by: 1 },
    { code: "P", name_th: "ฟอสฟอรัส", name_en: "Phosphorus", unit: "mg/kg", order_by: 2 },
    { code: "K", name_th: "โพแทสเซียม", name_en: "Potassium", unit: "mg/kg", order_by: 3 },
  ],
  fertilizer_recommendations: recommendations,
  fertilizer_applications: [],
  fertilizer_formulas: formulas,
  crop_fertilizer_plan: plan,
  soil_grid: soilGrid,
  profiles,
  analyses: [],
  analysis_images: [],
  analysis_results: [],
  app_settings: [{ key: "show_soil_map", value: true }],
}

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, "seed.json"), JSON.stringify(db))
console.log(
  Object.entries(db).map(([k, v]) => `${k}: ${v.length}`).join("\n")
)
