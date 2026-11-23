-- 048_asparagus_rest_stage_organic.sql
-- หน่อไม้ฝรั่ง แผน "ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์" (organic70) ระยะพักต้นครั้งที่ 2
--   047 ใช้ 0-0-60 25 กก./ไร่ ตามตารางปุ๋ยเคมี — เปลี่ยนเป็น 46-0-0 25 กก./ไร่ ตามไฟล์
--   "คำนวนปุ๋ยพืชไร่และผัก ไม่ตามกรม 20.11.69_.xlsx" (ผู้ใช้ให้ยึดไฟล์นี้)
--   ตรงกับหมายเหตุของพืช: ระยะพักต้น "แบ่งใส่ปุ๋ยที่ให้ธาตุอาหารไนโตรเจน 2 ครั้ง"
-- แถบปุ๋ยเคมี (straight) ไม่เปลี่ยน
-- รันซ้ำได้

update public.crop_fertilizer_plan p
   set grade = '46-0-0'
  from public.crops c
 where p.crop_id = c.id and trim(c.name) = 'หน่อไม้ฝรั่ง'
   and p.use_type = 'organic70' and p.stage_order = 5 and p.grade = '0-0-60';
