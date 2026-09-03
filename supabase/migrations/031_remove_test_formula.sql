-- 031_remove_test_formula.sql
-- ลบสูตรปุ๋ยทดสอบที่หลุดขึ้น production
--
-- แถวชื่อ "test1" เกรด 0-0-40 (id eb5e6703-0905-4315-a59c-32283a7b9a09)
-- is_active = true อยู่ จึงโผล่ในรายการให้เกษตรกรเลือกในหน้าคำนวณปุ๋ยจริง
--
-- ปลอดภัยที่จะลบ: analyses.blend_formula_ids เป็น uuid[] เปล่า ๆ ไม่มี foreign key
-- และหน้าผลวิเคราะห์ map id -> สูตร แล้ว filter ตัวที่หาไม่เจอทิ้ง (result/page.tsx)
-- ประวัติเก่าที่เผลอเลือกสูตรนี้ไว้จึงแค่ไม่แสดงสูตรนั้น ไม่พัง
-- (อนึ่ง listFertilizerFormulas() กรอง is_active อยู่แล้ว การปิดใช้งานกับการลบ
--  จึงให้ผลกับประวัติเก่าเหมือนกันทุกประการ)

delete from public.fertilizer_formulas
where name = 'test1'
  and grade = '0-0-40';

-- ตรวจหลังรัน — ควรได้ 0 แถว และ count รวมลดจาก 20 เหลือ 19
-- select count(*) from public.fertilizer_formulas where name = 'test1';
