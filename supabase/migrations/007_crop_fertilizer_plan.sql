-- 007_crop_fertilizer_plan.sql
-- ตาราง "แผนการใส่ปุ๋ยตายตัวตามค่าวิเคราะห์ดิน" (lookup table ของกรมวิชาการเกษตร)
-- ต่างจาก fertilizer_recommendations (ที่เก็บเป้าหมาย N/P2O5/K2O แล้วให้ solver คำนวณต่อ):
-- ตารางนี้เก็บ "ปริมาณปุ๋ยจริงเป็นกรัม/กิโล แยกตามระยะการเจริญเติบโต" ที่ DOA กำหนดตายตัว
--
-- 1 แถว = พืช × โหมด(แม่ปุ๋ย/เชิงประกอบ) × ช่วง(OM×P×K) × ระยะ × สูตรปุ๋ย -> ปริมาณ
-- ช่วงค่าดินเก็บแบบ [min, max) โดย null = ไม่มีขอบ (< max ใช้ min=null, > min ใช้ max=null)

create table if not exists public.crop_fertilizer_plan (
  id uuid primary key default gen_random_uuid(),
  crop_id  uuid not null references public.crops(id) on delete cascade,
  use_type text not null check (use_type in ('straight', 'compound')), -- แม่ปุ๋ย | ปุ๋ยเชิงประกอบ
  om_min numeric, om_max numeric,
  p_min  numeric, p_max  numeric,
  k_min  numeric, k_max  numeric,
  stage       text not null,           -- เช่น "ระยะบำรุงต้น", "ใส่ปุ๋ยครั้งที่ 1 (รองพื้น)"
  stage_order int  not null default 0, -- ลำดับระยะ (ไว้เรียงแสดงผล)
  grade  text    not null,             -- เช่น "46-0-0", "18-46-0", "16-16-8"
  amount numeric not null,             -- ปริมาณปุ๋ย
  unit   text    not null,             -- "กรัม/ต้น" | "กก./ไร่"
  created_at timestamptz not null default now()
);

create index if not exists crop_fertilizer_plan_lookup_idx
  on public.crop_fertilizer_plan (crop_id, use_type, stage_order);

-- ---------------------------------------------------------------- RLS + GRANT
alter table public.crop_fertilizer_plan enable row level security;

drop policy if exists "crop_fertilizer_plan: read for all" on public.crop_fertilizer_plan;
create policy "crop_fertilizer_plan: read for all"
  on public.crop_fertilizer_plan for select using (true);

drop policy if exists "crop_fertilizer_plan: admin write" on public.crop_fertilizer_plan;
create policy "crop_fertilizer_plan: admin write"
  on public.crop_fertilizer_plan for all using (public.is_admin()) with check (public.is_admin());

grant select on public.crop_fertilizer_plan to anon, authenticated;
grant insert, update, delete on public.crop_fertilizer_plan to authenticated;
