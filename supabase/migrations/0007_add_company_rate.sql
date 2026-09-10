-- Company rate: the rate quoted by the company for a load, recorded
-- separately from the party-facing rate. Optional, defaults to 0, and
-- never factored into base_amount/gst_amount/total_amount.

alter table public.loads
  add column company_rate numeric(12, 2) not null default 0 check (company_rate >= 0);

comment on column public.loads.company_rate is 'Rate quoted by the company for this load. Tracked separately from rate/total_amount — informational only.';
