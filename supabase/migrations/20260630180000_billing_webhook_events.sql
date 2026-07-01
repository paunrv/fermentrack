-- Epic #3 issue #11 — idempotencia webhooks Stripe
begin;

create table if not exists public.billing_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

comment on table public.billing_webhook_events is
  'Eventos Stripe procesados (idempotencia). Solo service role.';

alter table public.billing_webhook_events enable row level security;

commit;
