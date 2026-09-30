-- 014_report_organic_accuracy.sql
-- รองรับ feedback รอบ TOR:
--   1) ข้อมูลเกษตรกร/พื้นที่ปลูก สำหรับหน้าพิมพ์รายงาน (analyses.farmer_name, address, ...)
--   2) รูปแบบปุ๋ยที่ใช้คำนวณ (ปุ๋ยเคมี / ปุ๋ยเคมีร่วมกับปุ๋ยอินทรีย์) + ผลคำนวณเก็บใน analysis_results.fertilizer_plan
--   3) ค่าผลแล็บ เทียบกับค่าที่โมเดลทำนาย (หน้า admin/accuracy)
--   4) สูตรปุ๋ยอินทรีย์ตั้งต้น (ค่าเฉลี่ยโดยประมาณ — ผู้ใช้กรอกค่าวิเคราะห์จริงแทนได้ที่หน้าคำนวณ)
--   5) เนื้อหาหน้าแรก (รายละเอียดโครงการ) แก้ได้จาก admin -> app_settings key 'home_content'

-- ---------------------------------------------------------------- analyses
alter table public.analyses add column if not exists farmer_name  text;
alter table public.analyses add column if not exists farmer_phone text;
alter table public.analyses add column if not exists address      text;
alter table public.analyses add column if not exists plot_name    text;
alter table public.analyses add column if not exists fert_mode    text;   -- 'chemical' | 'organic'
alter table public.analyses add column if not exists lab_om numeric;
alter table public.analyses add column if not exists lab_p  numeric;
alter table public.analyses add column if not exists lab_k  numeric;
alter table public.analyses add column if not exists lab_ph numeric;

-- ---------------------------------------------------------------- organic formulas
-- ปุ๋ยอินทรีย์ค่าธาตุอาหารแปรผันตามแหล่ง -> ค่าด้านล่างเป็นค่าตั้งต้นเท่านั้น
-- "ค่าตามตารางกรมพัฒนาที่ดิน" = อัตรา 1 กก. ปุ๋ยเคมี(46-0-0) : 230 กก. ปุ๋ยอินทรีย์ => N ~0.2%
insert into public.fertilizer_formulas (name, grade, n_percent, p2o5_percent, k2o_percent, kind, sort_order, notes) values
  ('ปุ๋ยอินทรีย์ (ค่าตามตารางกรมพัฒนาที่ดิน)', NULL, 0.2, 0, 0, 'organic', 500, 'เทียบอัตรา 1 กก. ยูเรีย : 230 กก. ปุ๋ยอินทรีย์'),
  ('ปุ๋ยหมัก (มาตรฐานขั้นต่ำ)',               NULL, 1.0, 0.5, 0.5, 'organic', 510, 'ค่าขั้นต่ำตามมาตรฐานปุ๋ยอินทรีย์ — ควรใช้ค่าวิเคราะห์จริง'),
  ('ปุ๋ยคอก (ทั่วไป)',                          NULL, 1.0, 0.5, 1.0, 'organic', 520, 'ค่าเฉลี่ยโดยประมาณ — ควรใช้ค่าวิเคราะห์จริง'),
  ('มูลไก่',                                   NULL, 2.0, 2.0, 1.5, 'organic', 530, 'ค่าเฉลี่ยโดยประมาณ — ควรใช้ค่าวิเคราะห์จริง'),
  ('มูลวัว',                                   NULL, 1.2, 0.6, 1.0, 'organic', 540, 'ค่าเฉลี่ยโดยประมาณ — ควรใช้ค่าวิเคราะห์จริง'),
  ('มูลสุกร',                                  NULL, 2.0, 2.0, 0.7, 'organic', 550, 'ค่าเฉลี่ยโดยประมาณ — ควรใช้ค่าวิเคราะห์จริง'),
  ('มูลค้างคาว',                               NULL, 2.0, 6.0, 1.0, 'organic', 560, 'ค่าเฉลี่ยโดยประมาณ — ควรใช้ค่าวิเคราะห์จริง')
on conflict do nothing;

-- ---------------------------------------------------------------- home content
insert into public.app_settings (key, value) values
  ('home_content', 'null'::jsonb)
on conflict (key) do nothing;
