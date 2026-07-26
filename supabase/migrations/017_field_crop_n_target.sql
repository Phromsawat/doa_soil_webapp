-- 017_field_crop_n_target.sql
-- เติมค่า "อัตราแนะนำ N" ที่ตกหล่นในช่วงอินทรียวัตถุต่ำสุด (OM band ล่างสุด) ของพืชไร่ 5 ชนิด
--
-- ปัญหา: fertilizer_recommendations เก็บ target N แยกตาม OM band (P/K แยกตาม band ตัวเอง)
--   แต่ band OM ต่ำสุดของ 5 พืชนี้ target_n = NULL -> step 4 โชว์ "—" และ solver (step 6) เพี้ยน
--   (คิดว่าไม่ต้องใส่ N เลย ทั้งที่ตารางแม่ปุ๋ยแนะนำ 46-0-0 อยู่)
--
-- ที่มาค่า: ไฟล์ "6.ขัอมูลคำแนะนำการให้ปุ๋ยพืชไร่ 100_.xlsx" คอลัมน์ "อัตราแนะนำ N (กรัม/ต้น/ปี)"
--   = ค่าจริงของกรมวิชาการเกษตร (ไม่ใช่ค่าประมาณ) — band บน ๆ ใน DB ตรงกับไฟล์นี้อยู่แล้ว
--   OM<1 ต่ำ = อินทรียวัตถุน้อย -> ต้องใส่ N มากที่สุด (สอดคล้องกับตารางแม่ปุ๋ย)
--
-- อัปเดตเฉพาะแถว OM-band (p/k เป็น null) ที่ target_n ยังว่าง — idempotent, ไม่แตะแถวอื่น

-- ข้าวโพดฝักสด : OM<1 -> N=30
update public.fertilizer_recommendations set target_n = 30, updated_at = now()
where crop_id = '08cbea3a-9f7f-4e11-8041-ae4217ca304a'
  and mode = '100%' and om_min = 0 and p_min is null and k_min is null and target_n is null;

-- ข้าวโพดเลี้ยงสัตว์ : OM<1 -> N=15
update public.fertilizer_recommendations set target_n = 15, updated_at = now()
where crop_id = '866e24ae-eb11-4ca4-a902-edc63606bbb1'
  and mode = '100%' and om_min = 0 and p_min is null and k_min is null and target_n is null;

-- อ้อยปลูก : OM<0.75 -> N=27
update public.fertilizer_recommendations set target_n = 27, updated_at = now()
where crop_id = 'aef23f9b-5d26-41e0-a56c-a5ded89c4d1a'
  and mode = '100%' and om_min = 0 and p_min is null and k_min is null and target_n is null;

-- อ้อยตอ : OM<0.75 -> N=27
update public.fertilizer_recommendations set target_n = 27, updated_at = now()
where crop_id = 'f1eee6e4-9b7e-4a98-84e5-f92a63748f98'
  and mode = '100%' and om_min = 0 and p_min is null and k_min is null and target_n is null;

-- มันสำปะหลัง : OM<0.6 -> N=16
update public.fertilizer_recommendations set target_n = 16, updated_at = now()
where crop_id = '1f655b9e-d459-49a8-b8c1-0530ea285371'
  and mode = '100%' and om_min = 0 and p_min is null and k_min is null and target_n is null;
