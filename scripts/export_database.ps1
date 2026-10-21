# export_database.ps1 — dump ฐานข้อมูล Supabase เป็นไฟล์ SQL สำหรับส่งมอบ
#
#   ค่าตั้งต้น (แนะนำ) — ไม่มีข้อมูลผู้ใช้:
#     powershell -ExecutionPolicy Bypass -File scripts\export_database.ps1 -OutDir E:\handover\database
#   รวมข้อมูลผู้ใช้ทั้งหมด (มีข้อมูลส่วนบุคคล — ใช้เมื่อได้รับอนุมัติเท่านั้น):
#     powershell -ExecutionPolicy Bypass -File scripts\export_database.ps1 -OutDir E:\handover\database -WithUserData
#
# ต้องมี: Docker Desktop เปิดอยู่ (ใช้ pg_dump รุ่นที่รองรับฐานข้อมูลผ่าน Docker) และ Node.js (npx)
# Connection string: Supabase Dashboard → Connect → Session pooler (IPv4)
#   postgresql://postgres.<project-ref>:<DB-PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
# สคริปต์ถามแบบซ่อนตัวอักษร — ไม่บันทึกรหัสลงไฟล์หรือประวัติคำสั่ง
#
# ผลลัพธ์
#   roles.sql            บทบาท/สิทธิ์ของฐานข้อมูล
#   schema.sql           โครงสร้างทุกตาราง ฟังก์ชัน policy (RLS) — ไม่มีข้อมูล
#   data_reference.sql   (ค่าตั้งต้น) ข้อมูลเฉพาะตารางในรายการ $ReferenceTables ด้านล่าง
#                        ไม่มีบัญชีผู้ใช้ ผลวิเคราะห์ รูป หรือสมุดบัญชี
#   data_full.sql        (-WithUserData) ข้อมูลทุกตาราง รวมบัญชีผู้ใช้ใน auth
# ตัวไฟล์ใน Storage ไม่อยู่ใน dump — ใช้ scripts/export_storage.mjs

param(
  [Parameter(Mandatory = $true)][string]$OutDir,
  [switch]$WithUserData
)

$ErrorActionPreference = "Stop"

# ตารางที่ส่งข้อมูลได้ (ไม่มีข้อมูลส่วนบุคคล) — ใช้รายการที่อนุญาต ไม่ใช่รายการที่ห้าม
# ตารางที่ไม่อยู่ในนี้ส่งแค่โครงสร้าง: profiles, analyses, analysis_images, analysis_results,
# farm_seasons, farm_entries, farm_categories และทุกอย่างใน auth / storage.objects
$ReferenceTables = @(
  "public.app_settings",
  "public.crop_types", "public.crops", "public.crop_stage_split",
  "public.crop_fertilizer_plan", "public.fertilizer_recommendations",
  "public.fertilizer_formulas", "public.fertilizer_applications", "public.nutrients",
  "public.page_contents",
  "public.roles", "public.role_permissions",
  "public.provinces", "public.districts", "public.subdistricts",
  "public.soil_grid", "public.soil_samples",
  "storage.buckets"
)

New-Item -ItemType Directory -Force $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

$secure = Read-Host "วาง connection string (Session pooler)" -AsSecureString
$dbUrl = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if (-not $dbUrl.StartsWith("postgresql://")) { throw "connection string ต้องขึ้นต้นด้วย postgresql://" }

npx --yes supabase@latest db dump --db-url $dbUrl -f (Join-Path $OutDir "roles.sql") --role-only
npx --yes supabase@latest db dump --db-url $dbUrl -f (Join-Path $OutDir "schema.sql")

if ($WithUserData) {
  npx --yes supabase@latest db dump --db-url $dbUrl -f (Join-Path $OutDir "data_full.sql") --use-copy --data-only
} else {
  # pg_dump 17 อ่านฐานข้อมูล Postgres 15/17 ได้ — เขียนไฟล์ผ่าน volume (ไม่ใช้ > ของ PowerShell ที่เปลี่ยน encoding)
  $tableArgs = $ReferenceTables | ForEach-Object { "--table=$_" }
  docker run --rm -v "${OutDir}:/out" postgres:17-alpine `
    pg_dump "--dbname=$dbUrl" --data-only --no-owner --no-privileges @tableArgs --file=/out/data_reference.sql
  if ($LASTEXITCODE -ne 0) { throw "pg_dump ไม่สำเร็จ (exit $LASTEXITCODE)" }
}

Get-ChildItem $OutDir -Filter *.sql | Select-Object Name, @{n = "MB"; e = { [math]::Round($_.Length / 1MB, 2) } }
Write-Host "เสร็จแล้ว — วิธีกู้คืนดู HANDOVER.md หัวข้อ 'ฐานข้อมูล'"
