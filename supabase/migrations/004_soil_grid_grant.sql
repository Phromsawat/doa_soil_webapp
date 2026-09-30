-- 004_soil_grid_grant.sql
-- แก้ปัญหา "permission denied for table soil_grid"
-- Supabase ต้องมีทั้ง RLS policy และ table-level GRANT ให้ role anon/authenticated
-- (ใส่กลับเข้า 003 แล้วในสคริปต์ด้วย — ไฟล์นี้ไว้รันเสริมโดยไม่ต้อง import 17k แถวใหม่)

alter table public.soil_grid enable row level security;

-- policy: อ่านได้ทุกคน (idempotent)
drop policy if exists "soil_grid: read for all" on public.soil_grid;
create policy "soil_grid: read for all" on public.soil_grid for select using (true);

-- table-level privilege
grant select on public.soil_grid to anon, authenticated;
