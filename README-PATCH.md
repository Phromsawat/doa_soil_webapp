# Patch — Fertilizer Calc + UI ที่แก้ไขในเซสชันนี้

## ไฟล์จำเป็นสำหรับการคำนวณ
- `src/app/analyze/fertilizer/page.tsx` — หน้า UI + logic คำนวณสูตรปุ๋ยไม้ผล
- `src/lib/fruit_fertilizer.json` — ตารางคำนวณ LDD (9 ไม้ผล × 27 combos)

## ไฟล์หน้าเว็บอื่นที่ปรับ (เพื่อให้ flow ครบ)
- `src/app/analyze/page.tsx` — หน้าเลือกวิธี (มีการ์ด "คำนวณสูตรปุ๋ย" เชื่อมไป /analyze/fertilizer)
- `src/components/layout/bar.tsx` — top bar dropdown เชื่อม upload / form / fertilizer + title

## ไฟล์เสริม (reproducibility / docs)
- `scripts/extract_fruit_fertilizer.py` — script สกัด Excel → JSON
- `docs/references/README.md` — อธิบายที่มาข้อมูล
- `docs/references/100__ตารางคำนวณปุ๋ยสำหรับ KM ไม้ผล_04.08.2569.xlsx` — Excel ต้นฉบับ (LDD)

## Dependencies
ไม่ต้อง npm install เพิ่ม — ใช้แค่ React (มีอยู่แล้ว) + import JSON (Next.js เปิด `resolveJsonModule: true` มาตรฐาน)

## Path alias
หน้า page.tsx ใช้ `import FRUIT_DATA from "@/lib/fruit_fertilizer.json"` ต้องมี alias `@/*` → `./src/*` (Next.js สร้างให้อัตโนมัติใน tsconfig.json)

## วิธี merge
1. copy folder ทั้งหมดใน zip ไปทับ repo เดิม (โครงสร้าง path ตรงกัน)
2. ตรวจ diff ก่อนถ้ากลัวทับงาน (ไฟล์ page.tsx / bar.tsx / analyze/page.tsx จะถูกทับ)
3. commit + push
