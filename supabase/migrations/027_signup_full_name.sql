-- 027_signup_full_name.sql
-- เก็บชื่อที่ผู้ใช้ตั้งตอนสมัคร ลงในตาราง profiles
--
-- เดิม handle_new_user คัดลอกแค่ id/phone/email ชื่อที่กรอกตอนสมัครจึงค้างอยู่
-- ใน auth.users.raw_user_meta_data เท่านั้น หน้าแอดมิน/หน้าโปรไฟล์ที่อ่านจาก
-- profiles.full_name เลยไม่เห็น และแอปต้องเดาชื่อจากส่วนหน้าอีเมลแทน
--
-- อัปเดตทริกเกอร์ให้ดึง full_name (และ nickname ถ้ามี) จาก metadata ตอนสร้างแถว

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, phone, email, full_name, nickname)
  values (
    new.id,
    new.phone,
    new.email,
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'nickname'), '')
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------- ย้อนหลัง
-- ผู้ใช้ที่สมัครไว้ก่อนหน้าและมีชื่อใน metadata อยู่แล้ว แต่ profiles ยังว่าง
-- (ไม่แตะแถวที่มีชื่อแล้ว เพื่อไม่ทับค่าที่ผู้ใช้แก้เองในหน้าโปรไฟล์)
update public.profiles p
set full_name = nullif(trim(u.raw_user_meta_data->>'full_name'), '')
from auth.users u
where u.id = p.id
  and p.full_name is null
  and nullif(trim(u.raw_user_meta_data->>'full_name'), '') is not null;
