-- 025_page_contents.sql
-- เนื้อหาหน้าข้อมูล (doa-kits / soil-sampling / user-guide) ที่แอดมินแก้ได้เอง
--
-- เก็บเป็นลำดับของ "บล็อก" (jsonb array) — แต่ละบล็อกมี type + เนื้อหา
-- ฝั่งเว็บ render ตาม type ด้วยดีไซน์ตายตัว แอดมินจึงแก้ได้แค่เนื้อหา ไม่ใช่หน้าตา
-- ชนิดบล็อกดูที่ src/types/content.ts
--
-- ไม่ต้อง seed: ถ้ายังไม่มีแถวของหน้าไหน ฝั่งเว็บจะใช้เนื้อหาตั้งต้นจาก
-- src/lib/content/defaults.ts (ตรงกับที่เคย hardcode ไว้) หน้าจึงไม่มีทางว่าง

create table if not exists public.page_contents (
  slug       text primary key,
  blocks     jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create trigger page_contents_updated_at
  before update on public.page_contents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS + GRANT
-- ต้องมีทั้ง policy และ grant (Supabase เช็คสองชั้น)
alter table public.page_contents enable row level security;

drop policy if exists "page_contents: read for all" on public.page_contents;
create policy "page_contents: read for all"
  on public.page_contents for select using (true);

drop policy if exists "page_contents: admin insert" on public.page_contents;
create policy "page_contents: admin insert"
  on public.page_contents for insert with check (public.is_admin());

drop policy if exists "page_contents: admin update" on public.page_contents;
create policy "page_contents: admin update"
  on public.page_contents for update using (public.is_admin());

drop policy if exists "page_contents: admin delete" on public.page_contents;
create policy "page_contents: admin delete"
  on public.page_contents for delete using (public.is_admin());

grant select on public.page_contents to anon, authenticated;
grant insert, update, delete on public.page_contents to authenticated;

-- ---------------------------------------------------------------- สิทธิ์เมนูใหม่
-- เพิ่ม menu_key 'content' ให้ระบบ RBAC (admin ได้สิทธิ์เต็มจากโค้ดอยู่แล้ว
-- ส่วน role อื่นเริ่มต้นปิดไว้ทั้งหมด ให้แอดมินเปิดเองที่ /admin/roles)
insert into public.role_permissions (role_id, menu_key, can_view, can_create, can_edit, can_delete)
select r.id, 'content', false, false, false, false
from public.roles r
on conflict (role_id, menu_key) do nothing;
