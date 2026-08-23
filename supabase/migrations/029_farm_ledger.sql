-- 029_farm_ledger.sql
-- สมุดบัญชีฟาร์ม — บันทึกรายรับรายจ่ายแยกตาม "รอบเพาะปลูก"
--
--   farm_seasons     รอบเพาะปลูก (ชื่อรอบ, พืชที่ปลูก, ช่วงวันที่, ผลผลิตที่ได้)
--   farm_categories  หมวดหมู่ที่ผู้ใช้เพิ่มเอง (หมวดตายตัวอยู่ในโค้ด ไม่ต้องเก็บใน DB)
--   farm_entries     รายการรายรับ/รายจ่ายแต่ละรายการ
--
-- เป็นข้อมูลการเงินส่วนตัวของเกษตรกร -> RLS ให้ "เจ้าของเท่านั้น" ทุกการกระทำ
-- ไม่เปิดช่องให้ admin อ่าน ต่างจากตาราง analyses ที่ admin ดูได้
--
-- farm_entries.category เก็บเป็นข้อความ ไม่ใช่ FK ตั้งใจให้รายการเก่าคงชื่อหมวดเดิมไว้
-- แม้ผู้ใช้จะลบหรือเปลี่ยนชื่อหมวดที่เพิ่มเองในภายหลัง

-- =============================================================================
-- 1. รอบเพาะปลูก
-- =============================================================================
create table if not exists public.farm_seasons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  crop_id uuid references public.crops(id) on delete set null,
  started_on date not null default current_date,
  ended_on date,
  yield_kg numeric check (yield_kg is null or yield_kg >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists farm_seasons_user_idx
  on public.farm_seasons (user_id, started_on desc);

drop trigger if exists farm_seasons_updated_at on public.farm_seasons;
create trigger farm_seasons_updated_at
  before update on public.farm_seasons
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 2. หมวดหมู่ที่ผู้ใช้เพิ่มเอง
-- =============================================================================
create table if not exists public.farm_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);
create index if not exists farm_categories_user_idx
  on public.farm_categories (user_id, kind);

-- =============================================================================
-- 3. รายการรายรับ / รายจ่าย
-- =============================================================================
create table if not exists public.farm_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.farm_seasons(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  category text not null,
  title text,
  amount numeric not null check (amount >= 0),
  happened_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists farm_entries_season_idx
  on public.farm_entries (season_id, happened_on desc);
create index if not exists farm_entries_user_idx
  on public.farm_entries (user_id);

drop trigger if exists farm_entries_updated_at on public.farm_entries;
create trigger farm_entries_updated_at
  before update on public.farm_entries
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. RLS — เจ้าของข้อมูลเท่านั้น
-- =============================================================================
alter table public.farm_seasons    enable row level security;
alter table public.farm_categories enable row level security;
alter table public.farm_entries    enable row level security;

drop policy if exists "farm_seasons: own read"   on public.farm_seasons;
drop policy if exists "farm_seasons: own write"  on public.farm_seasons;
drop policy if exists "farm_seasons: own update" on public.farm_seasons;
drop policy if exists "farm_seasons: own delete" on public.farm_seasons;
create policy "farm_seasons: own read"   on public.farm_seasons for select using (auth.uid() = user_id);
create policy "farm_seasons: own write"  on public.farm_seasons for insert with check (auth.uid() = user_id);
create policy "farm_seasons: own update" on public.farm_seasons for update using (auth.uid() = user_id);
create policy "farm_seasons: own delete" on public.farm_seasons for delete using (auth.uid() = user_id);

drop policy if exists "farm_categories: own read"   on public.farm_categories;
drop policy if exists "farm_categories: own write"  on public.farm_categories;
drop policy if exists "farm_categories: own delete" on public.farm_categories;
create policy "farm_categories: own read"   on public.farm_categories for select using (auth.uid() = user_id);
create policy "farm_categories: own write"  on public.farm_categories for insert with check (auth.uid() = user_id);
create policy "farm_categories: own delete" on public.farm_categories for delete using (auth.uid() = user_id);

drop policy if exists "farm_entries: own read"   on public.farm_entries;
drop policy if exists "farm_entries: own write"  on public.farm_entries;
drop policy if exists "farm_entries: own update" on public.farm_entries;
drop policy if exists "farm_entries: own delete" on public.farm_entries;
create policy "farm_entries: own read"   on public.farm_entries for select using (auth.uid() = user_id);
create policy "farm_entries: own write"  on public.farm_entries for insert with check (auth.uid() = user_id);
create policy "farm_entries: own update" on public.farm_entries for update using (auth.uid() = user_id);
create policy "farm_entries: own delete" on public.farm_entries for delete using (auth.uid() = user_id);

-- โปรเจกต์นี้ไม่ได้ใช้ default privileges มาตรฐานของ Supabase (service_role ไม่มีสิทธิ์
-- บนตารางเดิมเลย) จึงให้สิทธิ์ role ที่แอปใช้จริงไว้ตรง ๆ กันพลาด
grant select, insert, update, delete on public.farm_seasons    to authenticated;
grant select, insert, update, delete on public.farm_categories to authenticated;
grant select, insert, update, delete on public.farm_entries    to authenticated;
