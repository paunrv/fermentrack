-- Epic E7 (#66) — Valle de Guadalupe founding cohort (frozen annual price via Stripe coupon)
begin;

alter table public.organizations
  add column if not exists founding_member_at timestamptz;

comment on column public.organizations.founding_member_at is
  'When set, org is in the founding cohort — checkout auto-applies STRIPE_COUPON_FOUNDING (lifetime annual discount).';

commit;
