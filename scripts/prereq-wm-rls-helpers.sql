-- Prerequisite for Jul 2026 winemaker migrations — run BEFORE pending/resume SQL
-- Prod may be missing epic #3 F1 helpers (20260630140000) and F6 wm_row_* (uuid).
-- Safe to re-run (create or replace).

begin;

-- -----------------------------------------------------------------------------
-- Org membership helpers (20260630140000_org_winemaker_identity.sql)
-- Requires: organization_members, auth.uid()
-- -----------------------------------------------------------------------------
create or replace function public.organization_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(organization_id),
    '{}'::uuid[]
  )
  from public.organization_members
  where user_id = auth.uid()
    and status = 'active';
$$;

create or replace function public.organization_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select om.role
  from public.organization_members om
  where om.organization_id = p_org_id
    and om.user_id = auth.uid()
    and om.status = 'active'
  limit 1;
$$;

create or replace function public.can_write_org(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organization_role(p_org_id) in ('owner', 'admin', 'member');
$$;

create or replace function public.can_manage_org(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organization_role(p_org_id) in ('owner', 'admin');
$$;

grant execute on function public.organization_ids() to authenticated;
grant execute on function public.organization_role(uuid) to authenticated;
grant execute on function public.can_write_org(uuid) to authenticated;
grant execute on function public.can_manage_org(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Winemaker row RLS helpers — org-only (20260630190000, section 1)
-- -----------------------------------------------------------------------------
create or replace function public.wm_row_select_allowed(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_organization_id = any(public.organization_ids());
$$;

create or replace function public.wm_row_write_allowed(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_write_org(p_organization_id);
$$;

create or replace function public.wm_row_delete_allowed(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organization_role(p_organization_id) in ('owner', 'admin');
$$;

grant execute on function public.wm_row_select_allowed(uuid) to authenticated;
grant execute on function public.wm_row_write_allowed(uuid) to authenticated;
grant execute on function public.wm_row_delete_allowed(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Legacy dual-read helper (#8 only — dropped again in #12)
-- Restored for prod after 20260624120000 dropped proof.winemaker_row_owned CASCADE.
-- Skip #8 and apply #12 directly when wm_* backfill (#7) is done.
-- -----------------------------------------------------------------------------
create or replace function proof.winemaker_row_owned(p_clerk_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_clerk_id is not null
    and btrim(p_clerk_id) <> ''
    and (
      p_clerk_id = auth.uid()::text
      or (
        p_clerk_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and p_clerk_id::uuid = auth.uid()
      )
      or exists (
        select 1
        from public.proof_profiles pp
        where pp.user_id = auth.uid()
          and pp.profile_type_v2 = 'winemaker'
          and (pp.clerk_id = p_clerk_id or pp.user_id::text = p_clerk_id)
      )
    );
$$;

grant execute on function proof.winemaker_row_owned(text) to authenticated, service_role;

commit;

-- Quick verify (optional — run separately):
-- select proname, pg_get_function_identity_arguments(oid)
-- from pg_proc
-- where pronamespace = 'public'::regnamespace
--   and proname in ('organization_ids','can_write_org','wm_row_select_allowed')
-- order by 1;
