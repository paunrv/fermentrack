-- =============================================================================
-- PROOF · Org tenancy v1 — winemaker identity extensions (epic #3, issue #5)
-- Aditivo: columnas en organizations + helpers RLS por rol.
-- Roadmap: extender org_type CHECK para 'distiller' en migración futura.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. organizations — org_type, billing, Stripe
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists org_type text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_email text,
  add column if not exists plan_status text not null default 'active';

alter table public.organizations
  drop constraint if exists organizations_org_type_check;

alter table public.organizations
  add constraint organizations_org_type_check
  check (org_type in ('winemaker'));

alter table public.organizations
  drop constraint if exists organizations_plan_status_check;

alter table public.organizations
  add constraint organizations_plan_status_check
  check (plan_status in ('active', 'trialing', 'past_due', 'canceled'));

create unique index if not exists organizations_stripe_customer_id_key
  on public.organizations (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists organizations_org_type_idx
  on public.organizations (org_type);

-- Orgs existentes (seed / dev) → winemaker hasta que existan otros org_type
update public.organizations
set org_type = 'winemaker'
where org_type is null;

alter table public.organizations
  alter column org_type set not null;

comment on column public.organizations.org_type is
  'Tipo de tenant. v1: winemaker. Roadmap: distiller vía migración aditiva al CHECK.';

comment on column public.organizations.plan_status is
  'Estado de suscripción Stripe; plan (free/pro) sigue en organizations.plan.';

-- -----------------------------------------------------------------------------
-- 2. Helpers RLS — membresía activa + roles
-- -----------------------------------------------------------------------------
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

grant execute on function public.organization_role(uuid) to authenticated;
grant execute on function public.can_write_org(uuid) to authenticated;
grant execute on function public.can_manage_org(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. INSERT org — v1 exige org_type winemaker
-- -----------------------------------------------------------------------------
drop policy if exists organizations_insert on public.organizations;

create policy organizations_insert on public.organizations
  for insert
  with check (
    auth.uid() is not null
    and org_type = 'winemaker'
  );

commit;
