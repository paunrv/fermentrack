-- Multi-profile architecture: hasta 5 perfiles por usuario (clerk_id, profile_type_v2)
-- Cada perfil tiene datos aislados (clerk_id + profile_type_v2 en cada tabla de datos).

-- 1) profiles: PK compuesta (clerk_id, profile_type_v2) + id surrogate
alter table profiles add column if not exists profile_type_v2 text;

update profiles
set profile_type_v2 = coalesce(profile_type, 'brewer')
where profile_type_v2 is null;

alter table profiles drop constraint if exists profiles_profile_type_v2_check;
alter table profiles add constraint profiles_profile_type_v2_check
  check (profile_type_v2 in ('brewer', 'winemaker', 'distiller', 'distributor', 'bar'));

alter table profiles add column if not exists id uuid not null default gen_random_uuid();
create unique index if not exists profiles_id_key on profiles(id);

alter table profiles drop constraint if exists profiles_pkey;
alter table profiles add primary key (clerk_id, profile_type_v2);

-- 2) Scope (clerk_id, profile_type_v2) en cada tabla de datos

alter table if exists batches add column if not exists clerk_id text;
alter table if exists batches add column if not exists profile_type_v2 text;
create index if not exists batches_scope_idx on batches(clerk_id, profile_type_v2);

alter table if exists samples add column if not exists clerk_id text;
alter table if exists samples add column if not exists profile_type_v2 text;
create index if not exists samples_scope_idx on samples(clerk_id, profile_type_v2);

alter table if exists activity add column if not exists clerk_id text;
alter table if exists activity add column if not exists profile_type_v2 text;
create index if not exists activity_scope_idx on activity(clerk_id, profile_type_v2);

alter table if exists bottling add column if not exists clerk_id text;
alter table if exists bottling add column if not exists profile_type_v2 text;
create index if not exists bottling_scope_idx on bottling(clerk_id, profile_type_v2);

alter table if exists production_costs add column if not exists clerk_id text;
alter table if exists production_costs add column if not exists profile_type_v2 text;
create index if not exists production_costs_scope_idx on production_costs(clerk_id, profile_type_v2);

alter table if exists warehouse_exits add column if not exists clerk_id text;
alter table if exists warehouse_exits add column if not exists profile_type_v2 text;
create index if not exists warehouse_exits_scope_idx on warehouse_exits(clerk_id, profile_type_v2);

alter table if exists dist_products add column if not exists clerk_id text;
alter table if exists dist_products add column if not exists profile_type_v2 text;
create index if not exists dist_products_scope_idx on dist_products(clerk_id, profile_type_v2);

alter table if exists dist_movements add column if not exists clerk_id text;
alter table if exists dist_movements add column if not exists profile_type_v2 text;
create index if not exists dist_movements_scope_idx on dist_movements(clerk_id, profile_type_v2);

alter table if exists clients add column if not exists clerk_id text;
alter table if exists clients add column if not exists profile_type_v2 text;
create index if not exists clients_scope_idx on clients(clerk_id, profile_type_v2);
