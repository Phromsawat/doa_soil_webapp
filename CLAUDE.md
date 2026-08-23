@AGENTS.md

# Claude Code Guide — DOA Soil Test Kit

## Design Reference
ดู `DESIGN.md` สำหรับ design system ทั้งหมด (สี, typography, spacing, components)

## Key Conventions

### ภาษาและ UI
- ข้อความทุกอย่างในแอปเป็น **ภาษาไทย**
- font หลัก: `font-thai` (Noto Sans Thai)

### สีระดับ (Progress Bar)
ใช้สีตามระดับเท่านั้น ตัวอักษร label ทุกระดับใช้ `text-text-secondary`
- **ต่ำ** → `bg-[#ff000d]` (แดง)
- **ปานกลาง** → `bg-[#ffd188]` (เหลืองอ่อน)
- **สูง** → `bg-green-600` (เขียว)

### หน่วยแสดงผล
- อินทรียวัตถุ (OM) → `%`
- ฟอสฟอรัส (P) → `มก./กก.`
- โพแทสเซียม (K) → `มก./กก.`

### sessionStorage keys (ผ่านทุกหน้า)
| Key | ค่า | ที่มา |
|---|---|---|
| `predict_img_om` | base64 รูป อินทรียวัตถุ | upload page |
| `predict_img_p` | base64 รูป ฟอสฟอรัส | upload page |
| `predict_img_k` | base64 รูป โพแทสเซียม | upload page |
| `predict_time` | ISO string เวลากดทำนาย | upload page |
| `predict_lat` | latitude string | upload page |
| `predict_lng` | longitude string | upload page |
| `predict_crop` | ชนิดพืชหลัก | result page |
| `predict_subcrop` | ชนิดพืชไร่ย่อย | result page |
| `predict_croptype` | ประเภทย่อย (ข้าวโพด/อ้อย) | result page |
| `picked_lat` | lat จากการปักหมุด | map page |
| `picked_lng` | lng จากการปักหมุด | map page |

### การส่งพิกัด Upload → Map
ส่งผ่าน query params: `/analyze/map?returnTo=/analyze/upload&lat=...&lng=...`
Map เปิดขึ้นจะ zoom + ปักหมุดที่พิกัดนั้นอัตโนมัติ
ถ้าไม่มี initial coords จะ GPS ตำแหน่งปัจจุบันทันที

### Page Title (Top Bar)
กำหนดใน `src/components/layout/bar.tsx`
- `/analyze/result` → **ผลการทำนาย**
- `/analyze/upload` → **วิเคราะห์ดิน**
- `/analyze/form` → **กรอกผลวิเคราะห์ดิน**
- `/analyze/fertilizer` → **คำนวณสูตรปุ๋ย**
- `/analyze/map` → **เลือกพิกัดบนแผนที่**

### หน้า Result — โครงสร้างการ์ด
1. **ระดับธาตุอาหารหลัก** — 3 card (OM, P, K) มีช่องรูปด้านบน + progress bar
2. **แผนที่** — Leaflet Carto Voyager (MapPreview component) แสดงเมื่อมีพิกัด
3. **เลือกชนิดพืช** — accordion 3 ระดับ (พืชหลัก → พืชไร่ย่อย → ข้าวโพด/อ้อย)

### เลือกชนิดพืช — ลำดับชั้น
```
พืชไร่ → ข้าวโพด → ข้าวโพดเลี้ยงสัตว์ / ข้าวโพดฝักสด
       → อ้อย    → อ้อยปลูก / อ้อยตอ
       → มันสำปะหลัง
       → ถั่ว
ไม้ผล / ข้าว / ปาล์มน้ำมัน / ยางพารา / พืชผัก (ยังไม่มี sub-menu)
```

## Types
- `src/types/database.ts` — โครงตารางใน Supabase (`Analysis`, `Profile`, `Crop`, ...)
- `src/types/content.ts` — บล็อกเนื้อหาหน้าข้อมูล (แก้ได้จาก `/admin/content`)

## Components เพิ่มเติม
- `src/app/analyze/result/MapPreview.tsx` — Leaflet read-only map สำหรับแสดงพิกัดในหน้า result
- `src/components/fertilizer/LeafStandardTable.tsx` — ตารางค่ามาตรฐานความเข้มข้นของธาตุอาหาร (ขั้นที่ 2) อ่านจาก `src/lib/soil/leafStandards.ts`
- `src/components/fertilizer/SoilRecommendationTable.tsx` — ตารางการใช้ปุ๋ยตามค่าวิเคราะห์ดิน (ขั้นที่ 3) อ่านจาก `fertilizer_recommendations` ซึ่งเป็นตารางเดียวกับที่ใช้คำนวณ

## หน้า `/ledger` — สมุดบัญชี
บันทึกรายรับรายจ่ายแยกตาม **รอบเพาะปลูก** (ต้องล็อกอินจริง anonymous ใช้ไม่ได้)
- ตาราง: `farm_seasons` (รอบ) · `farm_categories` (หมวดที่ผู้ใช้เพิ่มเอง) · `farm_entries` (รายการ) — migration 029
- RLS เจ้าของเท่านั้นทุกการกระทำ **admin อ่านไม่ได้** ต่างจาก `analyses` เพราะเป็นข้อมูลการเงินส่วนตัว
- หมวดตายตัวอยู่ใน `src/lib/ledger/categories.ts` (ไม่ได้เก็บใน DB) หมวดที่ผู้ใช้เพิ่มเองต่อท้าย
- `farm_entries.category` เก็บเป็น **ข้อความ** ไม่ใช่ FK ตั้งใจให้รายการเก่าคงชื่อหมวดเดิมแม้หมวดถูกลบ
- เข้าจากเมนูฝั่งขวา (`bar.tsx` → `ledgerMenu`)

## หน้า `/analyze/form` — ลำดับขั้น
1. เลือกพืช · 2. ค่ามาตรฐานความเข้มข้นของธาตุอาหาร (ตารางอ้างอิง) · 3. การใช้ปุ๋ยตามค่าวิเคราะห์ดิน (ตารางอ้างอิง)
4. กรอกค่าวิเคราะห์ดิน · 5. เลือกปุ๋ย → กดคำนวณ → 6. ธาตุอาหารที่พืชต้องการ · 7. แผนใส่ปุ๋ยตามระยะ · 8. ปริมาณปุ๋ยจากสูตรที่เลือก

ขั้น 2-3 เป็นตารางอ้างอิงล้วน ๆ แสดงอย่างเดียว ไม่ผูกกับค่าดินที่กรอกและไม่มีผลต่อการคำนวณ · พืชที่ไม่มีตารางจะขึ้นขีด -
