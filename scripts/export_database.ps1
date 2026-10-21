# export_database.ps1 — dump ฐานข้อมูล Supabase ทั้งหมด (roles / schema / data) ตามวิธีของ Supabase
#
#   powershell -ExecutionPolicy Bypass -File scripts\export_database.ps1 -OutDir E:\DOA_Soil\handover\database
#
# ต้องมี: Docker Desktop เปิดอยู่ (Supabase CLI ใช้ pg_dump รุ่นที่ตรงกับฐานข้อมูลผ่าน Docker) และ Node.js (npx)
# Connection string: Supabase Dashboard → Connect → Session pooler (IPv4)
#   postgresql://postgres.<project-ref>:<DB-PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
# สคริปต์ถามรหัสแบบซ่อนตัวอักษร — ไม่บันทึกรหัสลงไฟล์หรือประวัติคำสั่ง
#
# ผลลัพธ์ (มีข้อมูลส่วนบุคคล — ส่งเฉพาะผู้มีสิทธิ์ ผ่านช่องทางที่ปลอดภัย)
#   roles.sql   บทบาท/สิทธิ์ของฐานข้อมูล
#   schema.sql  ตาราง ฟังก์ชัน policy (RLS) ทุก schema ของโปรเจกต์
#   data.sql    ข้อมูลทุกตาราง (COPY) รวมบัญชีผู้ใช้ใน auth — ไม่รวมตัวไฟล์ใน Storage (ใช้ export_storage.mjs)

param(
  [Parameter(Mandatory = $true)][string]$OutDir
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force $OutDir | Out-Null

$secure = Read-Host "วาง connection string (Session pooler)" -AsSecureString
$dbUrl = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if (-not $dbUrl.StartsWith("postgresql://")) { throw "connection string ต้องขึ้นต้นด้วย postgresql://" }

npx --yes supabase@latest db dump --db-url $dbUrl -f (Join-Path $OutDir "roles.sql") --role-only
npx --yes supabase@latest db dump --db-url $dbUrl -f (Join-Path $OutDir "schema.sql")
npx --yes supabase@latest db dump --db-url $dbUrl -f (Join-Path $OutDir "data.sql") --use-copy --data-only

Get-ChildItem $OutDir -Filter *.sql | Select-Object Name, @{n = "MB"; e = { [math]::Round($_.Length / 1MB, 2) } }
Write-Host "เสร็จแล้ว — วิธีกู้คืนดู HANDOVER.md หัวข้อ 'ฐานข้อมูล'"
