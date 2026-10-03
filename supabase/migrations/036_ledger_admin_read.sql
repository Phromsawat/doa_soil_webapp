-- 036_ledger_admin_read.sql
-- เปิดให้แอดมิน "อ่าน" สมุดบัญชีของผู้ใช้ทุกคน (ดูรายรอบ + export สรุปรายรับรายจ่าย)
--
-- เดิม (029) ล็อกให้เจ้าของดูได้คนเดียว เจ้าของโครงการตัดสินใจเปิดให้แอดมินดูได้
-- เพื่อทำสถิติต้นทุน/ผลตอบแทน และแจ้งไว้ในนโยบายความเป็นส่วนตัวแล้ว (TermsModal)
--
-- - อ่านได้อย่างเดียว: ไม่มี policy แก้/ลบสำหรับแอดมิน ข้อมูลยังเป็นของเจ้าของ
-- - เฉพาะ role admin (is_admin) — role อื่นต่อให้เปิดเมนู "ledgers" ก็อ่านไม่ได้
-- - farm_categories ไม่ต้องเปิด: รายการเก็บชื่อหมวดเป็นข้อความไว้ในตัวแล้ว

drop policy if exists "farm_seasons: admin read" on public.farm_seasons;
create policy "farm_seasons: admin read"
  on public.farm_seasons for select using (public.is_admin());

drop policy if exists "farm_entries: admin read" on public.farm_entries;
create policy "farm_entries: admin read"
  on public.farm_entries for select using (public.is_admin());

-- ---------------------------------------------------------------- สรุปรายรอบ
-- รวมยอดในฐานข้อมูล ไม่ต้องดึงรายการทั้งหมดมาบวกในแอป
-- security_invoker = ใช้ RLS ของผู้เรียก: ผู้ใช้เห็นเฉพาะรอบของตัวเอง แอดมินเห็นทุกรอบ
create or replace view public.ledger_season_summary
with (security_invoker = true) as
select
  s.id          as season_id,
  s.user_id,
  s.name,
  s.crop_id,
  s.started_on,
  s.ended_on,
  s.yield_kg,
  s.created_at,
  coalesce(sum(e.amount) filter (where e.kind = 'income'), 0)  as income,
  coalesce(sum(e.amount) filter (where e.kind = 'expense'), 0) as expense,
  count(e.id)   as entry_count
from public.farm_seasons s
left join public.farm_entries e on e.season_id = s.id
group by s.id;

grant select on public.ledger_season_summary to authenticated;

-- ---------------------------------------------------------------- สิทธิ์เมนูใหม่
-- เมนู "สมุดบัญชี" ในแผงแอดมิน (admin ได้สิทธิ์เต็มจากโค้ดอยู่แล้ว role อื่นปิดไว้)
insert into public.role_permissions (role_id, menu_key, can_view, can_create, can_edit, can_delete)
select r.id, 'ledgers', false, false, false, false
from public.roles r
on conflict (role_id, menu_key) do nothing;
