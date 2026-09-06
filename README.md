# Digital Kanakku Book

A production Digital Kanakku Book — replaces the physical load-tracking ledger with a simple, mobile-first web app. v1 covers **Loads + Search + History + Daily Summary**; the data model and code are structured so future Kanakku modules (payments, expenses, reports, ...) can be added without breaking existing data.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Row Level Security)
- Server Actions for all mutations (no client-side service-role usage — RLS is the only privilege boundary)

## Getting started

1. Install dependencies:
   ```
   npm install
   ```
2. Create a Supabase project, then copy `.env.local.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   Never add `SUPABASE_SERVICE_ROLE_KEY` — it is not needed anywhere in this app.
3. Apply the database schema (from `supabase/migrations/`), either:
   - `supabase link --project-ref <ref>` then `supabase db push`, or
   - paste `0001_init_schema.sql` then `0002_rls_policies.sql` into the Supabase SQL Editor, in order.
4. Run the app:
   ```
   npm run dev
   ```

## Database

- `profiles` — one row per user, auto-created on signup (`handle_new_user` trigger). Holds display name and `weight_unit`.
- `companies` / `parties` — per-user lookup tables, deduplicated case-insensitively via `name_normalized`.
- `loads` — the core record. `base_amount`, `gst_amount`, `total_amount` are recomputed by a `before insert or update` trigger (`calculate_load_amounts`) — the database is the source of truth for money math, never the client.
- Row Level Security is enabled on all four tables; every policy scopes to `auth.uid()`. The `loads` trigger also verifies `company_id`/`party_id` belong to the same user before allowing a write.

## Project structure

```
src/
  app/            Next.js routes: (auth) group for login/register/etc, (app) group for the protected app
  components/     UI components (ui/ = shadcn primitives, loads/, dashboard/, search/, layout/, common/)
  lib/
    supabase/     browser/server/middleware Supabase clients
    calculations/ GST/total math (mirrors the DB trigger, used for the live pre-save preview)
    formatting/   currency (en-IN ₹), date (Asia/Kolkata), vehicle number normalization
    validation/   zod schemas
    actions/      Server Actions — the only place mutations happen
  types/          domain types + hand-written Database types
supabase/
  migrations/     schema + RLS, applied in order
```

## Deploying

Deploy to Vercel: connect this repository, set the two `NEXT_PUBLIC_SUPABASE_*` env vars in the Vercel project settings, and deploy. No other configuration is required — there's no server-only secret to manage.

## Security checklist

- RLS enabled and policy-tested on `profiles`, `companies`, `parties`, `loads` — every table scoped to `auth.uid()`.
- No service-role key anywhere in the codebase.
- Passwords handled only through Supabase Auth.
- All money fields use Postgres `numeric`, never floating point; totals are recomputed server-side on every write.
- Client input is validated (zod) before every Server Action write; the database re-validates via `check` constraints.
- Delete requires an explicit confirmation dialog.
- Save buttons disable/show a loading state to prevent duplicate submissions.
- Session persists across refresh (`@supabase/ssr` + middleware); logout clears it and redirects to `/login`.
