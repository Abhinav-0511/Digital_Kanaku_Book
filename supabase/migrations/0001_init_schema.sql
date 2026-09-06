-- Digital Kanakku Book — initial schema (Load Details module, v1)
-- Design notes:
--   * All monetary/quantity fields use numeric(...) — never float — for
--     exact decimal arithmetic.
--   * base_amount/gst_amount/total_amount are computed server-side by a
--     trigger below, so a malicious or buggy client can never write an
--     inconsistent total.
--   * name_normalized / vehicle_number_normalized columns exist purely to
--     support fast case/space-insensitive search and duplicate-prevention
--     while preserving the user's original display text untouched.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, created automatically on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  weight_unit text not null default 'kg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user. Created automatically via handle_new_user trigger.';

-- ---------------------------------------------------------------------------
-- companies / parties: simple lookup tables, scoped per user, deduplicated
-- case-insensitively per user via name_normalized.
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  name_normalized text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name_normalized)
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  name_normalized text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name_normalized)
);

create index companies_user_search_idx on public.companies using btree (user_id, name_normalized);
create index parties_user_search_idx on public.parties using btree (user_id, name_normalized);

-- ---------------------------------------------------------------------------
-- loads: the core Kanakku record for a single load entry.
-- ---------------------------------------------------------------------------
create table public.loads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  load_date date not null default (now() at time zone 'Asia/Kolkata')::date,

  vehicle_number text not null check (btrim(vehicle_number) <> ''),
  vehicle_number_normalized text not null,

  company_id uuid not null references public.companies (id) on delete restrict,
  party_id uuid not null references public.parties (id) on delete restrict,

  weight numeric(12, 2) not null check (weight > 0),
  rate numeric(12, 2) not null check (rate >= 0),
  driver_advance numeric(12, 2) not null default 0 check (driver_advance >= 0),

  gst_enabled boolean not null default true,
  gst_percentage numeric(5, 2) not null default 18 check (gst_percentage >= 0 and gst_percentage <= 100),

  -- Computed server-side by trg_loads_calculate below. Not writable directly
  -- from application code in any trustworthy way — always recomputed.
  base_amount numeric(14, 2) not null default 0,
  gst_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index loads_user_date_idx on public.loads using btree (user_id, load_date desc);
create index loads_user_vehicle_idx on public.loads using btree (user_id, vehicle_number_normalized);
create index loads_user_company_idx on public.loads using btree (user_id, company_id);
create index loads_user_party_idx on public.loads using btree (user_id, party_id);

comment on column public.loads.base_amount is 'weight * rate, rounded to 2dp. Recomputed by trigger on every insert/update — never trust client-supplied values.';
comment on column public.loads.gst_amount is 'base_amount * gst_percentage / 100 when gst_enabled, else 0. Recomputed by trigger.';
comment on column public.loads.total_amount is 'base_amount + gst_amount. Recomputed by trigger.';

-- ---------------------------------------------------------------------------
-- Trigger: server-side source of truth for money math on loads.
-- ---------------------------------------------------------------------------
create or replace function public.calculate_load_amounts()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.companies c where c.id = new.company_id and c.user_id = new.user_id
  ) then
    raise exception 'Invalid company for this user';
  end if;

  if not exists (
    select 1 from public.parties p where p.id = new.party_id and p.user_id = new.user_id
  ) then
    raise exception 'Invalid party for this user';
  end if;

  if not new.gst_enabled then
    new.gst_percentage := 0;
  end if;

  new.base_amount := round(new.weight * new.rate, 2);
  new.gst_amount := case
    when new.gst_enabled then round(new.base_amount * new.gst_percentage / 100, 2)
    else 0
  end;
  new.total_amount := new.base_amount + new.gst_amount;
  new.vehicle_number_normalized := upper(regexp_replace(new.vehicle_number, '\s+', '', 'g'));
  new.updated_at := now();

  return new;
end;
$$;

create trigger trg_loads_calculate
  before insert or update on public.loads
  for each row
  execute function public.calculate_load_amounts();

-- ---------------------------------------------------------------------------
-- Generic updated_at maintenance for profiles/companies/parties.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create trigger trg_parties_updated_at
  before update on public.parties
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- Runs as the function owner (security definer) purely to reach into the
-- auth schema on insert — it does not accept any client input beyond what
-- Supabase Auth itself already validated during signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
