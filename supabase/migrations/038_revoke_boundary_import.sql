-- 038_revoke_boundary_import.sql
-- ปิดช่องโหว่: คนนอกเพิ่มจังหวัด/อำเภอ/ตำบลได้โดยไม่ต้องล็อกอิน
--
-- insert_province / insert_district / insert_subdistrict (011, 012) เป็น security definer
-- -> เขียนตารางขอบเขตด้วยสิทธิ์เจ้าของ ข้าม RLS ทั้งหมด
-- migration เดิม "grant ... to service_role" แต่ไม่ได้ถอนสิทธิ์ตั้งต้นของ Postgres
-- ที่ให้ PUBLIC (ทุก role รวม anon) execute ฟังก์ชันใหม่ได้เสมอ
-- ทดสอบกับระบบจริง 2026-10-03: เรียกผ่าน /rest/v1/rpc ด้วย publishable key แล้วฟังก์ชันทำงาน
--
-- ฟังก์ชันพวกนี้ใช้แค่ตอน import ขอบเขตด้วย service_role จึงถอนจากทุก role อื่น

revoke execute on function public.insert_province(text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.insert_district(integer, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.insert_subdistrict(integer, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.insert_province(text, text, text, text) to service_role;
grant execute on function public.insert_district(integer, text, text, text, text) to service_role;
grant execute on function public.insert_subdistrict(integer, text, text, text, text) to service_role;

-- หมายเหตุสำหรับ migration ถัดไป: ฟังก์ชัน security definer ที่ "เขียน" ข้อมูล
-- ต้อง revoke from public, anon, authenticated เองทุกครั้ง (Postgres/Supabase เปิดให้ execute เป็นค่าตั้งต้น)
