# รันแบบ local (ไม่ต้องมี Supabase)

ถ้าไม่มี `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
แอปจะเข้า **local mode** อัตโนมัติ:

- ข้อมูลอ่านจาก `local-db/seed.json` (สร้างจาก `supabase/migrations/*.sql`)
- ข้อมูลที่แก้/บันทึก เก็บที่ `local-db/db.json` (ลบไฟล์นี้ = รีเซ็ตกลับเป็นค่าตั้งต้น)
- ล็อกอินเป็น "ผู้ดูแลระบบ (local)" ให้อัตโนมัติ — เข้า `/admin` ได้เลย
- รูปที่อัปโหลด (Storage) เก็บในหน่วยความจำ หายเมื่อรีสตาร์ท

```bash
npm install
npm run local:db     # สร้าง local-db/seed.json ใหม่ (ทำเมื่อ migration เปลี่ยน)
npm run dev          # http://localhost:3000
```

ใส่ `.env.local` เมื่อไร แอปกลับไปใช้ Supabase ตามเดิม
(ต้องรัน `supabase/migrations/014_report_organic_accuracy.sql` ก่อน — เพิ่มคอลัมน์ข้อมูลเกษตรกร/ผลแล็บ + สูตรปุ๋ยอินทรีย์)

## หน้าที่เพิ่ม/เปลี่ยน (feedback TOR)

| หน้า | สิ่งที่เปลี่ยน |
|---|---|
| `/analyze/form` | ลำดับใหม่: ① ค่าดิน (+ดึงจากแผนที่, ค่ามาตรฐานซ่อนได้, คำแนะนำ pH) ② พืช ③ ปุ๋ยเคมี / ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์ ④ สูตรปุ๋ย (+ดูสูตรปุ๋ยทั้งหมด) ⑤ ข้อมูลเกษตรกร/พื้นที่ปลูก |
| `/analyze/report` | หน้าพิมพ์รายงาน A4 (ใช้ `?id=` เปิดรายการที่บันทึกแล้ว) |
| `/admin/analyses` | Export CSV ทั้งหมด + ปุ่มดูตัวอย่าง/พิมพ์รายงานแต่ละรายการ |
| `/admin/accuracy` | เทียบค่าโมเดลกับผลแล็บ (MAE, RMSE, R², MAPE, ระดับตรงกัน) |
| `/admin/settings` | แก้เนื้อหาหน้าแรก (รายละเอียดโครงการ/ติดต่อ) |
| `/admin/crops/[id]` | อัปโหลดรูปพืชแทนไอคอน |

การคำนวณปุ๋ย: `src/lib/fertilizer/stagePlan.ts` (สูตรตาม Excel กรมพัฒนาที่ดิน — สูตรเดียวกันได้ผลเท่ากันทุกโหมด)
