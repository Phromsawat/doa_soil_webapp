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
`src/types/index.ts` — `SoilAnalysis` มี optional fields:
- `nImage?`, `pImage?`, `kImage?` — base64/URL สำหรับรูปผลทำนาย

## Components เพิ่มเติม
- `src/app/analyze/result/MapPreview.tsx` — Leaflet read-only map สำหรับแสดงพิกัดในหน้า result
