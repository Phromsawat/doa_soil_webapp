-- 012_subdistricts.sql
-- ขอบเขตตำบล (PostGIS geometry)
-- ข้อมูลจาก GADM 4.1 Thailand (Level 3 = ตำบล)
-- import ด้วย scripts/import_boundaries.js

-- ========== ตำบล (Level 3) ==========
drop table if exists public.subdistricts cascade;
create table public.subdistricts (
  id          serial primary key,
  district_id integer references public.districts(id),
  name_th     text not null,
  name_en     text not null,
  code        text,
  geom        geometry(MultiPolygon, 4326)
);

create index subdistricts_geom_idx on public.subdistricts using gist (geom);
create index subdistricts_district_idx on public.subdistricts (district_id);
create index subdistricts_name_th_idx on public.subdistricts (name_th);

alter table public.subdistricts enable row level security;
create policy "subdistricts: read for all" on public.subdistricts for select using (true);
grant select on public.subdistricts to anon, authenticated;

-- ========== Helper function ==========
create or replace function public.get_subdistrict_at(lat double precision, lng double precision)
returns table(id integer, district_id integer, name_th text, name_en text, code text)
language sql stable security definer as $$
  select s.id, s.district_id, s.name_th, s.name_en, s.code
  from public.subdistricts s
  where st_contains(s.geom, st_setsrid(st_point(lng, lat), 4326))
  limit 1;
$$;

grant execute on function public.get_subdistrict_at to anon, authenticated;

-- ========== Import helper ==========
create or replace function public.insert_subdistrict(
  p_district_id integer,
  p_name_th text,
  p_name_en text,
  p_code text,
  p_geom_geojson text
) returns void language plpgsql security definer as $$
begin
  insert into public.subdistricts (district_id, name_th, name_en, code, geom)
  values (
    p_district_id, p_name_th, p_name_en, p_code,
    st_multi(st_geomfromgeojson(p_geom_geojson))
  );
end;
$$;

grant execute on function public.insert_subdistrict to service_role;
