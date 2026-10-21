-- 042_soil_points.sql
-- จุดค่าดินรายตำบล — แทนการแสดงแผนที่ดินแบบ raster (soil_grid)
--
-- ค่าของแต่ละตำบล = มัธยฐานแยกทีละธาตุ ของ
--   1. ตัวอย่างจาก predict log ระบบเก่าที่ทำความสะอาดแล้ว (soil_samples, ข้อมูลใน 043)
--   2. รายการ "วิเคราะห์ด้วย AI" ในระบบนี้ที่เสร็จแล้วและมีตำบล — ใช้ค่าที่ AI ทำนาย (ai_result)
--      ไม่ใช่ค่าที่ผู้ใช้แก้ในหน้าคำนวณ — รายการใหม่เข้าไปรวมทันที ไม่ต้องรันอะไรเพิ่ม
-- ค่า 0 = ไม่ได้ตรวจธาตุนั้น ไม่นำมาคิด
--
-- ตำแหน่งจุด (กลางตำบล) อยู่ในโค้ด src/lib/soil/subdistrictCenters.json (8,105 ตำบลจาก public/boundaries)
-- ตาราง subdistricts ในฐานข้อมูล (GADM) มีแค่ 4,263 ตำบลและชื่อไม่ตรงกับที่เว็บใช้ จึงไม่ใช้
--
-- soil_grid และภาพ raster ใน public/soil-maps ยังเก็บไว้ (ยังไม่ลบ)

-- ตารางรุ่นแรก (เก็บเฉพาะค่ากลางของข้อมูลเก่า รวมรายการใหม่ไม่ได้) — แทนด้วย soil_samples + ฟังก์ชันด้านล่าง
drop table if exists public.soil_points;

-- ---------------------------------------------------------------- ตัวอย่างดินจากแหล่งอื่น (ระบบเก่า)
create table if not exists public.soil_samples (
  id          bigint generated always as identity primary key,
  source      text not null,               -- ชุดข้อมูลที่มา เช่น 'predict_log_20261020'
  subdistrict text not null,               -- ตำบล  (ชื่อตาม public/boundaries)
  district    text not null,               -- อำเภอ
  province    text not null,               -- จังหวัด
  om          numeric check (om > 0),      -- %      null = ไม่ได้ตรวจ
  p           numeric check (p > 0),       -- mg/kg
  k           numeric check (k > 0),       -- mg/kg
  sampled_on  date
);

create index if not exists soil_samples_area_idx on public.soil_samples (province, district, subdistrict);
create index if not exists soil_samples_source_idx on public.soil_samples (source);

-- อ่านรายแถวได้เฉพาะแอดมิน — หน้าเว็บอ่านค่ารวมรายตำบลผ่านฟังก์ชันด้านล่าง
alter table public.soil_samples enable row level security;
drop policy if exists "soil_samples: admin all" on public.soil_samples;
create policy "soil_samples: admin all" on public.soil_samples for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- ค่ารวมรายตำบล
-- security definer: อ่านรายการวิเคราะห์ของทุกคนได้ (RLS ปกติให้เห็นแค่ของตัวเอง)
-- แต่คืนเฉพาะค่ารวมรายตำบล — ไม่มีผู้ใช้ รหัสตัวอย่าง เบอร์โทร หรือพิกัดของรายการ
create or replace function public.get_soil_point_stats()
returns table (
  subdistrict   text,
  district      text,
  province      text,
  om            numeric,
  p             numeric,
  k             numeric,
  om_n          integer,
  p_n           integer,
  k_n           integer,
  first_sampled date,
  last_sampled  date
)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select subdistrict, district, province, om, p, k, sampled_on
    from public.soil_samples
    union all
    select
      a.district, a.amphur, a.province,
      nullif(greatest((a.ai_result ->> 'om_value')::numeric, 0), 0),
      nullif(greatest((a.ai_result ->> 'p_value')::numeric, 0), 0),
      nullif(greatest((a.ai_result ->> 'k_value')::numeric, 0), 0),
      (a.created_at at time zone 'Asia/Bangkok')::date
    from public.analyses a
    where a.input_mode = 'image_upload'
      and a.status = 'completed'
      and a.ai_result is not null
      and a.district is not null and a.amphur is not null and a.province is not null
  )
  select
    subdistrict, district, province,
    round((percentile_cont(0.5) within group (order by om))::numeric, 2),
    round((percentile_cont(0.5) within group (order by p))::numeric, 2),
    round((percentile_cont(0.5) within group (order by k))::numeric, 2),
    count(om)::integer, count(p)::integer, count(k)::integer,
    min(sampled_on), max(sampled_on)
  from s
  where om is not null or p is not null or k is not null
  group by subdistrict, district, province
$$;

-- ฟังก์ชันอ่านอย่างเดียว คืนค่ารวม — เปิดให้ผู้เยี่ยมชมเรียกได้ (หน้าแผนที่ไม่ต้องล็อกอิน)
revoke execute on function public.get_soil_point_stats() from public;
grant execute on function public.get_soil_point_stats() to anon, authenticated, service_role;
