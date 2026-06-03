-- PROOF · KPI configuration per user profile (canvas dashboard)
-- Additive migration — safe for production

create table if not exists public.kpi_config (
  id uuid default gen_random_uuid() primary key,
  clerk_id text not null,
  profile_type text not null check (profile_type in ('distiller', 'distributor')),
  slot integer not null check (slot between 0 and 2),
  metric text not null,
  scope text not null default 'all' check (scope in ('all', 'lote_id')),
  scope_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists kpi_config_slot_unique
  on public.kpi_config (clerk_id, profile_type, slot, scope_id)
  nulls not distinct;

alter table public.kpi_config enable row level security;

drop policy if exists kpi_config_select on public.kpi_config;
create policy kpi_config_select on public.kpi_config
  for select using (proof.is_super_user() or clerk_id = proof.current_clerk_id());

drop policy if exists kpi_config_insert on public.kpi_config;
create policy kpi_config_insert on public.kpi_config
  for insert with check (proof.is_super_user() or clerk_id = proof.current_clerk_id());

drop policy if exists kpi_config_update on public.kpi_config;
create policy kpi_config_update on public.kpi_config
  for update
  using (proof.is_super_user() or clerk_id = proof.current_clerk_id())
  with check (proof.is_super_user() or clerk_id = proof.current_clerk_id());

drop policy if exists kpi_config_delete on public.kpi_config;
create policy kpi_config_delete on public.kpi_config
  for delete using (proof.is_super_user() or clerk_id = proof.current_clerk_id());
