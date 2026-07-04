-- Prerequisite: org winemaker columns (epic #3 F1 — 20260630140000)
-- Run after prereq-wm-rls-helpers.sql, before resume-prod-from-e1.sql
-- Prod was missing plan_status → plan_limites migration fails at line ~485.

begin;

alter table public.organizations
  add column if not exists org_type text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_email text,
  add column if not exists plan_status text;

-- Default existing rows before NOT NULL
update public.organizations
set plan_status = coalesce(plan_status, 'active')
where plan_status is null;

update public.organizations
set org_type = 'winemaker'
where org_type is null;

alter table public.organizations
  alter column plan_status set default 'active';

alter table public.organizations
  alter column plan_status set not null;

alter table public.organizations
  alter column org_type set not null;

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

commit;

-- Verify:
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'organizations'
--   and column_name in ('org_type', 'plan_status', 'features', 'billing_cycle')
-- order by 1;
