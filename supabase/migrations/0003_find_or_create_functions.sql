-- Atomic find-or-create for companies/parties, in one round trip instead of
-- a select + conditional insert (+ retry-on-conflict) from the client.
--
-- `on conflict ... do update set name_normalized = excluded.name_normalized`
-- is a no-op (the value is identical) but, unlike `do nothing`, it still
-- makes Postgres return the existing row via RETURNING — so this preserves
-- the original display `name` on a duplicate while still handing back its
-- id in a single query.
--
-- These run as SECURITY INVOKER (the default) — the INSERT inside still
-- goes through the caller's own RLS policies, so this grants no privilege
-- beyond what the caller already has.

create or replace function public.find_or_create_company(p_user_id uuid, p_name text, p_name_normalized text)
returns table (id uuid, name text)
language sql
as $$
  insert into public.companies (user_id, name, name_normalized)
  values (p_user_id, p_name, p_name_normalized)
  on conflict (user_id, name_normalized)
  do update set name_normalized = excluded.name_normalized
  returning companies.id, companies.name;
$$;

create or replace function public.find_or_create_party(p_user_id uuid, p_name text, p_name_normalized text)
returns table (id uuid, name text)
language sql
as $$
  insert into public.parties (user_id, name, name_normalized)
  values (p_user_id, p_name, p_name_normalized)
  on conflict (user_id, name_normalized)
  do update set name_normalized = excluded.name_normalized
  returning parties.id, parties.name;
$$;

revoke execute on function public.find_or_create_company(uuid, text, text) from public;
grant execute on function public.find_or_create_company(uuid, text, text) to authenticated;

revoke execute on function public.find_or_create_party(uuid, text, text) from public;
grant execute on function public.find_or_create_party(uuid, text, text) to authenticated;
