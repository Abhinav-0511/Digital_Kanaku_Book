-- Row Level Security: every user-owned table is only ever readable/writable
-- by its owner. This is the final, database-enforced privilege boundary —
-- the application never uses the service-role key, so these policies are
-- the only thing standing between one user's data and another's.

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.parties enable row level security;
alter table public.loads enable row level security;

-- profiles ------------------------------------------------------------------
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policy: rows are created only by handle_new_user()
-- (security definer trigger) and deleted only via the auth.users cascade.

-- companies -------------------------------------------------------------
create policy "companies_select_own"
  on public.companies for select
  using (auth.uid() = user_id);

create policy "companies_insert_own"
  on public.companies for insert
  with check (auth.uid() = user_id);

create policy "companies_update_own"
  on public.companies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "companies_delete_own"
  on public.companies for delete
  using (auth.uid() = user_id);

-- parties -----------------------------------------------------------------
create policy "parties_select_own"
  on public.parties for select
  using (auth.uid() = user_id);

create policy "parties_insert_own"
  on public.parties for insert
  with check (auth.uid() = user_id);

create policy "parties_update_own"
  on public.parties for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "parties_delete_own"
  on public.parties for delete
  using (auth.uid() = user_id);

-- loads ---------------------------------------------------------------------
create policy "loads_select_own"
  on public.loads for select
  using (auth.uid() = user_id);

create policy "loads_insert_own"
  on public.loads for insert
  with check (auth.uid() = user_id);

create policy "loads_update_own"
  on public.loads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "loads_delete_own"
  on public.loads for delete
  using (auth.uid() = user_id);
