-- 026_page_images_bucket.sql
-- ที่เก็บรูปสำหรับเนื้อหาหน้าข้อมูล (ใช้กับตัวแก้ไขที่ /admin/content)
--
-- เดิมแอดมินต้องพิมพ์ path ของรูปที่มีอยู่แล้วในโค้ด (public/img/...) จะเพิ่มรูปใหม่
-- ต้องให้คนเขียนโค้ดใส่ไฟล์แล้ว deploy ใหม่ — bucket นี้ทำให้อัปโหลดเองได้จากหน้าเว็บ
--
-- public = true เพราะรูปในหน้าข้อมูลเปิดให้ทุกคนดูอยู่แล้ว (อ่านผ่าน URL ตรง ๆ ได้)
-- แต่การ "อัปโหลด/ลบ" จำกัดเฉพาะ admin ผ่าน policy ด้านล่าง

insert into storage.buckets (id, name, public)
values ('page-images', 'page-images', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------- policies
-- storage.objects เปิด RLS มาให้อยู่แล้วโดย Supabase

drop policy if exists "page-images: public read" on storage.objects;
create policy "page-images: public read"
  on storage.objects for select
  using (bucket_id = 'page-images');

drop policy if exists "page-images: admin upload" on storage.objects;
create policy "page-images: admin upload"
  on storage.objects for insert
  with check (bucket_id = 'page-images' and public.is_admin());

drop policy if exists "page-images: admin update" on storage.objects;
create policy "page-images: admin update"
  on storage.objects for update
  using (bucket_id = 'page-images' and public.is_admin());

drop policy if exists "page-images: admin delete" on storage.objects;
create policy "page-images: admin delete"
  on storage.objects for delete
  using (bucket_id = 'page-images' and public.is_admin());
