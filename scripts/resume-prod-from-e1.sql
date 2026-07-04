-- Resume from Epic E1 (plan_limites + founding cohort)
-- Run after: prereq-wm-rls-helpers.sql + prereq-org-winemaker-columns.sql
-- Use if D1/C1 already applied via resume-prod-from-d1.sql

-- Epic E (#59) · Issue E1 (#60): plan_limites + org billing fields + limit catalog
-- Spec: docs/WINEMAKER-UX-SPEC.md · docs/PLANES.md

begin;

-- -----------------------------------------------------------------------------
-- plan_limites — canonical limits + default feature flags per tier
-- -----------------------------------------------------------------------------
create table if not exists public.plan_limites (
  plan text primary key check (plan in ('regular', 'pro', 'enterprise', 'trial')),
  lotes_activos int check (lotes_activos is null or lotes_activos > 0),
  etiquetas int check (etiquetas is null or etiquetas > 0),
  memoria_meses int check (memoria_meses is null or memoria_meses > 0),
  max_usuarios int check (max_usuarios is null or max_usuarios > 0),
  features jsonb not null default '{}'::jsonb
);

comment on table public.plan_limites is
  'Plan catalog — null limit = unlimited. Features jsonb gates chat, numeracion_botellas, etc.';

insert into public.plan_limites (plan, lotes_activos, etiquetas, memoria_meses, max_usuarios, features)
values
  (
    'regular',
    5,
    5,
    12,
    1,
    '{"chat": false, "numeracion_botellas": false}'::jsonb
  ),
  (
    'trial',
    5,
    5,
    12,
    1,
    '{"chat": false, "numeracion_botellas": false}'::jsonb
  ),
  (
    'pro',
    20,
    30,
    36,
    null,
    '{"chat": true, "numeracion_botellas": false}'::jsonb
  ),
  (
    'enterprise',
    null,
    null,
    null,
    null,
    '{"chat": true, "numeracion_botellas": true}'::jsonb
  )
on conflict (plan) do update set
  lotes_activos = excluded.lotes_activos,
  etiquetas = excluded.etiquetas,
  memoria_meses = excluded.memoria_meses,
  max_usuarios = excluded.max_usuarios,
  features = excluded.features;

alter table public.plan_limites enable row level security;

create policy plan_limites_select on public.plan_limites
  for select to authenticated
  using (true);

grant select on public.plan_limites to authenticated;

-- -----------------------------------------------------------------------------
-- organizations — billing cycle + trial / renewal anchors
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists billing_cycle text check (billing_cycle in ('monthly', 'annual')),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists primer_registro_at timestamptz,
  add column if not exists renewal_anchor date;

comment on column public.organizations.billing_cycle is 'Stripe cadence when subscribed — monthly or annual.';
comment on column public.organizations.trial_ends_at is 'End of 90-day vendimia trial (no card).';
comment on column public.organizations.primer_registro_at is 'First operational record — memory capacity anchor.';
comment on column public.organizations.renewal_anchor is 'Pre-vendimia renewal date (month/day).';

-- Migrate legacy free → regular; expand plan check
alter table public.organizations drop constraint if exists organizations_plan_check;

update public.organizations
set plan = 'regular'
where plan = 'free';

update public.organizations
set primer_registro_at = coalesce(primer_registro_at, created_at)
where primer_registro_at is null;

update public.organizations
set trial_ends_at = coalesce(trial_ends_at, created_at + interval '90 days')
where plan = 'regular'
  and plan_status = 'trialing'
  and trial_ends_at is null;

alter table public.organizations
  add constraint organizations_plan_check
  check (plan in ('regular', 'pro', 'enterprise', 'trial'));

alter table public.organizations
  alter column plan set default 'trial';

notify pgrst, 'reload schema';

commit;
-- Epic E7 (#66) — Valle de Guadalupe founding cohort (frozen annual price via Stripe coupon)
begin;

alter table public.organizations
  add column if not exists founding_member_at timestamptz;

comment on column public.organizations.founding_member_at is
  'When set, org is in the founding cohort — checkout auto-applies STRIPE_COUPON_FOUNDING (lifetime annual discount).';

commit;
