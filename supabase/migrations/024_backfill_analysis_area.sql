-- 024_backfill_analysis_area.sql
-- เติมพื้นที่ (ตำบล/อำเภอ/จังหวัด) ให้ record เก่า
--
-- ที่มาของปัญหา: หน้าอัปโหลดเวอร์ชันก่อนเก็บ province/amphur เป็น null และยัด
-- "รหัสไปรษณีย์" ลงช่อง district ทำให้หน้าผล/ประวัติแสดง "10500" ราวกับเป็นชื่อตำบล
-- (แก้ที่ต้นทางแล้วใน commit 993c0ba)
--
-- วิธีเติมย้อนหลัง: ใช้ latitude/longitude ที่บันทึกไว้ หาตำบลที่ครอบพิกัดนั้นด้วย
-- PostGIS (ตาราง subdistricts/districts/provinces จาก migration 011–012)
-- แม่นกว่าการเดาจากรหัสไปรษณีย์ เพราะ 172 จาก 966 รหัสครอบคลุมมากกว่า 1 อำเภอ
--
-- ปลอดภัยกับข้อมูล: แตะเฉพาะแถวที่ (ก) district เป็นเลข 5 หลัก หรือ (ข) ไม่มีข้อมูล
-- พื้นที่เลย และต้องหาตำบลจากพิกัดเจอเท่านั้น รันซ้ำได้ (idempotent)

-- กันกรณีตารางขอบเขตยังไม่ได้ import — จะได้ไม่เข้าใจผิดว่าอัปเดตแล้วแต่ไม่มีอะไรเปลี่ยน
do $$
begin
  if (select count(*) from public.subdistricts) = 0 then
    raise exception 'ตาราง subdistricts ว่าง — ต้อง import ขอบเขตก่อน (scripts/import_boundaries.js)';
  end if;
end $$;

begin;

with fixed as (
  select distinct on (a.id)
    a.id,
    p.name_th as province,
    d.name_th as amphur,
    s.name_th as district
  from public.analyses a
  join public.subdistricts s
    on st_contains(s.geom, st_setsrid(st_point(a.longitude, a.latitude), 4326))
  join public.districts d on d.id = s.district_id
  join public.provinces p on p.id = d.province_id
  where a.latitude is not null
    and a.longitude is not null
    and (
      a.district ~ '^\d{5}$'                          -- รหัสไปรษณีย์ค้างในช่องตำบล
      or (a.province is null and a.amphur is null)    -- ไม่มีข้อมูลพื้นที่เลย
    )
  order by a.id, s.id                                 -- จุดคาบเกี่ยวขอบ: เลือกตำบลเดิมเสมอ
)
update public.analyses a
set province = f.province,
    amphur   = f.amphur,
    district = f.district
from fixed f
where a.id = f.id;

commit;

-- ---------------------------------------------------------------- ตรวจผล
-- แถวที่ยังเหลือรหัสไปรษณีย์ในช่อง district (ไม่มีพิกัด หรือพิกัดอยู่นอกขอบเขต)
-- จะแก้อัตโนมัติไม่ได้ — ปล่อยไว้ตามเดิม ไม่ลบข้อมูลทิ้ง
--
--   select id, province, amphur, district, latitude, longitude
--   from public.analyses
--   where district ~ '^\d{5}$'
--   order by created_at;
