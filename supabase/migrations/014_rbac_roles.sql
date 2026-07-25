-- 014_rbac_roles.sql
-- ระบบสิทธิ (RBAC): role หลายระดับ × สิทธิต่อเมนู × 4 action (view/create/edit/delete)
-- profiles.role (text) เก็บ "key" ของ role — ขยายจาก user/admin เดิมให้เป็น key อะไรก็ได้
--
-- เมนู (menu_key) ที่ระบบรองรับ: dashboard, users, analyses, crops, fertilizers, settings, roles
-- admin จะได้สิทธิทุกอย่างเสมอ (มี fallback is_admin ในทุกจุดบังคับใช้ กันล็อกตัวเอง)

-- ---------------------------------------------------------------- tables
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,               -- 'admin' | 'user' | 'staff' | slug ที่สร้างเอง
  name text not null,
  description text,
  is_system boolean not null default false, -- true = ลบไม่ได้ (admin/user)
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  menu_key text not null,
  can_view   boolean not null default false,
  can_create boolean not null default false,
  can_edit   boolean not null default false,
  can_delete boolean not null default false,
  unique (role_id, menu_key)
);

create index if not exists role_permissions_role_idx on public.role_permissions (role_id);

-- profiles.role เดิมมี check (role in ('user','admin')) -> ปลดออกให้รับ key อะไรก็ได้
alter table public.profiles drop constraint if exists profiles_role_check;

-- ---------------------------------------------------------------- permission function
-- ใช้ security definer เพื่ออ่าน profiles/roles ข้าม RLS ได้ (เรียกจาก RLS policy + server)
create or replace function public.has_permission(p_menu text, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case p_action
      when 'view'   then rp.can_view
      when 'create' then rp.can_create
      when 'edit'   then rp.can_edit
      when 'delete' then rp.can_delete
      else false
    end
    from public.profiles pr
    join public.roles r on r.key = pr.role
    join public.role_permissions rp on rp.role_id = r.id and rp.menu_key = p_menu
    where pr.id = auth.uid()
    limit 1
  ), false);
$$;

-- เข้าแผงแอดมินได้ไหม = เป็น admin หรือมีสิทธิ view เมนูแอดมินอย่างน้อย 1 อัน
create or replace function public.can_access_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.profiles pr
    join public.roles r on r.key = pr.role
    join public.role_permissions rp on rp.role_id = r.id
    where pr.id = auth.uid() and rp.can_view = true
  );
$$;

-- ---------------------------------------------------------------- RLS
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists "roles: read auth" on public.roles;
create policy "roles: read auth" on public.roles for select using (auth.uid() is not null);
drop policy if exists "roles: admin write" on public.roles;
create policy "roles: admin write" on public.roles for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "role_permissions: read auth" on public.role_permissions;
create policy "role_permissions: read auth" on public.role_permissions for select using (auth.uid() is not null);
drop policy if exists "role_permissions: admin write" on public.role_permissions;
create policy "role_permissions: admin write" on public.role_permissions for all
  using (public.is_admin()) with check (public.is_admin());

grant select on public.roles, public.role_permissions to anon, authenticated;
grant insert, update, delete on public.roles, public.role_permissions to authenticated;

-- ---------------------------------------------------------------- seed roles
insert into public.roles (key, name, description, is_system) values
  ('admin', 'Admin', 'ผู้ดูแลระบบ — เข้าถึงทุกเมนูและทุกการกระทำ', true),
  ('user',  'User',  'ผู้ใช้ทั่วไป — ใช้งานหน้าเว็บ ไม่เข้าแผงแอดมิน', true),
  ('staff', 'Staff', 'เจ้าหน้าที่ — จัดการข้อมูลพืช/ปุ๋ย', false)
on conflict (key) do nothing;

-- admin: ทุกเมนู ทุก action = true
insert into public.role_permissions (role_id, menu_key, can_view, can_create, can_edit, can_delete)
select r.id, m.key, true, true, true, true
from public.roles r
cross join (values ('dashboard'),('users'),('analyses'),('crops'),('fertilizers'),('settings'),('roles')) m(key)
where r.key = 'admin'
on conflict (role_id, menu_key) do nothing;

-- staff: ดูภาพรวม/ประวัติ, จัดการพืชปุ๋ยและสูตรปุ๋ยได้
insert into public.role_permissions (role_id, menu_key, can_view, can_create, can_edit, can_delete)
select r.id, v.menu, v.cv, v.cc, v.ce, v.cd
from public.roles r
cross join (values
  ('dashboard',   true,  false, false, false),
  ('analyses',    true,  false, false, false),
  ('crops',       true,  true,  true,  true),
  ('fertilizers', true,  true,  true,  true)
) v(menu, cv, cc, ce, cd)
where r.key = 'staff'
on conflict (role_id, menu_key) do nothing;
