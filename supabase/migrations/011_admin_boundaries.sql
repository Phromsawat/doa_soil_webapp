-- 011_admin_boundaries.sql
-- ขอบเขตอำเภอและจังหวัด (PostGIS geometry)
-- ข้อมูลจาก GADM 4.1 Thailand (Level 1 = จังหวัด, Level 2 = อำเภอ)
-- import ด้วย scripts/import_boundaries.js

-- เปิด PostGIS extension
create extension if not exists postgis;

-- ========== จังหวัด (Level 1) ==========
drop table if exists public.provinces cascade;
create table public.provinces (
  id         serial primary key,
  name_th    text not null,
  name_en    text not null,
  code       text,           -- รหัสจังหวัด
  geom       geometry(MultiPolygon, 4326)
);

create index provinces_geom_idx on public.provinces using gist (geom);
create index provinces_name_th_idx on public.provinces (name_th);

alter table public.provinces enable row level security;
create policy "provinces: read for all" on public.provinces for select using (true);
grant select on public.provinces to anon, authenticated;

-- ========== อำเภอ (Level 2) ==========
drop table if exists public.districts cascade;
create table public.districts (
  id          serial primary key,
  province_id integer references public.provinces(id),
  name_th     text not null,
  name_en     text not null,
  code        text,          -- รหัสอำเภอ
  geom        geometry(MultiPolygon, 4326)
);

create index districts_geom_idx on public.districts using gist (geom);
create index districts_province_idx on public.districts (province_id);
create index districts_name_th_idx on public.districts (name_th);

alter table public.districts enable row level security;
create policy "districts: read for all" on public.districts for select using (true);
grant select on public.districts to anon, authenticated;

-- ========== Helper functions ==========
-- หาจังหวัดจากพิกัด
create or replace function public.get_province_at(lat double precision, lng double precision)
returns table(id integer, name_th text, name_en text, code text)
language sql stable security definer as $$
  select p.id, p.name_th, p.name_en, p.code
  from public.provinces p
  where st_contains(p.geom, st_setsrid(st_point(lng, lat), 4326))
  limit 1;
$$;

-- หาอำเภอจากพิกัด
create or replace function public.get_district_at(lat double precision, lng double precision)
returns table(id integer, province_id integer, name_th text, name_en text, code text)
language sql stable security definer as $$
  select d.id, d.province_id, d.name_th, d.name_en, d.code
  from public.districts d
  where st_contains(d.geom, st_setsrid(st_point(lng, lat), 4326))
  limit 1;
$$;

grant execute on function public.get_province_at to anon, authenticated;
grant execute on function public.get_district_at to anon, authenticated;

-- ========== Import helpers (ใช้โดย scripts/import_boundaries.js) ==========
create or replace function public.insert_province(
  p_name_th text,
  p_name_en text,
  p_code text,
  p_geom_geojson text
) returns void language plpgsql security definer as $$
begin
  insert into public.provinces (name_th, name_en, code, geom)
  values (
    p_name_th, p_name_en, p_code,
    st_multi(st_geomfromgeojson(p_geom_geojson))
  );
end;
$$;

create or replace function public.insert_district(
  p_province_id integer,
  p_name_th text,
  p_name_en text,
  p_code text,
  p_geom_geojson text
) returns void language plpgsql security definer as $$
begin
  insert into public.districts (province_id, name_th, name_en, code, geom)
  values (
    p_province_id, p_name_th, p_name_en, p_code,
    st_multi(st_geomfromgeojson(p_geom_geojson))
  );
end;
$$;

-- เฉพาะ service_role เท่านั้นที่ import ได้
grant execute on function public.insert_province to service_role;
grant execute on function public.insert_district to service_role;
