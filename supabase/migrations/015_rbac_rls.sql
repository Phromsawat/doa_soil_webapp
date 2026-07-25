-- 015_rbac_rls.sql
-- ปรับ RLS ของตารางที่แอดมินจัดการ ให้บังคับใช้สิทธิตาม role (has_permission)
-- แบบ additive: is_admin() ยังผ่านเสมอ (กัน admin ล็อกตัวเอง) + เพิ่มสิทธิตาม role
-- read policy เดิม (public read) ไม่ถูกแตะ
--
-- server action ตรวจสิทธิ action ที่เจาะจงอยู่แล้ว; RLS เป็นด่านที่ DB (defense in depth)

-- ---------------------------------------------------------------- crops
drop policy if exists "crops: admin write" on public.crops;
create policy "crops: write create" on public.crops for insert
  with check (public.is_admin() or public.has_permission('crops','create'));
create policy "crops: write edit" on public.crops for update
  using (public.is_admin() or public.has_permission('crops','edit'));
create policy "crops: write delete" on public.crops for delete
  using (public.is_admin() or public.has_permission('crops','delete'));

-- ---------------------------------------------------------------- fertilizer_recommendations (เมนู crops)
drop policy if exists "recs: admin write" on public.fertilizer_recommendations;
create policy "recs: write create" on public.fertilizer_recommendations for insert
  with check (public.is_admin() or public.has_permission('crops','create'));
create policy "recs: write edit" on public.fertilizer_recommendations for update
  using (public.is_admin() or public.has_permission('crops','edit'));
create policy "recs: write delete" on public.fertilizer_recommendations for delete
  using (public.is_admin() or public.has_permission('crops','delete'));

-- ---------------------------------------------------------------- crop_fertilizer_plan (เมนู crops)
drop policy if exists "crop_fertilizer_plan: admin write" on public.crop_fertilizer_plan;
create policy "crop_fertilizer_plan: write create" on public.crop_fertilizer_plan for insert
  with check (public.is_admin() or public.has_permission('crops','create'));
create policy "crop_fertilizer_plan: write edit" on public.crop_fertilizer_plan for update
  using (public.is_admin() or public.has_permission('crops','edit'));
create policy "crop_fertilizer_plan: write delete" on public.crop_fertilizer_plan for delete
  using (public.is_admin() or public.has_permission('crops','delete'));

-- ---------------------------------------------------------------- fertilizer_formulas
drop policy if exists "fertilizer_formulas: admin insert" on public.fertilizer_formulas;
drop policy if exists "fertilizer_formulas: admin update" on public.fertilizer_formulas;
drop policy if exists "fertilizer_formulas: admin delete" on public.fertilizer_formulas;
create policy "fertilizer_formulas: write create" on public.fertilizer_formulas for insert
  with check (public.is_admin() or public.has_permission('fertilizers','create'));
create policy "fertilizer_formulas: write edit" on public.fertilizer_formulas for update
  using (public.is_admin() or public.has_permission('fertilizers','edit'));
create policy "fertilizer_formulas: write delete" on public.fertilizer_formulas for delete
  using (public.is_admin() or public.has_permission('fertilizers','delete'));

-- ---------------------------------------------------------------- app_settings (เมนู settings)
drop policy if exists "app_settings: admin insert" on public.app_settings;
drop policy if exists "app_settings: admin update" on public.app_settings;
create policy "app_settings: write insert" on public.app_settings for insert
  with check (public.is_admin() or public.has_permission('settings','edit'));
create policy "app_settings: write update" on public.app_settings for update
  using (public.is_admin() or public.has_permission('settings','edit'));

-- ---------------------------------------------------------------- analyses (เมนู analyses)
-- อ่าน: เจ้าของ / admin / ผู้มีสิทธิ view ประวัติ
drop policy if exists "analyses: own read" on public.analyses;
create policy "analyses: own read" on public.analyses for select
  using (auth.uid() = user_id or public.is_admin() or public.has_permission('analyses','view'));
-- ลบ: เจ้าของ / admin / ผู้มีสิทธิ delete ประวัติ
drop policy if exists "analyses: own delete" on public.analyses;
create policy "analyses: own delete" on public.analyses for delete
  using (auth.uid() = user_id or public.is_admin() or public.has_permission('analyses','delete'));
