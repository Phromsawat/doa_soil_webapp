-- 039_crop_images.sql
-- รูปพืชและรูปประเภทพืชที่แอดมินอัปโหลดเองได้ (หน้า /admin/crops)
--
-- - crops.image_url มีอยู่แล้วตั้งแต่ 001 แต่ยังไม่เคยใช้ — เพิ่มคอลัมน์เดียวกันให้ crop_types
-- - ไฟล์เก็บใน bucket page-images โฟลเดอร์ crops/ (bucket เปิดอ่านสาธารณะอยู่แล้ว)
-- - ถ้ายังไม่อัปโหลด (null) หน้าเว็บใช้ไอคอน SVG เดิมในโค้ด
--
-- สิทธิ์: แอดมิน (is_admin) ทำได้อยู่แล้วตาม policy เดิม
-- เพิ่มให้บทบาทที่มีสิทธิ์ "แก้ไข" เมนูพืช (has_permission('crops','edit')) ด้วย
-- แต่จำกัดเฉพาะโฟลเดอร์ crops/ และแก้ crop_types ได้เฉพาะ update

alter table public.crop_types add column if not exists image_url text;

-- crop_types: เดิมเขียนได้เฉพาะแอดมิน ("crop_types: admin write")
drop policy if exists "crop_types: write edit" on public.crop_types;
create policy "crop_types: write edit" on public.crop_types for update
  using (public.is_admin() or public.has_permission('crops', 'edit'));

-- storage: อัปโหลด/ลบรูปในโฟลเดอร์ crops/ ของ page-images
drop policy if exists "page-images: crops upload" on storage.objects;
create policy "page-images: crops upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'page-images'
    and (storage.foldername(name))[1] = 'crops'
    and public.has_permission('crops', 'edit')
  );

drop policy if exists "page-images: crops delete" on storage.objects;
create policy "page-images: crops delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'page-images'
    and (storage.foldername(name))[1] = 'crops'
    and public.has_permission('crops', 'edit')
  );
