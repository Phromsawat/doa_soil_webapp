-- 044_protect_ai_result.sql
-- กันค่าดินปลอมบนแผนที่สาธารณะ
--
-- ===== ปัญหา =====
-- get_soil_point_stats (042) นำ analyses.ai_result ของรายการ "วิเคราะห์ด้วย AI" ไปรวมเป็นจุดบนแผนที่
-- แต่ policy ของ analyses ให้เจ้าของ insert/update แถวของตัวเองได้ทุกคอลัมน์ ผู้ที่สมัครสมาชิก
-- จึงยิงตรงเข้า PostgREST ได้ (publishable key เป็นค่าสาธารณะ):
--   1. ใส่ ai_result ปลอม + ชื่อตำบลจริง → ค่าปลอมขึ้นแผนที่ และถูกใช้ใน "ดึงค่าจากแผนที่" ของคนอื่น
--   2. ใส่ ai_result ที่ไม่ใช่ตัวเลข ("om_value": "abc") → ::numeric ในฟังก์ชัน error ทั้งคำสั่ง
--      แผนที่ใช้ไม่ได้ทั้งเว็บจากแถวเดียว
--
-- ===== แก้ =====
--   1. trigger: บทบาทของ API (anon / authenticated) เขียน ai_result ไม่ได้ และย้ายพื้นที่ของรายการ
--      ที่ทำนายแล้วไม่ได้ — ai_result เขียนได้เฉพาะ server ด้วย service role (predictAnalysis
--      ตรวจความเป็นเจ้าของ + เรียกแบบจำลองเองก่อน) และ SQL ของผู้ดูแล (postgres)
--   2. ฟังก์ชันอ่านเฉพาะค่าที่เป็นตัวเลขจริง (jsonb number) ค่าแบบอื่นข้ามไป ไม่ทำให้ทั้งคำสั่งพัง
--   3. service_role ได้สิทธิ์ select/update บน analyses (โปรเจกต์นี้ไม่ได้ให้ default privileges)

-- ---------------------------------------------------------------- trigger
-- ไม่ใช่ security definer: current_user ต้องเป็นบทบาทของผู้เรียกจริง (PostgREST สลับเป็น anon/authenticated)
create or replace function public.guard_analysis_ai_result()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.ai_result is not null then
      raise exception 'ai_result บันทึกได้จากระบบทำนายเท่านั้น'
        using errcode = '42501';  -- insufficient_privilege
    end if;
    return new;
  end if;

  if new.ai_result is distinct from old.ai_result then
    raise exception 'ai_result บันทึกได้จากระบบทำนายเท่านั้น'
      using errcode = '42501';
  end if;
  -- ทำนายแล้ว = จุดบนแผนที่ผูกกับตำบลนี้แล้ว ย้ายไปตำบลอื่นไม่ได้
  if old.ai_result is not null and (
       new.district is distinct from old.district
    or new.amphur   is distinct from old.amphur
    or new.province is distinct from old.province
  ) then
    raise exception 'แก้พื้นที่ของรายการที่ทำนายแล้วไม่ได้'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists analyses_guard_ai_result on public.analyses;
create trigger analyses_guard_ai_result
  before insert or update on public.analyses
  for each row execute function public.guard_analysis_ai_result();

-- ---------------------------------------------------------------- service role
-- predictAnalysis บันทึกผลทำนายด้วย service role (ฝั่ง server เท่านั้น)
grant select, update on public.analyses to service_role;

-- ---------------------------------------------------------------- ค่ารวมรายตำบล (แทนของ 042)
-- เหมือนเดิมทุกอย่าง ยกเว้นการอ่านค่าจาก ai_result: รับเฉพาะ jsonb ชนิด number
create or replace function public.get_soil_point_stats()
returns table (
  subdistrict   text,
  district      text,
  province      text,
  om            numeric,
  p             numeric,
  k             numeric,
  om_n          integer,
  p_n           integer,
  k_n           integer,
  first_sampled date,
  last_sampled  date
)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select subdistrict, district, province, om, p, k, sampled_on
    from public.soil_samples
    union all
    select
      a.district, a.amphur, a.province,
      case when jsonb_typeof(a.ai_result -> 'om_value') = 'number'
        then nullif(greatest((a.ai_result ->> 'om_value')::numeric, 0), 0) end,
      case when jsonb_typeof(a.ai_result -> 'p_value') = 'number'
        then nullif(greatest((a.ai_result ->> 'p_value')::numeric, 0), 0) end,
      case when jsonb_typeof(a.ai_result -> 'k_value') = 'number'
        then nullif(greatest((a.ai_result ->> 'k_value')::numeric, 0), 0) end,
      (a.created_at at time zone 'Asia/Bangkok')::date
    from public.analyses a
    where a.input_mode = 'image_upload'
      and a.status = 'completed'
      and jsonb_typeof(a.ai_result) = 'object'
      and a.district is not null and a.amphur is not null and a.province is not null
  )
  select
    subdistrict, district, province,
    round((percentile_cont(0.5) within group (order by om))::numeric, 2),
    round((percentile_cont(0.5) within group (order by p))::numeric, 2),
    round((percentile_cont(0.5) within group (order by k))::numeric, 2),
    count(om)::integer, count(p)::integer, count(k)::integer,
    min(sampled_on), max(sampled_on)
  from s
  where om is not null or p is not null or k is not null
  group by subdistrict, district, province
$$;

revoke execute on function public.get_soil_point_stats() from public;
grant execute on function public.get_soil_point_stats() to anon, authenticated, service_role;

-- ---------------------------------------------------------------- ตรวจหลังรัน (ไม่บังคับ)
-- รายการที่ทำนายแล้วแต่ค่าไม่ใช่ตัวเลข (ถ้ามี = เคยถูกแก้ตรง ๆ ก่อน migration นี้):
--   select id, user_id, created_at, ai_result from public.analyses
--   where ai_result is not null and not (
--     coalesce(jsonb_typeof(ai_result -> 'om_value'), 'null') in ('number', 'null') and
--     coalesce(jsonb_typeof(ai_result -> 'p_value'),  'null') in ('number', 'null') and
--     coalesce(jsonb_typeof(ai_result -> 'k_value'),  'null') in ('number', 'null'));
