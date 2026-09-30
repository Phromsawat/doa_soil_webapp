# 🤝 คู่มือแบ่งงาน — สำหรับเพื่อนที่ทำ Frontend

## 📋 ภาพรวม

ตอนนี้ผมทำส่วน **backend + integration กับ Supabase** เสร็จไปเยอะแล้ว
มี **3 โซน** สำหรับเพื่อนทำได้ — เรียงจากปลอดภัยที่สุด → ต้องระวังที่สุด

```
🟢 โซนเขียว  = ทำได้เลย ไม่กระทบ backend
🟡 โซนเหลือง = ทำได้ แต่ต้องระวัง / คุยกันก่อน
🔴 โซนแดง   = อย่าแตะ — backend ผูกแน่นแล้ว
```

---

## 🟢 โซนเขียว — ทำได้เลย!

### 1. หน้า Static / Content Pages
ไฟล์เหล่านี้เป็น UI ล้วน ไม่มี backend — แก้ design / content / animation ได้เต็มที่

| ไฟล์ | อะไร |
|-------|------|
| `src/app/page.tsx` | หน้าหลัก (Hero, sections ต่างๆ) |
| `src/app/Home_1.tsx` | content ของหน้าหลัก |
| `src/app/doa-kits/page.tsx` | หน้า "การวิเคราะห์ด้วย DOA Kits" |
| `src/app/soil-sampling/page.tsx` | หน้า "วิธีการเก็บตัวอย่างดิน" |
| `src/app/user-guide/page.tsx` | หน้า "คู่มือใช้งานเว็บแอป" |
| `src/components/TermsModal.tsx` | Terms & Conditions popup |

**ทำอะไรได้:**
- ปรับ layout, สี, fonts, animations
- เพิ่มรูป/icons
- ปรับเนื้อหา
- Mobile responsive improvements

### 2. UI Components ใหม่ที่ขาด
อันนี้ยังไม่มี — เพื่อนสร้างเลยได้

- **Toast/Notification system** — แสดง success/error เป็น popup ลอย
- **Skeleton loaders** — ตอนรอข้อมูลโหลด แทน Loader2 spinner
- **Empty states** ที่สวยกว่านี้ พร้อม illustration
- **Confirmation modal** — ใช้ตอนลบ/ออกจากระบบ
- **Tooltip component** — hover แสดง help text

### 3. หน้าใหม่ที่ยังไม่มี
- **FAQ page** (`/faq`) — คำถามพบบ่อย
- **About us / Team** — แนะนำทีมงาน
- **Privacy Policy** (`/privacy`) — นโยบายความเป็นส่วนตัว
- **404 page** (`src/app/not-found.tsx`) — ตอนนี้ default ของ Next.js
- **500 / error page** — ตอน error แบบสวยๆ

### 4. ปรับปรุง Assets
- รูปประกอบ (`public/img/`, `ICON/`)
- เปลี่ยน Unsplash image hardcoded เป็นรูปจริง
- Logo variants (favicon, apple-touch-icon ฯลฯ)
- Color palette ปรับ tone

### 5. Polish ระดับ Detail
- Loading transition ระหว่างหน้า
- Page transitions (framer-motion)
- Hover effects บน buttons
- Focus rings สำหรับ accessibility
- Dark mode (ถ้าอยากท้าทาย)

---

## 🟡 โซนเหลือง — ระวัง / คุยกันก่อน

ไฟล์เหล่านี้มีทั้ง UI และ logic — แก้ได้แต่ระวังไม่ลบของที่ผมต่อ Supabase ไว้

### Layout & Navigation
- **`src/components/layout/bar.tsx`** — Navbar
  - ⚠️ มี auth state (avatar/ชื่อ user) + admin link
  - ✅ ปรับ design ของ navbar ได้ แต่อย่าลบ `useUser()` + `useIsAdmin()`
  - ✅ ปรับ Profile Drawer style ได้ แต่อย่าลบ `signOut()` logic

- **`src/components/layout/BottomNav.tsx`** — Bottom mobile nav (liquid glass)
  - ✅ ปรับ design / สี / icons ได้
  - ⚠️ อย่าลบ route logic (Home + Menu button)

### หน้าที่มี Form แต่ UI ปรับได้
- **`src/app/analyze/upload/page.tsx`** — หน้าอัปโหลดรูป
  - ⚠️ มี Supabase Storage logic
  - ✅ ปรับ design ของฟอร์ม, การจัดวาง input ได้
  - ❌ อย่าแก้ `handleSubmit` (เรียก server actions)

- **`src/app/analyze/form/page.tsx`** — หน้ากรอกค่าเอง
  - ⚠️ มี Supabase save + auto-calc
  - ✅ ปรับ UI ของ input/dropdown ได้
  - ❌ อย่าแก้ `onSubmit` logic

- **`src/app/analyze/result/page.tsx`** — หน้าแสดงผล
  - ⚠️ ดึงข้อมูลจาก Supabase
  - ✅ ปรับ design การแสดงผล (charts, badges, layout) ได้
  - ❌ อย่าแก้ `useEffect` ที่ load data

### Map Picker
- **`src/app/analyze/map/MapPicker.tsx`** — Leaflet map
  - ✅ ปรับ style ของ marker / overlay / buttons
  - ⚠️ อย่าลบ `onConfirm`/`onCancel` props (Modal ใช้)

---

## 🔴 โซนแดง — อย่าแตะ (Backend logic)

### Auth Pages — มี Supabase logic
```
src/app/login/page.tsx
src/app/signup/page.tsx
src/app/forgot-password/page.tsx
src/app/auth/reset-password/page.tsx
src/app/auth/callback/route.ts
src/app/profile/page.tsx
src/app/profile/change-password/page.tsx
```
> ปรับ UI ได้นิดหน่อย แต่อย่าแก้ logic — ขอคุยก่อน

### Admin
```
src/app/admin/**             ← ทั้งโฟลเดอร์ — ผมยังทำต่ออยู่
src/components/admin/**
```

### Supabase Backend
```
src/lib/supabase/**          ← Server actions, hooks, clients
src/types/database.ts        ← TypeScript types ของ DB
supabase/migrations/**       ← SQL schema
scripts/import_orchard_excel.py
middleware.ts                ← Next.js middleware
next.config.ts               ← Server config
```

### ไฟล์ Config
```
.env.local                   ← Supabase keys (ไม่ commit อยู่แล้ว)
package.json                 ← เพิ่ม dependency ได้ แต่บอกก่อน
tsconfig.json
```

---

## 🤖 ที่ให้เพื่อนช่วยทำ — แนะนำเฉพาะ

### 🥇 Priority 1: ปรับ Home page
หน้าหลักตอนนี้เป็น **landing page** หลัก ยังเหมือนเดิมจาก commit แรก — สามารถ:
- ออกแบบ Hero ใหม่ให้น่าสนใจ
- เพิ่ม section "เริ่มต้นยังไง" (4 ขั้นตอน + รูป)
- Section "ทำไมต้องใช้ DOA Soil Kit"
- Customer testimonials (เกษตรกรพูดถึง)
- CTA ที่ชัดเจน

### 🥈 Priority 2: ปรับ Pages เนื้อหา DOA
3 หน้านี้เป็น content pages ที่ DOA อยากให้สวย:
- `/soil-sampling` — วิธีการเก็บตัวอย่างดิน (ทำเป็น step-by-step + illustrations)
- `/doa-kits` — การวิเคราะห์ด้วย DOA Kit (มี video อยู่แล้ว — เพิ่ม content รอบ)
- `/user-guide` — คู่มือการใช้เว็บแอป (screenshots + tips)

### 🥉 Priority 3: เพิ่ม Components ที่ขาด
- **Toast notification** — แทน alert ของ browser
- **Skeleton loaders** — แทน spinner รอ
- **Better empty states** — illustration + helpful message

### 🏅 Priority 4 (advanced): Polish
- Page transitions (framer-motion)
- Better mobile responsiveness
- Accessibility (ARIA labels, keyboard nav)
- Dark mode

---

## 🔄 Workflow ที่แนะนำ

### 1. เพื่อนสร้าง branch ของตัวเอง
```bash
git checkout main
git pull origin main
git checkout -b friend/ui-improvements
```

### 2. คุยกันก่อนแก้ไฟล์โซนเหลือง
แชทใน Discord:
- "ขอแก้ bar.tsx ปรับ design นะ — จะไม่แตะ logic"
- รอผมตอบ → ลุย

### 3. Commit ย่อยๆ
```bash
git add src/app/page.tsx
git commit -m "feat: redesign home hero section"
```

### 4. Push + Open PR
```bash
git push -u origin friend/ui-improvements
# → ไป GitHub กด "New Pull Request"
```

### 5. ผม review → merge

---

## 📦 Tech ที่ใช้ในโปรเจกต์

ถ้าเพื่อนอยากเพิ่ม library — รายการที่มีอยู่แล้ว:

```
✅ Tailwind CSS v4         — styling
✅ Lucide React            — icons
✅ Radix UI (Dialog, etc.) — accessible primitives
✅ React Hook Form + Zod   — forms
✅ Recharts                — charts (ยังไม่ใช้เต็ม)
✅ Leaflet                 — maps
✅ class-variance-authority — variant components
```

### ถ้าอยากเพิ่ม:
- `framer-motion` — animations
- `sonner` — toast notifications
- `cmdk` — command palette
- `react-hot-toast` — alternative toast

→ บอกผมก่อนนะ จะ `bun add` ให้ใน main branch

---

## ❓ คำถามที่อาจเจอ

### Q: อยากแก้สีหลักของระบบ
A: เปลี่ยนใน `src/app/globals.css` (มี CSS variables) — กระทบทั้งระบบ คุยก่อน

### Q: อยากเพิ่มภาษา (จีน, อังกฤษ)
A: เพิ่มใน `src/lib/TH_ENG.ts` — เพิ่ม key/value สำหรับภาษาใหม่ + ปรับ Provider

### Q: อยากเปลี่ยน font
A: แก้ใน `src/app/layout.tsx` + `globals.css` (font-thai variable)

### Q: เห็น Supabase อะไรไม่เข้าใจ
A: ผมเขียน docs ใน `docs/PROGRESS_REPORT.md` ดูได้

---

## 🚨 ห้ามทำเด็ดขาด

1. ❌ commit `.env.local`
2. ❌ ลบไฟล์ใน `src/lib/supabase/`
3. ❌ แก้ `supabase/migrations/` (ทำให้ DB schema ไม่ตรง)
4. ❌ แก้ middleware.ts โดยไม่คุย
5. ❌ Push ตรงเข้า main (ต้องผ่าน PR เสมอ)
6. ❌ Force push (`--force`) บน branch ที่ใช้ร่วมกัน
7. ❌ Skip ESLint warnings โดยไม่บอก

---

## ✅ ที่ผม (iidinz) ทำต่อ

ผมยังทำต่อใน:
- Phase 7.2: User Management ใน admin
- Phase 7.3: Analysis Records Viewer ใน admin
- Phase 7.4: Fertilizer DB CRUD ใน admin
- Phase 8: เชื่อม AI prediction เมื่อทีมส่ง endpoint
- Phase 4.5: Import พืชไร่จาก Excel ไฟล์ 2

→ ทำใน branch `aidin-work` ของผม

---

---

## 📅 Work Log

### วันที่ 7 กรกฎาคม 2569

**หน้า Change Password (`src/app/profile/change-password/page.tsx`)**
- เปลี่ยนปุ่ม "แสดง"/"ซ่อน" รหัสผ่าน เป็น icon ตา (Eye / EyeOff จาก lucide-react)

**หน้า History (`src/app/history/page.tsx` + `src/components/layout/bar.tsx`)**
- ย้าย title "ประวัติการวิเคราะห์" ไปกลาง header — ใช้ `absolute inset-0 justify-center` ให้ title ลอยตรงกลางจริงๆ ไม่ว่า left/right content กว้างแค่ไหน
- ซ่อนปุ่ม "หน้าหลัก" ใน bar บนหน้า History สำหรับ mobile/tablet (`hidden lg:flex`) — เหลือแค่ desktop
- ย้าย badge "X รายการ" ไปตรงกลาง + เปลี่ยนสีตัวหนังสือจากเขียว (`text-primary`) เป็น `text-gray-700`
- ลบ title ซ้ำที่อยู่ใน page content (เหลือแค่ใน bar)
- ลดความหนาตัวหนังสือ: `font-bold` → `font-medium` (ปุ่ม tab, card title, badge NPK, ลิงก์ "ดูรายละเอียด")
- เปลี่ยนสีลิงก์ "ดูรายละเอียด" + badge "เสร็จสิ้น" จากเขียว → `text-gray-700`
- ลดขนาด icon FileText (thumbnail fallback): `w-8 h-8` → `w-5 h-5 strokeWidth={1}`

**Bug fix: ตัวหนังสือ placeholder สีเขียวทั้งแอป (`src/app/globals.css`)**
- แก้ `body { color: var(--color-primary) }` → `color: var(--color-text-primary)` — body สีเขียวทำให้ placeholder ทุก input รับ inherit แล้วออกมาสีเขียวหมด

**หน้า Analyze Result (`src/app/analyze/result/page.tsx`)**
- ลดความหนาตัวหนังสือ: `font-bold` / `font-semibold` → `font-medium` (14 จุด)
- อัพเดทสี progress bar NPK ให้ตรง design system: ต่ำ `#ff000d`, ปานกลาง `#ffd188`, สูง `#85c98a` (ดึงค่าจาก MapView.tsx)
- ค่า NPK: เปลี่ยนจาก `ค่า — ระดับ` เป็น `ค่า (ระดับ)` — ลบขีดกลาง ใช้วงเล็บแทน
- ค่า NPK text color → neutral gray (`text-text-secondary`) ไม่ใช้สีตาม level อีกต่อไป
- ลบ icon Sprout จากหัวข้อ "เลือกพืชที่จะปลูก"
- ลบ icon Droplets จากหัวข้อ "คำแนะนำการจัดการปุ๋ย"
- Select dropdown: เพิ่ม `appearance-none` + `ChevronDown` absolute position ด้านขวา — ลูกศรอยู่ในช่องพอดี ทุก browser

---

### วันที่ 8 กรกฎาคม 2569

**หน้า Analyze Result (`src/app/analyze/result/page.tsx`)**
- Badge "กรอกค่าเอง" / "อัปโหลดรูป": เปลี่ยนสีจากเขียว (`text-primary`) → `text-gray-700`

---

### วันที่ 12 กรกฎาคม 2569

**หน้าแผนที่ (`src/app/map/SoilMaps.tsx`) — ออกแบบใหม่ทั้งหน้า**

- เพิ่มเข็มทิศ (N + ลูกศร) วงกลมขาว มุมบนซ้าย — `z-[1000]`
- เพิ่มปุ่ม zoom +/- แนวตั้ง ชิดขวากลาง
- เพิ่มปุ่ม My Location ใช้ icon `/precision.png`
  - กดปุ่ม → pin ปักที่ตำแหน่งผู้ใช้ + map zoom ไปที่นั้น
  - ย้าย pin ต่อได้โดยแตะที่อื่นบนแผนที่
- Legend ย้ายไป `top-16 left-3` ตลอด (ไม่ขึ้นกับ breakpoint)
- Legend dots เปลี่ยนจาก `rounded-sm` → `rounded-full` (วงกลม)
- Basemap เปลี่ยนจาก `voyager` → `voyager_nolabels` (ไม่มีชื่อเมือง)
- เพิ่ม "THAILAND" label marker ตรงกลางประเทศ (ชดเชยการเอา labels ออก)
- PIN marker: วงกลมสีเขียวเข้ม `#1A4D2E` ขนาดเล็ก 13×13px
- Tab active: เปลี่ยนจาก `bg-emerald-500` → `bg-[#1A4D2E]` (ตรงกับปุ่มหลัก)
- Card active border: เปลี่ยนจาก `border-emerald-300` → `border-[#1A4D2E]` พร้อม bg ขาวแทน mint
- พิกัดใน card: จัดกึ่งกลาง
- ลบ user location dot (watchPosition) — ใช้ PIN เป็น indicator เดียว

**Layout (`src/components/layout/bar.tsx`) — แก้ z-index menu ทับแผนที่**

- Menu overlay: `z-[45]` → `z-[1200]`
- Menu drawer: `z-[50]` → `z-[1300]`
- Profile overlay: `z-[55]` → `z-[1200]`
- Profile drawer: `z-[60]` → `z-[1300]`
- สาเหตุ: Leaflet map controls ใช้ `z-[1000]`/`z-[1001]` ทำให้เมนูโดนทับเมื่ออยู่บนหน้าแผนที่

**Admin (`src/app/admin/page.tsx`)**

- เอา em dash + bullet list ออก เปลี่ยนเป็น white dot flex items
- เปลี่ยน gradient background → solid `bg-[#1A4D2E]`

**BottomNav (`src/components/layout/BottomNav.tsx`)**

- icon "ภาพรวม" admin: `LayoutDashboard` → `BarChart2`
- เอา active state background pill ออก — เหลือแค่เปลี่ยนสีตัวหนังสือ

**Bar — หน้าแผนที่ (`src/components/layout/bar.tsx`)**

- เพิ่ม map page header: แสดง `← หน้าหลัก | แผนที่` จัดกึ่งกลาง (เหมือนหน้าย่อยอื่น)
- เพิ่มปุ่ม profile avatar บน mobile สำหรับหน้า admin (`isAdminPage`)

**เกณฑ์ดิน (`MAP.md` + 3 ไฟล์)**

- สร้าง `MAP.md` — ตารางเกณฑ์ OM/P/K อ้างอิงกรมวิชาการเกษตร
- แก้ threshold ที่ผิดใน `fertilizer/page.tsx`, `history/page.tsx`, `storage.ts`
  - P: `<15` → `<10`, `<=45` → `<=25`
  - K: `<50` → `<60`, `<=100` → `<=90`

---

> สงสัยอะไรถามได้ที่ Discord
> รายงานครบ: [PROGRESS_REPORT.md](./PROGRESS_REPORT.md)
