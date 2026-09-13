-- 034_soil_images_bucket.sql
-- ย้าย bucket "soil-images" กับ policy ของมันเข้ามาอยู่ในโค้ด + เพิ่ม policy UPDATE ที่ขาดไป
--
-- ===== ทำไมต้องมีไฟล์นี้ =====
-- bucket นี้ถูกสร้างจากหน้า dashboard ตั้งแต่ 21 มิ.ย. 2569 policy จึงไม่เคยอยู่ใน migration เลย
-- ถ้าตั้งฐานข้อมูลใหม่จากไฟล์ migration จะได้ระบบที่อัปโหลดรูปไม่ได้ และที่แย่กว่านั้นคือ
-- ถ้าเผลอสร้าง bucket โดยไม่มี policy รูปของผู้ใช้จะไม่มีอะไรกั้นเลย
--
-- เงื่อนไขด้านล่างคัดลอกมาจาก pg_policies ของจริง และทดสอบยืนยันพฤติกรรมแล้วว่า
-- ผู้ใช้ A เปิด/ลบ/เขียนทับไฟล์ของผู้ใช้ B ไม่ได้ และคนที่ไม่ล็อกอินเปิด URL ตรง ๆ ไม่ได้
--
-- ===== บั๊กที่ไฟล์นี้แก้ =====
-- เดิมมี policy แค่ SELECT / INSERT / DELETE ไม่มี UPDATE
-- แต่ uploadAnalysisImage() เรียก .upload(..., { upsert: true }) และ path ของไฟล์
-- คงที่เสมอ ({user_id}/{analysis_id}/{nutrient_code}.{ext})
-- => การอัปโหลดครั้งที่สองที่ path เดิมคือ UPDATE ซึ่งไม่มี policy รองรับ จึงถูกปฏิเสธ
-- ผลคือ "ถ่ายรูปใหม่ทับรูปเดิม" พัง และถ้าอัปโหลดล้มกลางคัน กดส่งซ้ำก็จะพังถาวร
-- เพราะไฟล์ที่ขึ้นไปแล้วรอบแรกกลายเป็นตัวขวางเอง
-- ทดสอบแล้ว: ครั้งแรก OK / ครั้งที่สอง "new row violates row-level security policy"

-- ---------------------------------------------------------------- bucket
-- private + จำกัด 5 MB + รับเฉพาะรูป (ตรงกับที่ตั้งไว้ใน dashboard)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('soil-images', 'soil-images', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------- policies
-- แยกผู้ใช้ด้วยชื่อโฟลเดอร์ชั้นแรกของ path = uid ของเจ้าของ
-- storage.foldername('<uid>/<analysis>/n.png') -> {'<uid>','<analysis>'} จึงเอา [1] มาเทียบ

drop policy if exists "Users read own files" on storage.objects;
create policy "Users read own files"
  on storage.objects for select
  using (
    bucket_id = 'soil-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "Users upload to own folder" on storage.objects;
create policy "Users upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'soil-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- ใหม่: ที่ขาดไป — ทำให้ upsert (ถ่ายรูปใหม่ทับ / กดส่งซ้ำ) ทำงานได้
-- ต้องมีทั้ง using และ with check: using คุมว่าแก้ไฟล์ไหนได้ with check คุมว่าแก้แล้วยังต้องอยู่ในโฟลเดอร์ตัวเอง
-- (ถ้าใส่แต่ using จะกลายเป็นช่องให้ย้ายไฟล์ไปโฟลเดอร์คนอื่นได้)
drop policy if exists "Users update own files" on storage.objects;
create policy "Users update own files"
  on storage.objects for update
  using (
    bucket_id = 'soil-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id = 'soil-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "Users delete own files" on storage.objects;
create policy "Users delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'soil-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- หมายเหตุ: จงใจไม่เปิดให้แอดมินอ่าน/ลบ soil-images ผ่าน RLS
-- หน้าแอดมินดูรูปผ่าน signed URL ที่บันทึกไว้ใน analysis_images.public_url อยู่แล้ว
-- ส่วนการลบไฟล์ของผู้ใช้คนอื่น ให้ฝั่งเซิร์ฟเวอร์ใช้ service_role (ข้าม RLS) แทน
-- เหมือนที่ adminDeleteUser() ทำ — ดู adminDeleteAnalysis() ที่ยังใช้ client ของผู้ใช้อยู่
