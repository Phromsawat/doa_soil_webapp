-- 041_soil_images_original.sql
-- ทำนายจากรูปต้นฉบับ แต่เก็บไว้แค่สำเนาย่อ
--
-- ===== ทำไม =====
-- แบบจำลองอ่านค่าจาก "สี" ของช่องทดสอบ การย่อรูปในเบราว์เซอร์ทำให้ไฟล์ถูกบีบอัดใหม่และแปลงสี
-- (เช่นรูป Display P3 ของ iPhone → sRGB) ค่าที่ทำนายอาจต่างจากเว็บทำนายของทีม AI ทั้งที่เป็นรูปเดียวกัน
-- จึงส่งต้นฉบับให้แบบจำลอง (≤ 12 MiB เท่าขีดจำกัดของ API) แล้วลบต้นฉบับทิ้งเมื่อทำนายสำเร็จ
-- ที่เก็บถาวรมีแค่สำเนาย่อ 1280 px (~100–200 KB) สำหรับแสดงในประวัติ/หน้าแอดมิน
--
-- เบราว์เซอร์อัปโหลดตรงเข้า Storage ด้วย signed upload URL ที่ server ออกให้
-- (ไม่ผ่าน Vercel ซึ่งรับ body ได้แค่ 4.5 MB ต่อคำขอ)
--
-- path: {user_id}/{analysis_id}/{OM|P|K}-<ver>.jpg            ← สำเนาย่อ (analysis_images.storage_path)
--       {user_id}/{analysis_id}/original/{OM|P|K}-<ver>.{ext}  ← ต้นฉบับชั่วคราว (analysis_images.original_path)
--       <ver> = รหัสเวลา ชื่อใหม่ทุกครั้ง (เขียนทับชื่อเดิมแล้ว CDN ส่งไฟล์เก่ามา)
-- policy เดิมของ bucket (034) ใช้โฟลเดอร์ชั้นแรก = uid จึงครอบคลุมโฟลเดอร์ original/ ด้วย

-- ---------------------------------------------------------------- bucket
-- 5 MB → 12 MiB (12 × 1024 × 1024) เท่า API แบบจำลอง
update storage.buckets
   set file_size_limit = 12582912
 where id = 'soil-images';

-- ---------------------------------------------------------------- analysis_images
alter table public.analysis_images add column if not exists original_path text;

comment on column public.analysis_images.original_path is
  'รูปต้นฉบับที่รอส่งให้แบบจำลอง — ลบไฟล์และตั้งเป็น null เมื่อทำนายสำเร็จ';

-- เดิมไม่มี policy UPDATE: upsert รูปธาตุเดิมซ้ำ (เปลี่ยนรูปที่ไม่ผ่านการตรวจ) จึงถูกปฏิเสธ
-- และล้าง original_path หลังทำนายไม่ได้ — เปิดเฉพาะเจ้าของรายการ ทั้ง using และ with check
drop policy if exists "images: own update" on public.analysis_images;
create policy "images: own update" on public.analysis_images for update
  using (exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()));
