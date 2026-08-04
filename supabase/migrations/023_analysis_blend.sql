-- 023_analysis_blend.sql
-- เก็บ "ปุ๋ยที่ผู้ใช้เลือก" ในขั้นที่ 2 (solver) ต่อการวิเคราะห์ 1 ครั้ง
-- เพื่อให้เปิดดูผลย้อนหลัง (history / dashboard) แล้วเห็นปุ๋ยที่เคยเลือกไว้เหมือนเดิม
--
-- เก็บเป็น array ของ fertilizer_formulas.id (สูงสุด 3 สูตร) — ตัวเลข "ต้องใช้กี่กรัม"
-- คำนวณใหม่ตอนแสดงผลจาก target N-P2O5-K2O + เปอร์เซ็นต์ของสูตร (ไม่ snapshot ค่า)
-- ใช้ RLS/grant เดิมของตาราง analyses (เจ้าของแก้ของตัวเองได้) — ไม่ต้องเพิ่ม policy

alter table public.analyses
  add column if not exists blend_formula_ids uuid[] not null default '{}';

comment on column public.analyses.blend_formula_ids is
  'สูตรปุ๋ยที่ผู้ใช้เลือกในขั้นที่ 2 (solver) — อ้างอิง fertilizer_formulas.id สูงสุด 3 รายการ';
