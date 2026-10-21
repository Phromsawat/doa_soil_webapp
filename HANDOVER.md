# DOA Soil Test Kit — คู่มือส่งมอบงาน

เว็บแอปวิเคราะห์ธาตุอาหารในดิน (OM / P / K) และแนะนำการใช้ปุ๋ยตามคำแนะนำของกรมวิชาการเกษตร

- เว็บจริง: https://doa-test-kit.vercel.app
- โค้ด: GitHub `Phromsawat/doa_soil_webapp` branch **`aidin-work`** (ตรงกับเว็บจริง — `main` ยังตามหลังอยู่)

---

## 1. ระบบประกอบด้วย

| ส่วน | ใช้อะไร | หมายเหตุ |
|---|---|---|
| หน้าเว็บ + server | Next.js 16 (App Router, Server Actions, Turbopack) · React 19 · Tailwind CSS 4 | ภาษาไทยทั้งหมด |
| ฐานข้อมูล / ล็อกอิน / ไฟล์ | Supabase — Postgres + PostGIS, Auth, Storage | สิทธิ์คุมด้วย RLS ทุกตาราง |
| โฮสต์ | Vercel (ฟังก์ชันรันที่สิงคโปร์ `sin1` — ตั้งใน `vercel.json`) | deploy ด้วย Vercel CLI |
| ทำนายค่าดินจากรูป | API ของทีม AI บน Azure Container Apps | เรียกจาก server เท่านั้น |
| แผนที่ | Leaflet / react-leaflet · แผนที่ฐาน OSM (ผ่าน `/api/map-tiles`), Google, Esri | |

### ฟีเจอร์หลัก

- **อัปโหลดรูปแผ่นทดสอบ** (`/analyze/upload`) → AI ทำนาย OM/P/K → ไปหน้าคำนวณปุ๋ยต่อ
- **คำนวณปุ๋ย** (`/analyze/form`) — กรอกค่าดินเอง / นำเข้า Excel / ดึงค่าจากจุดตัวอย่างใกล้สุด (≤ 30 กม.) → ธาตุอาหารที่ต้องการ แผนใส่ปุ๋ยตามระยะ ปริมาณปุ๋ยที่เลือก รายงาน PDF
- **แผนที่จุดค่าดิน** (`/map`) — 1 จุดต่อตำบล สีตามระดับ OM/P/K/รวม
- **สมุดบัญชีรอบเพาะปลูก** (`/ledger`) — รายรับรายจ่าย พิมพ์ PDF
- **แอดมิน** (`/admin`) — ผู้ใช้ บทบาท/สิทธิ์ (RBAC) ประวัติการวิเคราะห์ (กรอง + Excel) สมุดบัญชีทุกคน พืช/สูตรปุ๋ย/ตารางคำแนะนำ เนื้อหาหน้าเว็บ ตั้งค่า (โลโก้ แผนที่)

---

## 2. โครงสร้างโฟลเดอร์

```
src/app/                หน้าเว็บ (App Router) — admin/, analyze/, ledger/, map/, api/ ...
src/components/         คอมโพเนนต์ — fertilizer/, report/, admin/, layout/ ...
src/lib/supabase/       Server Actions ทั้งหมด (อ่าน/เขียนฐานข้อมูล ตรวจสิทธิ์)
src/lib/soilModel/      ตัวเรียก API ทำนายภาพ
src/lib/soil/           เกณฑ์ระดับดิน + จุดกลางตำบล (subdistrictCenters.json)
src/lib/fertilizer/     ตรรกะคำนวณปุ๋ย
supabase/migrations/    SQL 001–043 (ตาราง, RLS, ฟังก์ชัน, ข้อมูลอ้างอิง)
scripts/                สคริปต์นำเข้า/ส่งออกข้อมูล (ดูหัวข้อ 7)
public/boundaries/      ขอบเขตจังหวัด/อำเภอ/ตำบล (GeoJSON) + ดัชนีค้นหา/รหัสไปรษณีย์
public/soil-maps/       ภาพแผนที่ดินแบบ raster รุ่นเดิม (ยังเก็บไว้ ไม่ได้แสดงแล้ว)
```

---

## 3. รันบนเครื่อง

ต้องมี Node.js 22 ขึ้นไป

```bash
npm install
cp .env.example .env.local     # แล้วใส่ค่าจริง (หัวข้อ 4)
npm run dev                    # http://localhost:3000
npm run build && npm start     # ทดสอบแบบ production
```

ตรวจโค้ด: `npx tsc --noEmit` และ `npm run lint`
(lint มี error `react-hooks/set-state-in-effect` ที่ค้างมาจากโค้ดเดิมบางไฟล์ ไม่กระทบการทำงาน)

---

## 4. Environment variables

ดูตัวอย่างใน `.env.example` — **ค่าจริงไม่อยู่ใน zip/repo** ขอจากผู้ดูแลระบบผ่านช่องทางส่วนตัว
และต้องตั้งชุดเดียวกันใน Vercel (Project → Settings → Environment Variables → Production)

| ตัวแปร | ใช้ที่ | ความลับ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ทุกที่ | ไม่ลับ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | เบราว์เซอร์ + server (สิทธิ์ตาม RLS) | ไม่ลับ |
| `SUPABASE_SECRET_KEY` | server เท่านั้น — ลบผู้ใช้/รูปของคนอื่นในหน้าแอดมิน, สคริปต์ | **ลับ** (ข้าม RLS) |
| `MODEL_API_URL` | server เท่านั้น | ไม่ลับ |
| `MODEL_API_KEY` | server เท่านั้น | **ลับ** — เป็น key ร่วมกับทีม AI |

แนะนำให้เปลี่ยน (rotate) `SUPABASE_SECRET_KEY` และขอ `MODEL_API_KEY` แยกสำหรับเว็บ หลังส่งมอบเสร็จ

---

## 5. ฐานข้อมูล (Supabase)

### 5.1 กู้คืนจากไฟล์ dump (วิธีที่แนะนำ — ได้ครบเหมือนระบบจริง)

ไฟล์ dump สร้างด้วย `scripts/export_database.ps1` (Supabase CLI) ได้ 3 ไฟล์ `roles.sql`, `schema.sql`, `data.sql`
กู้คืนเข้าโปรเจกต์ Supabase ใหม่ (หรือ Postgres ที่มี PostGIS) ตามวิธีของ Supabase:

```bash
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "postgresql://postgres.<new-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

`data.sql` มีบัญชีผู้ใช้ (auth) และข้อมูลส่วนบุคคล — ดูหัวข้อ 8

### 5.2 สร้างใหม่จาก migrations (ได้โครงสร้าง + ข้อมูลอ้างอิงส่วนใหญ่ ไม่มีข้อมูลผู้ใช้)

รัน `supabase/migrations/*.sql` ตามลำดับเลข 001 → 043 ใน SQL Editor
ข้อมูลบางชุดนำเข้าด้วยสคริปต์ ไม่ได้อยู่ใน migration:

- ขอบเขตจังหวัด/อำเภอ/ตำบลในฐานข้อมูล — `scripts/import_boundaries.js`
- ค่าดินแบบ grid (`soil_grid`, รุ่นเดิม) — `scripts/extract_soil_grid.py`

หมายเหตุ: วัตถุบางอย่างช่วงแรกสร้างจาก dashboard แล้วค่อยย้ายเข้า migration ทีหลัง (เช่น bucket `soil-images` → 034)
ถ้าต้องการให้เหมือนระบบจริงทุกอย่าง ใช้วิธี 5.1

### 5.3 ไฟล์ใน Storage

dump ฐานข้อมูลไม่รวมตัวไฟล์ — ส่งออกด้วย `node scripts/export_storage.mjs <โฟลเดอร์>` (ได้ไฟล์ตาม path เดิม + `manifest.json`)

| bucket | สาธารณะ | เก็บอะไร | policy |
|---|---|---|---|
| `soil-images` | ไม่ (private) | รูปแผ่นทดสอบของผู้ใช้ `{user_id}/{analysis_id}/...` ≤ 12 MiB | 034, 041 |
| `page-images` | ใช่ | รูปเนื้อหาหน้าเว็บ, โลโก้ (`site/`), รูปพืช (`crops/`) | 026, 039 |

กู้คืน: สร้าง bucket ชื่อและการตั้งค่าเดิม (migration ข้างบนสร้างให้) แล้วอัปโหลดไฟล์กลับตาม path เดิม
ลิงก์รูปแผ่นทดสอบในตาราง `analysis_images.public_url` เป็น signed URL ของโปรเจกต์เดิม — ถ้าย้ายโปรเจกต์ต้องสร้างลิงก์ใหม่

### 5.4 แอดมินคนแรก

สมัครสมาชิกผ่านหน้าเว็บ แล้วรันใน SQL Editor:

```sql
update public.profiles set role = 'admin' where email = '<อีเมล>';
```

### 5.5 ตารางสำคัญ

| ตาราง | เก็บอะไร |
|---|---|
| `profiles` | ข้อมูลผู้ใช้ + บทบาท (`role`) — ผูกกับ `auth.users` |
| `roles`, `role_permissions` | บทบาทและสิทธิ์รายเมนู (RBAC) — ใช้ใน `has_permission()` |
| `analyses`, `analysis_images`, `analysis_results` | ผลวิเคราะห์ รูป ผลคำนวณ — `ai_result` = ค่าที่ AI ทำนาย |
| `crop_types`, `crops`, `fertilizer_recommendations`, `crop_fertilizer_plan`, `fertilizer_formulas` | ข้อมูลพืชและคำแนะนำปุ๋ยของกรมฯ |
| `soil_samples` + ฟังก์ชัน `get_soil_point_stats()` | ตัวอย่างดินระบบเก่า + ค่ารวมรายตำบล (รวมรายการ AI ใหม่อัตโนมัติ) |
| `farm_seasons`, `farm_entries`, `farm_categories` | สมุดบัญชี |
| `page_contents`, `app_settings` | เนื้อหาหน้าเว็บ, การตั้งค่า (โลโก้ ฯลฯ) |
| `provinces`, `districts`, `subdistricts` | ขอบเขตการปกครอง (PostGIS) |

---

## 6. Deploy (Vercel)

```bash
npm i -g vercel
vercel link           # เลือกโปรเจกต์ doa-test-kit
vercel --prod --yes   # build + deploy production
```

- region ฟังก์ชัน `sin1` ตั้งใน `vercel.json` (ใกล้ Supabase และ API ทำนายภาพ — เร็วกว่า US ราว 4 เท่า)
- หน้า `/analyze/upload` ตั้ง `maxDuration = 300` วินาที (API ทำนายอาจเปิดเครื่องช้าตอนเรียกครั้งแรก)
- ทุก migration ใหม่ต้องรันในฐานข้อมูล**ก่อน** deploy โค้ดที่ใช้

---

## 7. สคริปต์ (`scripts/`)

| สคริปต์ | ทำอะไร |
|---|---|
| `build_soil_points.py` | ทำความสะอาด predict log ระบบเก่า → `043_soil_samples_data.sql` + `src/lib/soil/subdistrictCenters.json` |
| `export_database.ps1` | dump ฐานข้อมูลทั้งหมด (roles/schema/data) |
| `export_storage.mjs` | ดาวน์โหลดไฟล์ทุก bucket |
| `import_boundaries.js` | นำเข้าขอบเขตการปกครองเข้าฐานข้อมูล |
| `extract_soil_grid.py` | สร้าง raster/grid ค่าดินรุ่นเดิม |
| `import_fertilizer_plan*.py`, `import_orchard_excel.py`, `extract_fruit_fertilizer.py` | นำเข้าตารางคำแนะนำปุ๋ยจาก Excel ของกรมฯ |
| `add_zip_to_search_index.py` | เพิ่มรหัสไปรษณีย์ในดัชนีค้นหาตำบล |

สคริปต์ Python ใช้ openpyxl, pandas, shapely (และ rasterio/numpy สำหรับ `extract_soil_grid.py`) — รันด้วย Python 3.11+

---

## 8. ความปลอดภัยและข้อมูลส่วนบุคคล

- ทุกตารางเปิด RLS — ผู้ใช้เห็นเฉพาะข้อมูลของตัวเอง แอดมิน/บทบาทตามสิทธิ์ใน `role_permissions`
- Server Actions ทุกตัวในหน้าแอดมินตรวจสิทธิ์ด้วย `requirePermission()` ซ้ำอีกชั้น
- ฟังก์ชัน `security definer` (ข้าม RLS) ต้องคืนเฉพาะข้อมูลที่เปิดได้ และ `revoke execute ... from public` เมื่อเขียนข้อมูล (ดู 038)
- ฐานข้อมูลและ Storage มี **ข้อมูลส่วนบุคคล** (อีเมล ชื่อ เบอร์โทร พิกัดแปลง รูป สมุดบัญชี) —
  ส่งต่อเฉพาะผู้มีสิทธิ์ ผ่านช่องทางที่ปลอดภัย (เช่นไฟล์บีบอัดแบบใส่รหัส) ตาม PDPA และนโยบายความเป็นส่วนตัวในเว็บ
- ห้าม commit `.env.local` หรือ key ใด ๆ

---

## 9. ข้อควรรู้ / งานที่ค้าง

- **แผนที่ดินรุ่นเดิม (raster)** — `soil_grid`, `public/soil-maps/`, `getSoilAtPoint()` ยังเก็บไว้แต่ไม่ได้แสดงแล้ว ลบได้เมื่อไม่ต้องการ
- **จุดค่าดิน** — ข้อมูลระบบเก่าไม่มีพิกัด จุดวางที่กลางตำบล; รายการ "วิเคราะห์ด้วย AI" ที่มีตำบลจะถูกนับรวมทันที (ใช้ค่าที่ AI ทำนาย)
- **รูปต้นฉบับค้าง** — ถ้าผู้ใช้อัปโหลดแล้วออกไปตอนรูปไม่ผ่านการตรวจ ต้นฉบับใน `soil-images/.../original/` จะค้าง ควรมีงานล้างเป็นระยะ
- **รหัสตัวอย่าง/เบอร์โทร** เก็บรวมใน `analyses.notes` ยังไม่มีคอลัมน์แยก
- **API ทำนายภาพ** อยู่ใน Azure for Students ของทีม AI — ระยะยาวควรย้ายไปบัญชีของหน่วยงาน
- `service_role` ไม่มีสิทธิ์อ่านตารางรุ่นแรกบางตาราง (เช่น `analyses`) — งานฝั่งแอดมินใช้ client ของผู้ใช้ + RLS เป็นหลัก
