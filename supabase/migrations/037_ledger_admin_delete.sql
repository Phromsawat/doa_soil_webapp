-- 037_ledger_admin_delete.sql
-- ให้แอดมินลบรอบเพาะปลูก (และรายการในรอบ) ของผู้ใช้ได้ — เช่นข้อมูลทดสอบ/ข้อมูลผิดพลาด
--
-- ต่อจาก 036 (แอดมินอ่านได้): เพิ่มสิทธิ์ "ลบ" อย่างเดียว ยังแก้ไขข้อมูลของผู้ใช้ไม่ได้
-- เฉพาะ role admin (is_admin) — ลบรอบแล้วรายการในรอบหายตาม (FK on delete cascade จาก 029)
-- grant delete ให้ authenticated มีอยู่แล้วตั้งแต่ 029

drop policy if exists "farm_seasons: admin delete" on public.farm_seasons;
create policy "farm_seasons: admin delete"
  on public.farm_seasons for delete using (public.is_admin());

drop policy if exists "farm_entries: admin delete" on public.farm_entries;
create policy "farm_entries: admin delete"
  on public.farm_entries for delete using (public.is_admin());
