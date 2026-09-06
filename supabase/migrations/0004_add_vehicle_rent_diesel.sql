-- Vehicle rent and diesel cost: tracked per load exactly like driver
-- advance — recorded separately, optional, defaults to 0, and never
-- factored into base_amount/gst_amount/total_amount.

alter table public.loads
  add column vehicle_rent numeric(12, 2) not null default 0 check (vehicle_rent >= 0),
  add column diesel_cost numeric(12, 2) not null default 0 check (diesel_cost >= 0);

comment on column public.loads.vehicle_rent is 'Tracked separately from the load total — never subtracted from or added to total_amount.';
comment on column public.loads.diesel_cost is 'Tracked separately from the load total — never subtracted from or added to total_amount.';
