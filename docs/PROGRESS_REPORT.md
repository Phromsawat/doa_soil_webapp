# 📋 รายงานความคืบหน้า — DOA Soil Test Kit Web App

**ผู้จัดทำ:** iidinz
**Branch:** `aidin-work`
**Preview URL:** https://doa-test-kit.vercel.app

---

## 1. สรุปภาพรวม

โปรเจกต์ปรับปรุงเว็บแอปพลิเคชัน DOA Soil Test Kit จากระบบเก่า (PHP + MariaDB + FastAPI) เป็น **stack ใหม่** ที่ทันสมัยและดูแลง่ายขึ้น:

| | ระบบเก่า | ระบบใหม่ |
|---|---------|---------|
| **Frontend** | PHP + HTML/CSS/JS | Next.js 16 (React 19 + TypeScript + Tailwind v4) |
| **Database** | MariaDB 10.6 | PostgreSQL (Supabase) |
| **Auth** | PHP session + custom | Supabase Auth (built-in) |
| **Storage** | Volume ใน Docker | Supabase Storage (S3-compatible) |
| **Backend** | FastAPI แยก container | Next.js Server Actions (รวมกับ frontend) |
| **AI Service** | FastAPI + PyTorch + MLFlow | **ยังคงเดิม** — รอเชื่อม endpoint |
| **Hosting** | Self-host Digital Ocean | Vercel (frontend) + Supabase Cloud |

---

## 2. งานที่ทำแล้ว (เรียงตามเฟส)

### ✅ Phase 1 — Database Schema + RLS
- ออกแบบและสร้าง **9 ตารางหลัก** ใน Supabase PostgreSQL
- ตั้ง **Row-Level Security (RLS)** policies — user เห็นแค่ข้อมูลตัวเอง, admin เห็นทั้งหมด
- Auto-create profile เมื่อมี user ใหม่ (trigger)
- Auto-update `updated_at` timestamp
- Seed ข้อมูล lookup tables (crop_types, nutrients)
- **ไฟล์:** `supabase/migrations/001_initial_schema.sql`

### ✅ Phase 2 — Authentication
- **Supabase Auth** setup (browser + server + middleware)
- **Anonymous sign-in** — เกษตรกรเข้าใช้ได้เลยไม่ต้องสมัคร
- **Email + Password** — สมัคร / login / logout
- **Forgot Password + Reset Password** — ส่งอีเมล + ตั้งรหัสใหม่
- **Phone OTP + Google OAuth** — เป็น mockup (ภายหลังเชื่อมจริงได้)
- Reactive `useUser()` hook + `useIsAdmin()` hook
- หน้า: `/login`, `/signup`, `/forgot-password`, `/auth/reset-password`, `/auth/callback`

### ✅ Phase 3 — Image Upload + Manual Form → Database
- หน้า `/analyze/upload` — อัปโหลดรูปแผ่นทดสอบ OM/P/K → เก็บใน Supabase Storage
- หน้า `/analyze/form` — กรอกค่าวิเคราะห์ → save ลง DB
- หน้า `/analyze/result` — ดึงข้อมูลจาก DB + แสดงค่าจริง
- **Map Picker เป็น Modal** — เลือกพิกัดโดยไม่เปลี่ยน route (state ไม่หาย)
- เก็บ metadata รูป (file_size, path, signed URL)

### ✅ Phase 4 — Fertilizer Calculator + Excel Import
- Python script แปลง Excel → SQL INSERT statements
- Import **29 พืช** + **247 fertilizer recommendations** จาก DOA Excel
- **Calculation Engine** — รับค่า OM/P/K + ชนิดพืช → คืน N/P₂O₅/K₂O ที่แนะนำ
- รองรับทั้งหน่วย `g/tree/year` (ไม้ผล) และ `kg/rai` (พืชไร่)
- **ไฟล์:** `supabase/migrations/002_import_orchard.sql`, `scripts/import_orchard_excel.py`

### ✅ Phase 5 — Profile + Password Management
- หน้า `/profile` — แก้ชื่อ, ชื่อเล่น, เบอร์โทร
- หน้า `/profile/change-password` — เปลี่ยนรหัสผ่าน (ต้อง login)
- หน้า `/forgot-password` — ขอลิงก์ reset ทางอีเมล
- หน้า `/auth/reset-password` — ตั้งรหัสใหม่จากลิงก์อีเมล
- Anonymous user เห็นปุ่ม "สมัครสมาชิก" แทน (ไม่มี profile/password)

### ✅ Phase 7.1 — Admin Dashboard Foundation
- Layout แยกสำหรับ `/admin/*` พร้อม **role guard** (server-side)
- Sidebar navigation (responsive — mobile drawer)
- Dashboard overview พร้อม **stats** (users, analyses, crops, recent activity)
- Stub pages พร้อมขยาย (users, analyses, crops, settings)
- ลิงค์ "Admin Panel" ในเมนู (เฉพาะ admin)

### ✅ Phase 9 — History Page
- หน้า `/history` — ดึงประวัติของ user จาก DB (RLS-scoped)
- Search + Filter tabs (ทั้งหมด / เสร็จสิ้น / รอดำเนินการ)
- แสดงรูปจริงที่ user อัปโหลด (signed URLs)
- Empty state + Loading state

### ✅ Phase 10 — Deploy
- Deploy บน **Vercel** (free tier)
- URL: https://doa-test-kit.vercel.app
- Environment variables setup (Supabase keys)

### ✅ อัปเดต 2026-07-21 — ปรับ UX คำนวณปุ๋ย + ซ่อนแผนที่ (แอดมินคุมได้)
- **หน้าคำนวณปุ๋ย (`/analyze/form`) เปลี่ยนเป็นกดปุ่มคำนวณ** (จากเดิมคำนวณอัตโนมัติทันทีที่กรอก) — ลำดับใหม่: เลือกพืช → ค่าดิน → **เลือกปุ๋ย 1–3 สูตร** → กด **"คำนวณ"** → แสดงธาตุอาหาร + ปริมาณปุ๋ย. กด "คำนวณใหม่" จะล้างผลเก่าก่อนคำนวณเสมอ (กันค่าตกค้าง) และแก้ค่าใด ๆ ผลจะล้างให้กดใหม่
- **ตรรกะผสมปุ๋ย (`blend.ts`) ให้ความสำคัญ P > N > K** (weighted least-squares) — ตรงกับหลักกรมฯ ที่ตรึงฟอสฟอรัสก่อน (P เคลื่อนที่ในดินยาก): กรณีปุ๋ยเข้าเป้าได้ผลเท่าเดิมเป๊ะ, กรณีเข้าไม่ได้จะการันตี P ครบก่อน
- **ไอคอนพืชเป็นภาพวาด SVG รายชนิด** (29 พืช) แทน emoji — เลือกประเภทก่อนแล้วพืชทยอยแสดง
- **แผนที่ดินซ่อนเป็นค่าเริ่มต้น — แอดมินเปิด/ปิดได้** ที่ `/admin/settings` (toggle). ตาราง `app_settings` (migration `006_app_settings.sql`), route `/map` มี guard กันเข้าถึงเมื่อปิด
- **ไฟล์หลัก:** `src/lib/fertilizer/blend.ts`, `src/components/fertilizer/{CropPicker,FertilizerPicker,BlendResultCard,cropIcons}.tsx`, `src/lib/supabase/settings.ts`, `src/app/admin/settings/*`, `supabase/migrations/006_app_settings.sql`

### 🎨 UI Polish (ทำตลอด)
- **BottomNav** เปลี่ยนเป็น **Liquid Glass** style ลอย
- Profile Drawer แสดงข้อมูล user จริง + chip "ผู้ใช้ไม่ระบุตัวตน"
- รองรับสองภาษา (ไทย / EN) ครบทุก label
- หน้า login mockup ของ Google ไม่มีชื่อจริง

### ⏳ ยังไม่ได้ทำ (รอ phase ต่อไป)
- Phase 4.5: Import พืชไร่จาก Excel ไฟล์ 2 (20 sheets)
- Phase 7.2: User Management ใน admin
- Phase 7.3: Analysis Records Viewer ใน admin
- Phase 7.4: Fertilizer DB Manager ใน admin (CRUD)
- Phase 7.5: CMS (แก้ banner/content)
- Phase 8: เชื่อม AI prediction (รอ endpoint จากทีม)

---

## 3. โครงสร้างฐานข้อมูล

ตารางทั้งหมดออกแบบโดย**อ้างอิงจาก** schema เดิมในระบบเก่า (จาก `Web_Report.pdf`) แต่ปรับให้:
- เป็น PostgreSQL syntax
- ใช้ UUID เป็น primary key (มาตรฐาน Supabase)
- มี RLS policies ป้องกันข้อมูลในระดับ row
- ลดความซับซ้อนที่ไม่ใช้ (multi-tenant, custom auth tables ฯลฯ)

### 3.1 ตารางที่สร้างแล้ว (9 ตาราง)

| # | ตารางใหม่ | หน้าที่ | ตารางเก่า (อ้างอิง) |
|---|---------|---------|----------|
| 1 | **`profiles`** | ข้อมูลเสริมของ user (ชื่อ, เบอร์, role) — เชื่อมกับ `auth.users` | `users` |
| 2 | **`crop_types`** | ประเภทพืช (ไม้ผล, พืชไร่, พืชผัก, ข้าว) | `plant_type` |
| 3 | **`crops`** | ชนิดพืชแต่ละชนิด (ทุเรียน, มังคุด, ข้าวโพด ฯลฯ) | `plant` |
| 4 | **`nutrients`** | lookup ธาตุอาหาร (OM, P, K) | `earth_element` |
| 5 | **`fertilizer_recommendations`** | เกณฑ์อัตราแนะนำตามช่วงค่า OM/P/K | `element_plant` + `fertilizer_amount` |
| 6 | **`fertilizer_applications`** | สูตรปุ๋ย + ระยะใส่ (สำหรับพืชไร่) | `fertilizer_amount_detail` |
| 7 | **`analyses`** | ประวัติการวิเคราะห์ของ user | `element_plant_log` |
| 8 | **`analysis_images`** | path รูปที่อัปโหลดใน Supabase Storage | — (ใหม่) |
| 9 | **`analysis_results`** | แผนปุ๋ยที่ระบบ generate ให้ | — (ใหม่) |

### 3.2 รายละเอียดตารางสำคัญ

#### 📋 `profiles` (ข้อมูลผู้ใช้)
```
id              uuid (FK → auth.users.id)
email, phone    text
full_name       text
nickname        text
role            'user' | 'admin'
avatar_url      text
created_at, updated_at
```
> สร้างอัตโนมัติเมื่อ user สมัครใหม่ (trigger `handle_new_user`)

#### 🌱 `crops` + `crop_types`
```
crop_types: id, name (ไม้ผล/พืชไร่/พืชผัก/ข้าว), unit_basis (per_tree/per_rai)
crops:      id, name (ทุเรียน, ข้าวโพด ฯลฯ), crop_type_id (FK)
```

#### ⭐ `fertilizer_recommendations` (หัวใจของระบบคำนวณปุ๋ย)
```
crop_id          uuid (FK → crops)
mode             '100%' | '70%'
om_min, om_max   numeric    -- ช่วงค่า OM
p_min, p_max     numeric    -- ช่วงค่า P
k_min, k_max     numeric    -- ช่วงค่า K
target_n         numeric    -- N ที่แนะนำ
target_p2o5      numeric    -- P2O5 ที่แนะนำ
target_k2o       numeric    -- K2O ที่แนะนำ
target_unit      'g/tree/year' | 'kg/rai'
```
> 1 row = 1 ช่วงค่าของ 1 ธาตุของ 1 พืช (สำหรับไม้ผล)
> หรือ 1 combination ของ OM × P × K (สำหรับพืชไร่)

#### 📷 `analyses` + `analysis_images` + `analysis_results`
```
analyses:           user_id, crop_id, input_mode (image/form),
                    om_value, p_value, k_value, status,
                    province, amphur, district, lat, lng
analysis_images:    analysis_id, nutrient_code (OM/P/K), storage_path, public_url
analysis_results:   analysis_id, recommendation_id, recommended_n/p2o5/k2o, unit
```

### 3.3 ตารางเก่าที่ **ไม่ได้ย้ายมา** (ระบบใหม่ไม่ใช้)

| ตารางเก่า | ไม่ใช้เพราะ |
|----------|------------|
| `api_keys`, `api_access`, `api_logs` | ใช้ Supabase Auth + RLS แทน |
| `ci_sessions` | Supabase จัดการ session ให้ |
| `company`, `company_setting`, `department` | DOA = single tenant ไม่ใช่ multi-company |
| `menu`, `rule`, `rule_menu` | ใช้ Next.js routes + RLS แทน |
| `versions` | Supabase migrations จัดการให้ |
| `notification` | ทำทีหลังถ้าต้องใช้ |
| `geography`, `settings`, `global_settings` | รวมเป็น `cms_pages` ภายหลัง |

### 3.4 ตารางที่ **ควรเพิ่มในอนาคต** (Phase 6+)

จาก schema เก่า ยังขาด 5 ตารางที่อาจมีประโยชน์:
1. `fertility_level` — ระดับความสมบูรณ์ของดิน (ต่ำ/ปานกลาง/สูง)
2. `fertilizer_types` — ประเภทปุ๋ย (เคมี/อินทรีย์)
3. `fertilizer_formulas` — รายการสูตรปุ๋ย (16-20-0, 15-15-15 ฯลฯ)
4. `fertilizer_use_stages` — ระยะการใส่ (รองพื้น/แต่งหน้า)
5. `provinces` / `amphurs` / `districts` — ที่อยู่ไทย (Phase 2)

---

## 4. ข้อมูลที่ Import แล้ว

จากไฟล์ Excel `1.ขัอมูลคำแนะนำการให้ปุ๋ยตามค่าวิเคราะห์ดิน.xlsx`:

| ประเภทพืช | จำนวน | ตัวอย่าง |
|----------|------|---------|
| 🌳 **ไม้ผล** | 9 ชนิด | ทุเรียน, มังคุด, เงาะ, มะม่วง, ลำไย, ลิ้นจี่, ส้ม, มะพร้าว, สับปะรด |
| 🌾 **พืชไร่** | 6 ชนิด | อ้อยปลูก, อ้อยตอ, ข้าวโพดฝักสด/เลี้ยงสัตว์, มันสำปะหลัง, ถั่ว |
| 🥬 **พืชผัก** | 12 ชนิด | มันฝรั่ง, มันเทศ, เผือก, หน่อไม้ฝรั่ง, กระเทียม, หอมแดง, หอมหัวใหญ่, พริก, มะเขือ, มะเขือเทศ, กระเจี๊ยบเขียว, ผัก |
| 🌾 **ข้าว** | 2 ชนิด | ข้าวไวแสง, ข้าวไม่ไวแสง |
| **รวม** | **29 พืช** | **247 recommendation rows** |

---

## 5. โครงสร้างไฟล์โปรเจกต์

```
D:\doa_test_kit\
├── src/
│   ├── app/
│   │   ├── analyze/                   ← วิเคราะห์ดิน (upload, form, map, result, fertilizer)
│   │   ├── auth/                      ← OAuth callback, reset password
│   │   ├── admin/                     ⭐ ใหม่ — Admin dashboard (Phase 7.1)
│   │   │   ├── layout.tsx             ← Role guard
│   │   │   ├── page.tsx               ← Dashboard overview
│   │   │   ├── users/, analyses/, crops/, settings/   (stubs)
│   │   ├── history/, profile/         ← User pages
│   │   ├── login/, signup/, forgot-password/          ← Auth flows
│   │   └── ...
│   ├── components/
│   │   ├── layout/                    ← Bar, BottomNav (liquid glass)
│   │   ├── admin/AdminSidebar.tsx     ⭐ ใหม่
│   │   └── ui/                        ← Button, Input ฯลฯ
│   ├── lib/supabase/
│   │   ├── client.ts, server.ts, middleware.ts        ← Supabase clients
│   │   ├── auth.ts                    ← Sign in/up/out, password mgmt
│   │   ├── useUser.ts                 ← React hooks
│   │   ├── analyses.ts                ← Server actions ของ analysis
│   │   ├── fertilizer.ts              ← Calculation engine
│   │   ├── profile.ts                 ← Profile CRUD
│   │   └── admin.ts                   ⭐ ใหม่ — admin actions
│   └── types/database.ts              ← TypeScript types
├── supabase/migrations/
│   ├── 001_initial_schema.sql         ← 9 ตาราง + RLS
│   └── 002_import_orchard.sql         ← 29 พืช + 247 recommendations
├── scripts/
│   └── import_orchard_excel.py        ← Excel → SQL converter
├── docs/
│   └── PROGRESS_REPORT.md             ← ไฟล์นี้
└── middleware.ts                      ← Session refresh
```

---

## 6. การ Deploy

**Production preview:** https://doa-test-kit.vercel.app

- Hosted บน **Vercel** (Free tier)
- Database + Storage + Auth บน **Supabase** (Free tier)
- Environment variables: 3 ตัว (URL + Publishable key + Secret key)
- Auto-build เมื่อ push ใหม่ — **ปัจจุบันต้อง deploy ด้วยมือ** (`vercel --prod`) เพราะยังไม่ได้ connect Git repo

---

## 7. สิ่งที่ต้องคุยกับทีม

### 🗨️ ก่อน merge เข้า main
1. **โอเคย้ายเป็น Supabase แทน MariaDB ไหม?** (AGENTS.md ยังเขียน MariaDB อยู่)
2. **ใช้ Supabase project ที่สร้างไว้ หรือสร้างใหม่ในชื่ออาจารย์?**
3. **AGENTS.md ต้องอัปเดต** ให้ตรงกับ stack ใหม่

### 🤖 ที่ขอจากทีม AI
1. URL ของ Prediction API
2. Request format (multipart/form-data?)
3. Response format (JSON shape)

> เมื่อได้ครบ — เชื่อมต่อใน `src/lib/supabase/analyses.ts` ใช้เวลาประมาณ 30 นาที

---

## 8. Tech Stack สรุป

```
Frontend:    Next.js 16 · React 19 · TypeScript · Tailwind v4
Backend:     Next.js Server Actions
Auth:        Supabase Auth (Anonymous + Email/Password)
Database:    Supabase PostgreSQL + RLS policies
Storage:     Supabase Storage (S3-compatible)
Forms:       React Hook Form + Zod validation
Maps:        Leaflet (in-page Modal)
Charts:      Recharts (ยังไม่ใช้เต็ม)
Icons:       Lucide React
Hosting:     Vercel
AI:          (รอเชื่อม FastAPI + PyTorch + MLFlow จากระบบเก่า)
```

---

## 9. ขั้นถัดไป

ลำดับตามความสำคัญ:
1. **Phase 7.2-7.4** — Admin Dashboard ครบ (User mgmt, Analysis viewer, Fertilizer DB CRUD)
2. **Phase 4.5** — Import พืชไร่จาก Excel ไฟล์ 2
3. **Phase 8** — เชื่อม AI prediction เมื่อทีมส่ง endpoint
4. **Phase 6** — เพิ่ม 5 ตารางที่ขาด
5. **CMS** — แก้ banner/content ผ่าน admin
6. **Production domain** — ขอ subdomain ของ doa.go.th + ตั้ง DNS

---

> **อัปเดตล่าสุด:** วันที่จบ session นี้
> **อยู่ใน branch:** `aidin-work`
> **PR:** [เปิดไว้แล้ว → รอเพื่อน review ก่อน merge]

