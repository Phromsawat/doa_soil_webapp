-- 045_fix_fruit_fertilizer_ranges.sql
-- แก้ข้อมูลไม้ผลตามผลตรวจเว็บแอปของกรมฯ (เทียบกับเอกสาร "คำแนะนำการใช้ปุ๋ยสำหรับไม้ผล" 16.10.66)
--
-- ตรวจแล้ว: แผนปุ๋ยเคมี (straight) ทุกช่องของไม้ผล 9 ชนิด ตรงกับ "ตารางการผสมปุ๋ยใช้เอง" ในเอกสาร
-- ปัญหาอยู่ที่ตัวเลขที่เอกสารพิมพ์ผิด กับขอบช่วงค่าดินที่แต่ละตารางเขียนไม่ตรงกัน
--
-- ใช้คู่กับโค้ดที่จับช่วงด้วยลำดับช่วงของตารางคำแนะนำ (src/lib/fertilizer/soilBands.ts)
-- รันซ้ำได้ — ทุกคำสั่งเลือกเฉพาะค่าเดิมที่ยังไม่ได้แก้

-- ---------------------------------------------------------------- 1. ทุเรียน 3,000 -> 300
-- ตารางที่ 5 แถว 9, 12, 15, 18, 21 (K >100) ระยะบำรุงผล 0-0-60 พิมพ์ 3,000
-- แถวอื่นที่ K >100 เป็น 300 และธาตุ K รวมทั้งปีควรได้ 400 กรัม K2O — 3,000 ทำให้ได้ 1,750
update public.crop_fertilizer_plan p
   set amount = 300
  from public.crops c
 where p.crop_id = c.id and c.name = 'ทุเรียน'
   and p.use_type = 'straight' and p.grade = '0-0-60' and p.stage_order = 3
   and p.k_min = 100 and p.k_max is null and p.amount = 3000;

-- ---------------------------------------------------------------- 2. K ช่วงกลาง 51-100 -> 50-100
-- เอกสารเขียน <50 กับ 51-100 ในบางตาราง ค่า K = 50 จึงไม่อยู่ช่วงใดเลย
-- (เงาะ K 50: ไม่แสดงธาตุอาหารที่พืชต้องการ และแผนเคมีร่วมกับอินทรีย์)
-- ใช้ 50-100 แบบตารางคำแนะนำของไม้ผลชนิดอื่น
update public.fertilizer_recommendations r
   set k_min = 50
  from public.crops c
 where r.crop_id = c.id and c.name = 'เงาะ' and r.k_min = 51 and r.k_max = 100;

update public.crop_fertilizer_plan p
   set k_min = 50
  from public.crops c
 where p.crop_id = c.id
   and c.name in ('ทุเรียน', 'มังคุด', 'เงาะ', 'มะม่วง', 'ลำไย', 'ลิ้นจี่', 'ส้ม', 'มะพร้าว')
   and p.k_min = 51 and p.k_max = 100;

-- ---------------------------------------------------------------- 3. มะม่วง มะพร้าว: OM ของแผนปุ๋ยเคมี
-- เอกสารใช้ <1.5 / 1.5-2.5 / >2.5 ทั้งตารางคำแนะนำและตารางผสมปุ๋ย แต่ข้อมูลที่นำเข้าเป็น 2 / 3
-- ค่า OM 1.5-<2 และ 2.5-3 จึงได้ 46-0-0 ของอีกช่วง
update public.crop_fertilizer_plan p
   set om_min = case p.om_min when 2 then 1.5 when 3 then 2.5 else p.om_min end,
       om_max = case p.om_max when 2 then 1.5 when 3 then 2.5 else p.om_max end
  from public.crops c
 where p.crop_id = c.id and c.name in ('มะม่วง', 'มะพร้าว') and p.use_type = 'straight'
   and (p.om_min in (2, 3) or p.om_max in (2, 3));

-- ---------------------------------------------------------------- 4. ลำไย ลิ้นจี่ ส้ม: OM ของตารางคำแนะนำ
-- เอกสารขัดกันเอง: ตารางการใช้ปุ๋ยตามค่าวิเคราะห์ดิน <1.5 / 1.5-2.5 / >2.5
--                  ตารางการผสมปุ๋ยใช้เอง            <2 / 2-3 / >3
-- ผู้ตรวจแจ้งว่าธาตุอาหารที่พืชต้องการผิดที่ OM 1.5-<2 และ 2.51-3 -> ใช้ <2 / 2-3 / >3 ตามตารางผสมปุ๋ย
-- อัตรา N แต่ละระดับคงเดิม (เปลี่ยนแค่ขอบช่วง)
update public.fertilizer_recommendations r
   set om_min = case r.om_min when 0 then 0 when 1.5 then 2 when 2.501 then 3.001 end,
       om_max = case r.om_min when 0 then 1.999 when 1.5 then 3 when 2.501 then 1000000 end
  from public.crops c
 where r.crop_id = c.id and c.name in ('ลำไย', 'ลิ้นจี่', 'ส้ม')
   and ((r.om_min = 0 and r.om_max = 1.499) or (r.om_min = 1.5 and r.om_max = 2.5) or r.om_min = 2.501);

-- ---------------------------------------------------------------- 5. สับปะรด: หน่วยของแผนเคมีร่วมกับอินทรีย์
-- ตัวเลขเป็นอัตราต่อไร่ (แผนปุ๋ยเคมีของสับปะรดเป็น กก./ไร่) แต่นำเข้ามาเป็น กรัม/ต้น และ กก./ต้น
update public.crop_fertilizer_plan p
   set unit = 'กก./ไร่'
  from public.crops c
 where p.crop_id = c.id and c.name = 'สับปะรด' and p.use_type = 'organic70'
   and p.unit in ('กรัม/ต้น', 'กก./ต้น');

-- ---------------------------------------------------------------- ตรวจหลังรัน (ไม่บังคับ)
-- ทุกแถวควรได้ 0:
--   select count(*) from public.crop_fertilizer_plan where amount = 3000 and grade = '0-0-60';
--   select count(*) from public.crop_fertilizer_plan where k_min = 51;
--   select count(*) from public.fertilizer_recommendations where k_min = 51;
