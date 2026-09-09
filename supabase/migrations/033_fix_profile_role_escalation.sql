-- 033_fix_profile_role_escalation.sql
-- ปิดช่องยกระดับสิทธิ์ (privilege escalation) บนตาราง profiles
--
-- ===== ช่องโหว่ที่พบ (ทดสอบกับฐานข้อมูลจริงแล้ว) =====
-- policy เดิม "profiles: self update" เป็น  for update using (auth.uid() = id)
-- UPDATE ที่มีแต่ USING ไม่มี WITH CHECK -> Postgres เอา USING มาเป็น WITH CHECK ด้วย
-- ซึ่งคุมได้แค่ "แถวไหน" (id ของตัวเอง) แต่ "ไม่คุมว่าคอลัมน์ไหนแก้ได้"
-- ผู้ใช้คนใดก็ได้ (แม้บัญชีชั่วคราว anonymous) จึงยิง PATCH ตรงเข้า PostgREST
-- ตั้ง role = 'admin' ให้ตัวเองได้ แล้ว is_admin() คืน true -> เข้าถึงทุกอย่างของแอดมิน
-- (จัดการผู้ใช้ ลบผู้ใช้ แก้เนื้อหา ดูผลวิเคราะห์ทุกคน และอ่านอีเมลผู้ใช้จริงทั้งหมด)
--
-- updateMyProfile() ฝั่งเซิร์ฟเวอร์เขียนแค่ full_name/nickname/phone/avatar_url
-- จึงไม่ใช่ต้นตอ — ต้นตอคือ RLS เปิดให้แก้ role ได้ ต้องปิดที่ชั้นฐานข้อมูล
--
-- ===== วิธีแก้ =====
-- trigger BEFORE UPDATE ตรวจว่า role เปลี่ยนไหม ถ้าเปลี่ยนและผู้เรียกไม่ใช่ admin -> ปฏิเสธ
-- ใช้ trigger แทน WITH CHECK เพราะ policy อ้าง OLD.role (ค่าก่อนแก้) ไม่ได้
-- is_admin() เป็น security definer อ่าน role ของผู้เรียกจาก auth.uid() ได้เสมอ
--   * แอดมินแก้ role ให้คนอื่นผ่านหน้า /admin/users -> is_admin() = true -> ผ่าน
--   * ผู้ใช้ยกระดับตัวเอง -> is_admin() = false (role ยังเป็น user) -> ถูกปฏิเสธ
-- สอดคล้องกับ policy อื่นทั้งระบบที่ใช้ is_admin() เป็นเส้นแบ่งแอดมินอยู่แล้ว

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'ไม่มีสิทธิ์เปลี่ยน role ของบัญชี'
      using errcode = '42501';  -- insufficient_privilege
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ===== กันแถวที่โดนยกระดับไปแล้วก่อนแพตช์นี้ =====
-- ตั้ง role ที่ควรเป็น admin เท่านั้นให้ยังคงเป็น admin (ไม่แตะ) — บรรทัดนี้แค่ไว้ให้ตรวจ
-- ควรรันคำสั่งด้านล่างด้วยตัวเองใน SQL editor เพื่อดูว่ามีบัญชีไหนเป็น admin บ้าง
-- แล้วยืนยันว่าทุกตัวเป็นแอดมินจริง หากพบตัวปลอมให้แก้กลับเป็น 'user':
--
--   select id, email, role, created_at from public.profiles where role = 'admin' order by created_at;
--   -- ตัวปลอม (ถ้ามี):
--   -- update public.profiles set role = 'user' where id = '<uid ที่ไม่ใช่แอดมินจริง>';
