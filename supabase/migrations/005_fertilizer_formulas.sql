-- 005_fertilizer_formulas.sql
-- ตารางสูตรปุ๋ย — ใช้แปลง "ความต้องการธาตุอาหาร (N/P2O5/K2O)" เป็น "ต้องใช้ปุ๋ยจริงกี่กิโล"
-- admin เพิ่ม/แก้/ลบได้จากหน้า /admin/fertilizers
--
-- หมายเหตุความถูกต้องของข้อมูล seed:
--   seed ด้านล่างใส่เฉพาะ "ปุ๋ยเคมีสูตรมาตรฐาน" ที่ค่า N-P2O5-K2O เป็นนิยามของสูตรเอง
--   (เช่น ยูเรีย = 46-0-0 ตามนิยาม, 16-16-16 = N16/P2O5 16/K2O 16)
--   ไม่ใส่ปุ๋ยอินทรีย์ (มูลสัตว์/วัสดุเหลือใช้) เพราะค่าธาตุอาหารจริงแปรผันมากตามแหล่งที่มา
--   -> ให้ admin เพิ่มเองพร้อมระบุแหล่งอ้างอิงในช่อง notes

create table if not exists public.fertilizer_formulas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text,                              -- เช่น "46-0-0" (ไว้แสดงผล)
  n_percent    numeric not null default 0 check (n_percent    >= 0 and n_percent    <= 100),
  p2o5_percent numeric not null default 0 check (p2o5_percent >= 0 and p2o5_percent <= 100),
  k2o_percent  numeric not null default 0 check (k2o_percent  >= 0 and k2o_percent  <= 100),
  kind text not null default 'chemical' check (kind in ('chemical', 'organic')),
  is_active boolean not null default true,
  sort_order int not null default 100,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fertilizer_formulas_active_idx
  on public.fertilizer_formulas (is_active, sort_order);

create trigger fertilizer_formulas_updated_at
  before update on public.fertilizer_formulas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS + GRANT
-- ต้องมีทั้ง policy และ grant (Supabase เช็คสองชั้น)
alter table public.fertilizer_formulas enable row level security;

drop policy if exists "fertilizer_formulas: read for all" on public.fertilizer_formulas;
create policy "fertilizer_formulas: read for all"
  on public.fertilizer_formulas for select using (true);

drop policy if exists "fertilizer_formulas: admin insert" on public.fertilizer_formulas;
create policy "fertilizer_formulas: admin insert"
  on public.fertilizer_formulas for insert with check (public.is_admin());

drop policy if exists "fertilizer_formulas: admin update" on public.fertilizer_formulas;
create policy "fertilizer_formulas: admin update"
  on public.fertilizer_formulas for update using (public.is_admin());

drop policy if exists "fertilizer_formulas: admin delete" on public.fertilizer_formulas;
create policy "fertilizer_formulas: admin delete"
  on public.fertilizer_formulas for delete using (public.is_admin());

grant select on public.fertilizer_formulas to anon, authenticated;
grant insert, update, delete on public.fertilizer_formulas to authenticated;

-- ---------------------------------------------------------------- seed
-- แม่ปุ๋ย (straight fertilizer)
insert into public.fertilizer_formulas (name, grade, n_percent, p2o5_percent, k2o_percent, kind, sort_order) values
  ('ยูเรีย',                          '46-0-0',  46,  0,  0, 'chemical', 10),
  ('แอมโมเนียมซัลเฟต',                '21-0-0',  21,  0,  0, 'chemical', 20),
  ('ไดแอมโมเนียมฟอสเฟต (DAP)',        '18-46-0', 18, 46,  0, 'chemical', 30),
  ('โมโนแอมโมเนียมฟอสเฟต (MAP)',      '11-52-0', 11, 52,  0, 'chemical', 40),
  ('ทริปเปิลซูเปอร์ฟอสเฟต (TSP)',      '0-46-0',   0, 46,  0, 'chemical', 50),
  ('โพแทสเซียมคลอไรด์ (MOP)',          '0-0-60',   0,  0, 60, 'chemical', 60),
  ('โพแทสเซียมซัลเฟต (SOP)',           '0-0-50',   0,  0, 50, 'chemical', 70)
on conflict do nothing;

-- ปุ๋ยเชิงประกอบ/ปุ๋ยผสม (compound) — ตัวเลขตามสูตรบนกระสอบ
insert into public.fertilizer_formulas (name, grade, n_percent, p2o5_percent, k2o_percent, kind, sort_order) values
  ('ปุ๋ยเคมี 16-16-16', '16-16-16', 16, 16, 16, 'chemical', 110),
  ('ปุ๋ยเคมี 15-15-15', '15-15-15', 15, 15, 15, 'chemical', 120),
  ('ปุ๋ยเคมี 13-13-21', '13-13-21', 13, 13, 21, 'chemical', 130),
  ('ปุ๋ยเคมี 12-24-12', '12-24-12', 12, 24, 12, 'chemical', 140),
  ('ปุ๋ยเคมี 8-24-24',  '8-24-24',   8, 24, 24, 'chemical', 150),
  ('ปุ๋ยเคมี 25-7-7',   '25-7-7',   25,  7,  7, 'chemical', 160),
  ('ปุ๋ยเคมี 20-8-20',  '20-8-20',  20,  8, 20, 'chemical', 170),
  ('ปุ๋ยเคมี 15-7-18',  '15-7-18',  15,  7, 18, 'chemical', 180)
on conflict do nothing;
