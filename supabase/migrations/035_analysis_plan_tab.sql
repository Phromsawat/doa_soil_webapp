-- 035_analysis_plan_tab.sql
-- แถบแผนปุ๋ยที่ผู้ใช้เลือกไว้ตอนบันทึกผล (ปุ๋ยเคมี / ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์)
--
-- เดิมไม่ได้เก็บ — เปิดผลที่บันทึกแล้วหน้าผลกลับไปแถบ "ปุ๋ยเคมี" เสมอ
-- รายงาน PDF ที่ออกจากหน้าผลจึงเป็นปุ๋ยเคมี ทั้งที่ตอนบันทึกเลือกปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์
--
-- ค่าตั้งต้น 'chemical' = แถวเก่าทั้งหมดและการนำเข้าไฟล์ทำงานเหมือนเดิม
-- สิทธิ์: ใช้ policy เดิมของ analyses (เจ้าของแถว/แอดมิน) ไม่ต้องเพิ่ม

alter table public.analyses
  add column if not exists plan_tab text not null default 'chemical'
  check (plan_tab in ('chemical', 'organic70'));

comment on column public.analyses.plan_tab is
  'แถบแผนปุ๋ยที่เลือกตอนบันทึก: chemical = ปุ๋ยเคมี, organic70 = ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์';
