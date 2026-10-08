-- 040_analysis_ai_result.sql
-- เก็บผลจากระบบทำนายค่า OM/P/K จากภาพแผ่นทดสอบ (แบบจำลองของทีม AI)
--
-- om_value / p_value / k_value ของ analyses = ค่าที่ใช้คำนวณปุ๋ย (ผู้ใช้แก้ได้ในหน้าคำนวณ)
-- ai_result = สิ่งที่แบบจำลองตอบมาตอนทำนาย เก็บแยกไว้ไม่ให้หายเมื่อผู้ใช้แก้ค่า
--   ใช้ดูย้อนหลังว่าค่ามาจากแบบจำลองรุ่นไหน และส่งให้ทีม AI เทียบ/ปรับแบบจำลองได้
--
-- รูปแบบ: { "om_value": 2.1, "p_value": 18.4, "k_value": null,
--           "model_version": "...", "request_id": "...",
--           "images": ["OM", "P"], "predicted_at": "2026-10-07T08:00:00.000Z" }
-- null = ยังไม่เคยทำนาย (รายการกรอกค่าเอง หรือรูปยังไม่ผ่านการตรวจ)
--
-- สิทธิ์: ใช้ policy เดิมของ analyses (เจ้าของอ่าน/แก้ของตัวเอง แอดมินอ่านได้ทั้งหมด)

alter table public.analyses add column if not exists ai_result jsonb;

comment on column public.analyses.ai_result is
  'ผลดิบจากแบบจำลองทำนายภาพแผ่นทดสอบ (om/p/k_value, model_version, request_id, images, predicted_at) — null = ไม่ได้ทำนาย';
