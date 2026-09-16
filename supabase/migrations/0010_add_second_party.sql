-- Second party support: some loads are split between two parties. party2 is
-- entirely optional and shares the load's single rate/GST settings — only
-- its own weight differs — so it needs its own weight and its own computed
-- base/GST/total columns, mirroring the party1 columns already on loads.
-- total_amount becomes the sum of both parties' totals so every place that
-- already reads total_amount (dashboards, reports) picks up party2 for free.

alter table public.loads
  add column party2_id uuid references public.parties (id) on delete restrict,
  add column party2_weight numeric(12, 2) not null default 0 check (party2_weight >= 0),
  add column party2_base_amount numeric(14, 2) not null default 0,
  add column party2_gst_amount numeric(14, 2) not null default 0,
  add column party2_total_amount numeric(14, 2) not null default 0;

create index loads_user_party2_idx on public.loads using btree (user_id, party2_id);

comment on column public.loads.party2_weight is 'Weight allocated to the second party, billed at the same rate/GST as party1. 0 when there is no second party on this load.';
comment on column public.loads.party2_total_amount is 'party2_weight * rate, plus GST. Recomputed by trigger. Folded into total_amount.';

create or replace function public.calculate_load_amounts()
returns trigger
language plpgsql
as $$
begin
  if new.company_id is not null and not exists (
    select 1 from public.companies c where c.id = new.company_id and c.user_id = new.user_id
  ) then
    raise exception 'Invalid company for this user';
  end if;

  if new.party_id is not null and not exists (
    select 1 from public.parties p where p.id = new.party_id and p.user_id = new.user_id
  ) then
    raise exception 'Invalid party for this user';
  end if;

  if new.party2_id is not null and not exists (
    select 1 from public.parties p where p.id = new.party2_id and p.user_id = new.user_id
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

  new.party2_base_amount := round(new.party2_weight * new.rate, 2);
  new.party2_gst_amount := case
    when new.gst_enabled then round(new.party2_base_amount * new.gst_percentage / 100, 2)
    else 0
  end;
  new.party2_total_amount := new.party2_base_amount + new.party2_gst_amount;

  new.total_amount := new.base_amount + new.gst_amount + new.party2_total_amount;
  new.vehicle_number_normalized := upper(regexp_replace(new.vehicle_number, '\s+', '', 'g'));
  new.updated_at := now();

  return new;
end;
$$;
