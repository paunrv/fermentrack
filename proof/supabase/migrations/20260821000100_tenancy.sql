-- =============================================================================
-- PROOF · Cycle 1 · Step 1 — Tenancy
--
-- Organization is the tenant. RLS exists from this, the first migration.
-- There is no feature in this file: no lots, no vessels, no events. Only the
-- boundary those things will later live inside.
--
-- Assumes Supabase provides: schema `auth`, table `auth.users`,
-- function `auth.uid()`, and roles `anon` / `authenticated` / `service_role`.
-- For local testing those are emulated by tests/rls/00_supabase_shim.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- `app` schema — security primitives and internal helpers.
--
-- Deliberately not `public`: PostgREST exposes `public`, so a SECURITY DEFINER
-- helper living there becomes a callable API endpoint. These must not be.
-- -----------------------------------------------------------------------------
create schema if not exists app;

revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- Environment identity.
--
-- One row, asserted by the database itself, so any tool can verify what it is
-- connected to before acting. Never infer environment from a project name.
-- -----------------------------------------------------------------------------
create table if not exists app.environment (
  id          boolean primary key default true check (id),
  name        text not null check (name in ('development', 'staging', 'production')),
  label       text,
  created_at  timestamptz not null default now()
);

comment on table app.environment is
  'Single-row environment assertion. Read this before running anything destructive.';


-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.organization_status as enum ('active', 'suspended', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_role as enum ('owner', 'admin', 'operator', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_status as enum ('active', 'revoked');
exception when duplicate_object then null; end $$;

-- Development data and Aldo's real operation will share this database for
-- months. The moment they become indistinguishable, every number PROOF reports
-- stops being citable. One column, from the start.
do $$ begin
  create type public.data_origin as enum ('real', 'synthetic');
exception when duplicate_object then null; end $$;


-- -----------------------------------------------------------------------------
-- profiles — local mirror of auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- organizations — the tenant
-- -----------------------------------------------------------------------------
create table if not exists public.organizations (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  status       public.organization_status not null default 'active',
  data_origin  public.data_origin not null default 'real',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.organizations.data_origin is
  'real = an actual operation. synthetic = invented for development. Never mix silently.';


-- -----------------------------------------------------------------------------
-- memberships — which user may operate in which organization, and as what
--
-- `on delete restrict` on both sides is deliberate: deleting an organization or
-- a user that still has memberships must be an explicit, deliberate act rather
-- than a cascade nobody noticed.
-- -----------------------------------------------------------------------------
create table if not exists public.memberships (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  user_id          uuid not null references auth.users (id) on delete restrict,
  role             public.membership_role not null default 'operator',
  status           public.membership_status not null default 'active',
  invited_at       timestamptz,
  accepted_at      timestamptz,
  revoked_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists memberships_user_idx
  on public.memberships (user_id) where status = 'active';

create index if not exists memberships_org_idx
  on public.memberships (organization_id, status);


-- -----------------------------------------------------------------------------
-- Security primitives.
--
-- Every future tenant-scoped table asks its authorization question through
-- these two functions and no other way. The legacy system's breach came from
-- authorization being a per-function convention that was applied unevenly;
-- one canonical implementation is the fix.
--
-- SECURITY DEFINER is required here: the membership lookup must bypass RLS on
-- `memberships`, or the policy on `memberships` would recurse into itself.
-- `set search_path = ''` with fully-qualified names prevents search-path
-- hijacking, and `auth.uid()` is wrapped in a scalar subquery so the planner
-- evaluates it once per query rather than once per row.
-- -----------------------------------------------------------------------------
create or replace function app.is_member_of(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

comment on function app.is_member_of(uuid) is
  'True when the current user holds an active membership in an active organization. '
  'A suspended or archived organization locks out every member, by design.';


create or replace function app.has_org_role(
  p_organization_id uuid,
  p_roles           public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
      and m.role = any (p_roles)
  );
$$;

comment on function app.has_org_role(uuid, public.membership_role[]) is
  'Role-aware form of is_member_of. Write policies in later cycles use this.';


create or replace function app.shares_org_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs
      on theirs.organization_id = mine.organization_id
    join public.organizations o
      on o.id = mine.organization_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.user_id = p_user_id
      and theirs.status = 'active'
      and o.status = 'active'
  );
$$;

comment on function app.shares_org_with(uuid) is
  'True when the current user and the given user share an active organization. '
  'Lets teammates resolve each other''s names without exposing the user table.';


-- -----------------------------------------------------------------------------
-- Membership administration — service role only.
--
-- Cycle 1 has no invitation flow, so this is how a person is attached to an
-- organization: deliberately, from the server, by someone holding the service
-- key. Both functions are idempotent, because onboarding that cannot be safely
-- retried is onboarding that fails halfway and leaves nobody sure what exists.
--
-- These are the only write paths into `memberships` outside a raw service-role
-- connection, and `authenticated` cannot reach them.
-- -----------------------------------------------------------------------------
create or replace function app.grant_membership(
  p_organization_slug text,
  p_user_email        text,
  p_role              public.membership_role default 'operator'
)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_user_id         uuid;
  v_row             public.memberships;
begin
  select id into v_organization_id
  from public.organizations
  where slug = p_organization_slug;

  if v_organization_id is null then
    raise exception 'no organization with slug %', p_organization_slug
      using errcode = 'no_data_found';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_user_email);

  if v_user_id is null then
    raise exception 'no user with email % — they must sign in once before being granted a membership', p_user_email
      using errcode = 'no_data_found';
  end if;

  insert into public.memberships (organization_id, user_id, role, status, accepted_at)
  values (v_organization_id, v_user_id, p_role, 'active', now())
  on conflict (organization_id, user_id) do update
    set role        = excluded.role,
        status      = 'active',
        revoked_at  = null,
        accepted_at = coalesce(memberships.accepted_at, now())
  returning * into v_row;

  return v_row;
end;
$$;


create or replace function app.revoke_membership(
  p_organization_slug text,
  p_user_email        text
)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.memberships;
begin
  update public.memberships m
     set status     = 'revoked',
         revoked_at = coalesce(m.revoked_at, now())
    from public.organizations o, auth.users u
   where o.id = m.organization_id
     and u.id = m.user_id
     and o.slug = p_organization_slug
     and lower(u.email) = lower(p_user_email)
  returning m.* into v_row;

  if v_row.id is null then
    raise exception 'no membership for % in %', p_user_email, p_organization_slug
      using errcode = 'no_data_found';
  end if;

  return v_row;
end;
$$;

revoke all on function app.grant_membership(text, text, public.membership_role) from public, anon, authenticated;
revoke all on function app.revoke_membership(text, text)                        from public, anon, authenticated;
grant execute on function app.grant_membership(text, text, public.membership_role) to service_role;
grant execute on function app.revoke_membership(text, text)                        to service_role;


-- -----------------------------------------------------------------------------
-- Housekeeping triggers
-- -----------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

drop trigger if exists organizations_touch on public.organizations;
create trigger organizations_touch before update on public.organizations
  for each row execute function app.touch_updated_at();

drop trigger if exists memberships_touch on public.memberships;
create trigger memberships_touch before update on public.memberships
  for each row execute function app.touch_updated_at();


-- A profile row appears the moment an auth user does, so nothing downstream
-- has to cope with a member who has no profile.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_user();


-- -----------------------------------------------------------------------------
-- Row Level Security
--
-- Read-only for `authenticated` in Cycle 1. Organizations and memberships are
-- created server-side with the service role; there is no self-serve signup and
-- no invitation flow yet, so no client write path should exist. Absent write
-- policies deny writes — but the grants below deny them a second time, because
-- one layer of protection is not a boundary.
-- -----------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships   enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (app.is_member_of(id));

drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
  for select to authenticated
  using (app.is_member_of(organization_id));

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_select_org_peers on public.profiles;
create policy profiles_select_org_peers on public.profiles
  for select to authenticated
  using (app.shares_org_with(id));


-- -----------------------------------------------------------------------------
-- Grants
--
-- Default-deny. The legacy system leaked because tables were reachable through
-- the Data API by default; revoking the default privilege means a table added
-- in a later migration is unreachable until someone grants it deliberately.
-- -----------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles      to authenticated;
grant select on public.organizations to authenticated;
grant select on public.memberships   to authenticated;

-- The service role writes, but it does not delete. Stating these grants here
-- rather than inheriting whatever a hosted project happens to default to keeps
-- the migration self-contained — the repository, not the dashboard, decides.
--
-- Withholding DELETE is deliberate: an organization or a membership should not
-- be removable by a leaked service key or a mistaken script. Ending access is
-- a revocation, which is recorded; removing the record of it requires a
-- deliberate act by someone holding rights this application never uses.
grant select, insert, update on public.profiles      to service_role;
grant select, insert, update on public.organizations to service_role;
grant select, insert, update on public.memberships   to service_role;

revoke delete, truncate on public.profiles      from service_role;
revoke delete, truncate on public.organizations from service_role;
revoke delete, truncate on public.memberships   from service_role;

grant execute on function app.is_member_of(uuid)                             to authenticated, service_role;
grant execute on function app.has_org_role(uuid, public.membership_role[])   to authenticated, service_role;
grant execute on function app.shares_org_with(uuid)                          to authenticated, service_role;

-- `anon` gets nothing at all. There are no anonymous reads and no anonymous
-- writes anywhere in PROOF.
