-- 006_app_settings.sql
-- ตารางตั้งค่าระบบแบบ key-value (feature flags / เนื้อหาหน้าเว็บในอนาคต)
-- อ่าน: ทุกคน (flag บางตัวต้องให้ผู้ใช้ทั่วไป/anon อ่านได้ เช่น จะโชว์เมนูแผนที่ไหม)
-- เขียน: เฉพาะ admin
--
-- flag เริ่มต้น:
--   show_soil_map = false  -> ซ่อนแผนที่ดินจากเมนู/หน้าหลัก จนกว่า admin จะเปิด

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS + GRANT
alter table public.app_settings enable row level security;

drop policy if exists "app_settings: read for all" on public.app_settings;
create policy "app_settings: read for all"
  on public.app_settings for select using (true);

drop policy if exists "app_settings: admin insert" on public.app_settings;
create policy "app_settings: admin insert"
  on public.app_settings for insert with check (public.is_admin());

drop policy if exists "app_settings: admin update" on public.app_settings;
create policy "app_settings: admin update"
  on public.app_settings for update using (public.is_admin());

grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;

-- ---------------------------------------------------------------- seed
insert into public.app_settings (key, value) values
  ('show_soil_map', 'false'::jsonb)
on conflict (key) do nothing;
