-- A load can now be recorded with no real company or no real party — e.g.
-- self-use goods (no external party to pay) or an internal godown transfer
-- (no external company to bill). company_id/party_id become nullable, with
-- a check constraint requiring at least one of the two to be set.

alter table public.loads
  alter column company_id drop not null,
  alter column party_id drop not null;

alter table public.loads
  add constraint loads_company_or_party_chk check (company_id is not null or party_id is not null);

-- Re-validate ownership for whichever of company_id/party_id is present.
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
