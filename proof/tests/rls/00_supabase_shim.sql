-- =============================================================================
-- LOCAL TEST HARNESS ONLY — never applied to a Supabase project.
--
-- Supabase provides `auth.users`, `auth.uid()` and the anon / authenticated /
-- service_role roles. A bare Postgres does not, so this file recreates them
-- faithfully enough that the real migrations and the real RLS policies run
-- unmodified against a local cluster.
--
-- `auth.uid()` mirrors Supabase's own implementation: it reads the request's
-- JWT claims out of a session setting, which is how a test impersonates a user.
-- =============================================================================

create schema if not exists auth;

create table if not exists auth.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique,
  created_at    timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text;
$$;

do $$ begin create role anon          nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role  nologin bypassrls; exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth   to anon, authenticated, service_role;
grant execute on function auth.uid()  to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;

-- The test session connects as superuser and switches roles with SET ROLE.
-- A superuser is exempt from RLS, so these grants let it become a genuinely
-- unprivileged `authenticated` for the duration of each assertion.
grant anon, authenticated, service_role to postgres;
