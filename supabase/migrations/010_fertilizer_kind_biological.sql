-- 010_fertilizer_kind_biological.sql
-- เพิ่มประเภทปุ๋ย "ชีวภาพ" (biological) ในตาราง fertilizer_formulas
-- เดิมรองรับ chemical / organic -> เพิ่ม biological

alter table public.fertilizer_formulas
  drop constraint if exists fertilizer_formulas_kind_check;

alter table public.fertilizer_formulas
  add constraint fertilizer_formulas_kind_check
  check (kind in ('chemical', 'organic', 'biological'));
