-- Payments can now be either money paid out to a party or money received
-- from a company. party_id becomes optional, company_id is added, and a
-- check constraint requires at least one of the two to be set.

alter table public.payments
  add column company_id uuid references public.companies (id) on delete restrict,
  add column payment_type text not null default 'paid' check (payment_type in ('paid', 'received'));

alter table public.payments
  alter column party_id drop not null;

alter table public.payments
  add constraint payments_company_or_party_chk check (company_id is not null or party_id is not null);

create index payments_user_company_idx on public.payments using btree (user_id, company_id);

comment on column public.payments.payment_type is 'Whether this payment was paid out (to a party) or received (from a company). Informational — does not gate which of company_id/party_id may be set.';
comment on column public.payments.company_id is 'Set when this payment involves a company. Optional — a payment must have company_id, party_id, or both.';

-- Re-validate ownership for whichever of company_id/party_id is present.
create or replace function public.validate_payment()
returns trigger
language plpgsql
as $$
begin
  if new.party_id is not null and not exists (
    select 1 from public.parties p where p.id = new.party_id and p.user_id = new.user_id
  ) then
    raise exception 'Invalid party for this user';
  end if;

  if new.company_id is not null and not exists (
    select 1 from public.companies c where c.id = new.company_id and c.user_id = new.user_id
  ) then
    raise exception 'Invalid company for this user';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
