-- 046_fix_pineapple_organic_and_splits.sql
-- 1. สับปะรด: ปุ๋ยอินทรีย์ใส่ครั้งที่ 2 ของแผน "ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์"
--    ไฟล์คำนวณต้นทาง (5.คำนวนค่าปุ๋ยอินทรีย์ 30%) อ้างคอลัมน์ผิด: ครั้งที่ 2 คิดจาก 18-46-0 ครั้งที่ 1
--    วิธีของกรมฯ (ทุกพืชและครั้งที่ 1 ของสับปะรด) คือ ปุ๋ยอินทรีย์ = 21-0-0 ที่ลดลง x 105 กก.
--    (46-0-0 ใช้ x 230 — ค่าเดียวกันคิดตาม N: 1 กก. N ใช้ปุ๋ยอินทรีย์ 500 กก.)
--    จึงคิดใหม่จาก 21-0-0 ครั้งที่ 2 (เต็มอัตราตามเอกสาร - อัตรา 70% ที่มีอยู่) แล้วปัดตามสูตรเดิมของไฟล์
--    เปลี่ยน 24 จาก 27 ช่วงดิน
-- 2. สัดส่วนการแบ่งใส่ (crop_stage_split) ที่รวมไม่ครบ 100% — ใช้ตอนผู้ใช้เลือกปุ๋ยสูตรที่ไม่มีในตารางกรมฯ
--    มะพร้าว เดิม N 33/33, P 33/33, K 60/60 -> 50/50 ทุกธาตุ (เอกสาร: แบ่งใส่ 2 ครั้ง ต้นและปลายฤดูฝน)
--    สับปะรด เดิม P 50/0 -> 100/0 (เอกสาร: ฟอสฟอรัสใส่ครั้งที่ 1), N และ K เป็น 50/50
-- รันซ้ำได้

-- ---------------------------------------------------------------- 1
delete from public.crop_fertilizer_plan p
 using public.crops c
 where p.crop_id = c.id and c.name = 'สับปะรด' and p.use_type = 'organic70'
   and p.stage_order = 2 and p.grade = 'ปุ๋ยอินทรีย์';

insert into public.crop_fertilizer_plan
  (crop_id, use_type, om_min, om_max, p_min, p_max, k_min, k_max, stage, stage_order, grade, amount, unit)
select c.id, 'organic70', v.om_min::numeric, v.om_max::numeric, v.p_min::numeric, v.p_max::numeric,
       v.k_min::numeric, v.k_max::numeric,
       'ครั้งที่ 2 (หลังปลูก 5-6 เดือนหรือ หลังเกิดหน่อดิน 4 เดือน)', 2, 'ปุ๋ยอินทรีย์', v.amount, 'กก./ไร่'
  from public.crops c
  cross join (values
  (NULL, 1.5, NULL, 6, NULL, 35, 10500),
  (NULL, 1.5, NULL, 6, 35, 140, 10500),
  (NULL, 1.5, NULL, 6, 140, NULL, 10500),
  (NULL, 1.5, 6, 45, NULL, 35, 10500),
  (NULL, 1.5, 6, 45, 35, 140, 10500),
  (NULL, 1.5, 6, 45, 140, NULL, 10500),
  (NULL, 1.5, 45, NULL, NULL, 35, 10500),
  (NULL, 1.5, 45, NULL, 35, 140, 10500),
  (NULL, 1.5, 45, NULL, 140, NULL, 10500),
  (1.5, 2.5, NULL, 6, NULL, 35, 2100),
  (1.5, 2.5, NULL, 6, 35, 140, 2100),
  (1.5, 2.5, NULL, 6, 140, NULL, 2100),
  (1.5, 2.5, 6, 45, NULL, 35, 2100),
  (1.5, 2.5, 6, 45, 35, 140, 2100),
  (1.5, 2.5, 6, 45, 140, NULL, 2100),
  (1.5, 2.5, 45, NULL, NULL, 35, 2100),
  (1.5, 2.5, 45, NULL, 35, 140, 2100),
  (1.5, 2.5, 45, NULL, 140, NULL, 2100),
  (2.5, NULL, NULL, 6, NULL, 35, 6300),
  (2.5, NULL, NULL, 6, 35, 140, 6300),
  (2.5, NULL, NULL, 6, 140, NULL, 6300),
  (2.5, NULL, 6, 45, NULL, 35, 6300),
  (2.5, NULL, 6, 45, 35, 140, 6300),
  (2.5, NULL, 6, 45, 140, NULL, 6300),
  (2.5, NULL, 45, NULL, NULL, 35, 6300),
  (2.5, NULL, 45, NULL, 35, 140, 6300),
  (2.5, NULL, 45, NULL, 140, NULL, 6300)
  ) as v(om_min, om_max, p_min, p_max, k_min, k_max, amount)
 where c.name = 'สับปะรด';

-- ---------------------------------------------------------------- 2
update public.crop_stage_split s
   set n_frac = 0.5, p_frac = 0.5, k_frac = 0.5
  from public.crops c
 where s.crop_id = c.id and c.name = 'มะพร้าว';

update public.crop_stage_split s
   set n_frac = 0.5,
       p_frac = case s.stage_order when 1 then 1 else 0 end,
       k_frac = 0.5
  from public.crops c
 where s.crop_id = c.id and c.name = 'สับปะรด';
