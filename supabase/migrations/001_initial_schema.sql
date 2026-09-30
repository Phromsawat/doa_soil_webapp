-- =============================================================================
-- DOA Soil Test Kit — Initial Schema (Phase 1)
-- =============================================================================
-- Tables: profiles, crop_types, crops, nutrients,
--         fertilizer_recommendations, fertilizer_applications,
--         analyses, analysis_images, analysis_results
-- Plus: RLS policies, helper functions, triggers
-- =============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- Helper: auto-update updated_at
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. PROFILES — extra info for auth.users (must come first; is_admin() uses it)
-- =============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  email text,
  full_name text,
  nickname text,
  role text not null default 'user' check (role in ('user', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id, new.phone, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Helper: check if current user is admin (defined AFTER profiles table)
-- =============================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =============================================================================
-- 2. CROP_TYPES — categories: ไม้ผล, พืชไร่, พืชผัก, ข้าว
-- =============================================================================
create table public.crop_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  name_en text,
  unit_basis text not null check (unit_basis in ('per_tree', 'per_rai')),
  order_by int default 0,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

insert into public.crop_types (name, name_en, unit_basis, order_by) values
  ('ไม้ผล', 'Fruit tree', 'per_tree', 1),
  ('พืชไร่', 'Field crop', 'per_rai', 2),
  ('พืชผัก', 'Vegetable', 'per_rai', 3),
  ('ข้าว', 'Rice', 'per_rai', 4);

-- =============================================================================
-- 3. CROPS — actual crops (ทุเรียน, ข้าวโพด, etc.)
-- =============================================================================
create table public.crops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  name_en text,
  crop_type_id uuid not null references public.crop_types(id),
  description text,
  image_url text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, crop_type_id)
);

create index crops_type_idx on public.crops (crop_type_id);

create trigger crops_updated_at
  before update on public.crops
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. NUTRIENTS — lookup: OM, P, K
-- =============================================================================
create table public.nutrients (
  code text primary key,
  name_th text not null,
  name_en text,
  unit text not null,
  description text,
  order_by int default 0
);

insert into public.nutrients (code, name_th, name_en, unit, order_by) values
  ('OM', 'อินทรียวัตถุ', 'Organic Matter', '%', 1),
  ('P',  'ฟอสฟอรัส',    'Phosphorus',     'mg/kg', 2),
  ('K',  'โพแทสเซียม',  'Potassium',      'mg/kg', 3);

-- =============================================================================
-- 5. FERTILIZER_RECOMMENDATIONS — main lookup
--    1 row = 1 combination of (crop × OM range × P range × K range)
-- =============================================================================
create table public.fertilizer_recommendations (
  id uuid primary key default uuid_generate_v4(),
  crop_id uuid not null references public.crops(id) on delete cascade,
  mode text not null default '100%' check (mode in ('100%', '70%')),

  om_min numeric, om_max numeric,
  p_min numeric,  p_max numeric,
  k_min numeric,  k_max numeric,

  target_n     numeric,
  target_p2o5  numeric,
  target_k2o   numeric,
  target_unit  text not null check (target_unit in ('g/tree/year', 'kg/rai')),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recs_crop_idx on public.fertilizer_recommendations (crop_id, mode);

create trigger recs_updated_at
  before update on public.fertilizer_recommendations
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 6. FERTILIZER_APPLICATIONS — concrete fertilizer doses by application round
--    (used by พืชไร่ where the Excel pre-computes specific formulas)
-- =============================================================================
create table public.fertilizer_applications (
  id uuid primary key default uuid_generate_v4(),
  recommendation_id uuid not null references public.fertilizer_recommendations(id) on delete cascade,
  round_number int not null,
  stage_name text,
  formula text not null,
  amount numeric not null,
  unit text not null default 'kg/rai',
  order_by int default 0,
  created_at timestamptz not null default now()
);

create index apps_rec_idx on public.fertilizer_applications (recommendation_id);

-- =============================================================================
-- 7. ANALYSES — user soil-analysis history
-- =============================================================================
create table public.analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  crop_id uuid references public.crops(id) on delete set null,

  input_mode text not null check (input_mode in ('image_upload', 'manual_form')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),

  om_value numeric,
  p_value  numeric,
  k_value  numeric,
  ph_value numeric,

  province text,
  amphur   text,
  district text,
  latitude  numeric,
  longitude numeric,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index analyses_user_idx     on public.analyses (user_id, created_at desc);
create index analyses_crop_idx     on public.analyses (crop_id);
create index analyses_status_idx   on public.analyses (status);

create trigger analyses_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 8. ANALYSIS_IMAGES — uploaded test-plate photos
-- =============================================================================
create table public.analysis_images (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  nutrient_code text not null references public.nutrients(code),
  storage_path text not null,
  public_url text,
  file_size_bytes int,
  width int,
  height int,
  created_at timestamptz not null default now(),
  unique (analysis_id, nutrient_code)
);

create index images_analysis_idx on public.analysis_images (analysis_id);

-- =============================================================================
-- 9. ANALYSIS_RESULTS — fertilizer plan generated for each analysis
-- =============================================================================
create table public.analysis_results (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  recommendation_id uuid references public.fertilizer_recommendations(id) on delete set null,

  recommended_n     numeric,
  recommended_p2o5  numeric,
  recommended_k2o   numeric,
  unit text,
  fertilizer_plan jsonb,

  created_at timestamptz not null default now(),
  unique (analysis_id)
);

create index results_analysis_idx on public.analysis_results (analysis_id);

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================

alter table public.profiles                  enable row level security;
alter table public.crop_types                enable row level security;
alter table public.crops                     enable row level security;
alter table public.nutrients                 enable row level security;
alter table public.fertilizer_recommendations enable row level security;
alter table public.fertilizer_applications   enable row level security;
alter table public.analyses                  enable row level security;
alter table public.analysis_images           enable row level security;
alter table public.analysis_results          enable row level security;

-- ---------- PROFILES ----------
create policy "profiles: self read"   on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles: self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles: admin all"   on public.profiles for all    using (public.is_admin());

-- ---------- REFERENCE DATA ----------
create policy "crop_types: public read" on public.crop_types for select using (true);
create policy "crop_types: admin write" on public.crop_types for all    using (public.is_admin());

create policy "crops: public read"      on public.crops for select using (true);
create policy "crops: admin write"      on public.crops for all    using (public.is_admin());

create policy "nutrients: public read"  on public.nutrients for select using (true);
create policy "nutrients: admin write"  on public.nutrients for all    using (public.is_admin());

create policy "recs: public read"       on public.fertilizer_recommendations for select using (true);
create policy "recs: admin write"       on public.fertilizer_recommendations for all    using (public.is_admin());

create policy "apps: public read"       on public.fertilizer_applications for select using (true);
create policy "apps: admin write"       on public.fertilizer_applications for all    using (public.is_admin());

-- ---------- USER DATA ----------
create policy "analyses: own read"   on public.analyses for select using (auth.uid() = user_id or public.is_admin());
create policy "analyses: own write"  on public.analyses for insert with check (auth.uid() = user_id);
create policy "analyses: own update" on public.analyses for update using (auth.uid() = user_id or public.is_admin());
create policy "analyses: own delete" on public.analyses for delete using (auth.uid() = user_id or public.is_admin());

create policy "images: own read" on public.analysis_images for select
  using (exists (select 1 from public.analyses a where a.id = analysis_id and (a.user_id = auth.uid() or public.is_admin())));
create policy "images: own write" on public.analysis_images for insert
  with check (exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()));
create policy "images: own delete" on public.analysis_images for delete
  using (exists (select 1 from public.analyses a where a.id = analysis_id and (a.user_id = auth.uid() or public.is_admin())));

create policy "results: own read" on public.analysis_results for select
  using (exists (select 1 from public.analyses a where a.id = analysis_id and (a.user_id = auth.uid() or public.is_admin())));
create policy "results: own write" on public.analysis_results for insert
  with check (exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()));
create policy "results: own update" on public.analysis_results for update
  using (exists (select 1 from public.analyses a where a.id = analysis_id and (a.user_id = auth.uid() or public.is_admin())));
