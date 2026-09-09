-- Name/vehicle-number search uses `ilike '%text%'` (substring match, so the
-- user can find "L and T" by typing "and"). A plain btree index can't serve
-- a leading-wildcard pattern, so every search/suggestion lookup was doing a
-- sequential scan. pg_trgm's GIN indexes make ilike '%text%' fast without
-- changing any query — the planner picks them up automatically.

create extension if not exists "pg_trgm";

create index companies_name_trgm_idx on public.companies using gin (name_normalized gin_trgm_ops);
create index parties_name_trgm_idx on public.parties using gin (name_normalized gin_trgm_ops);
create index loads_vehicle_trgm_idx on public.loads using gin (vehicle_number_normalized gin_trgm_ops);
