-- Payments: money received from a party, tracked separately from loads.
-- Mirrors the loads table's per-user scoping and normalized-name search
-- pattern, but has no company side — a payment is just "party paid ₹X on
-- date Y".

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payment_date date not null default (now() at time zone 'Asia/Kolkata')::date,

  party_id uuid not null references public.parties (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_user_date_idx on public.payments using btree (user_id, payment_date desc);
create index payments_user_party_idx on public.payments using btree (user_id, party_id);

-- Guards against a party_id belonging to a different user slipping through
-- (the FK only checks existence, not ownership) — same pattern as
-- calculate_load_amounts() for loads.
create or replace function public.validate_payment()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.parties p where p.id = new.party_id and p.user_id = new.user_id
  ) then
    raise exception 'Invalid party for this user';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_payments_validate
  before insert or update on public.payments
  for each row execute function public.validate_payment();

alter table public.payments enable row level security;

create policy "payments_select_own"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "payments_insert_own"
  on public.payments for insert
  with check (auth.uid() = user_id);

create policy "payments_update_own"
  on public.payments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "payments_delete_own"
  on public.payments for delete
  using (auth.uid() = user_id);
