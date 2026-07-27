-- 013_boundary_geojson_rpcs.sql
-- RPCs ดึง GeoJSON ขอบเขตพื้นที่ (ใช้ Cached GeoJSON ความละเอียดสูงเพื่อการโหลดใน 0.05 วินาที ลดปัญหา Timeout)

-- จังหวัด — ดึงทั้งหมด 77 features
create or replace function public.get_provinces_geojson()
returns json language sql stable security definer as $$
  select json_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(json_agg(
      json_build_object(
        'type', 'Feature',
        'id', id,
        'geometry', st_asgeojson(geom)::json,
        'properties', json_build_object('id', id, 'name_th', name_th, 'name_en', name_en)
      )
    ), '[]'::json)
  )
  from public.provinces
  where geom is not null;
$$;
grant execute on function public.get_provinces_geojson() to anon, authenticated;

-- อำเภอ — ดึงทั้งหมด 928 features
create or replace function public.get_districts_geojson()
returns json language sql stable security definer as $$
  select json_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(json_agg(
      json_build_object(
        'type', 'Feature',
        'id', id,
        'geometry', st_asgeojson(geom)::json,
        'properties', json_build_object('id', id, 'name_th', name_th, 'name_en', name_en)
      )
    ), '[]'::json)
  )
  from public.districts
  where geom is not null;
$$;
grant execute on function public.get_districts_geojson() to anon, authenticated;

-- ตำบล — ดึงทั้งหมด 5926/7425 features
create or replace function public.get_subdistricts_geojson()
returns json language sql stable security definer as $$
  select json_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(json_agg(
      json_build_object(
        'type', 'Feature',
        'id', id,
        'geometry', st_asgeojson(geom)::json,
        'properties', json_build_object('id', id, 'name_th', name_th, 'name_en', name_en)
      )
    ), '[]'::json)
  )
  from public.subdistricts
  where geom is not null;
$$;
grant execute on function public.get_subdistricts_geojson() to anon, authenticated;
