-- =============================================================================
-- PROOF · Winemaker V2 — núcleo (documentos, lotes, costos, eventos)
-- Par arquitectónico de destilador. RLS por clerk_id (JWT sub).
-- =============================================================================

create or replace function proof.winemaker_row_owned(p_clerk_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select proof.is_super_user()
    or p_clerk_id = proof.current_clerk_id();
$$;

grant execute on function proof.winemaker_row_owned(text) to authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.wm_wine_lot_status as enum (
    'fermentation',
    'aging',
    'ready',
    'bottling',
    'bottled',
    'sold_out',
    'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.wm_document_type as enum (
    'invoice',
    'ticket',
    'xml',
    'lab_result',
    'photo',
    'remision',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.wm_cost_category as enum (
    'uva',
    'mano_obra',
    'energia',
    'insumo',
    'barrica',
    'analisis',
    'equipo',
    'limpieza',
    'flete',
    'otro'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.wm_allocation_method as enum (
    'direct',
    'overhead',
    'inventory_purchase'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.wm_event_type as enum (
    'harvest_received',
    'fermentation_started',
    'fermentation_ended',
    'lab_sample_taken',
    'sulfite_added',
    'transfer',
    'aging_started',
    'aging_ended',
    'blending',
    'bottling_completed',
    'insumo_received',
    'insumo_consumed',
    'cost_recorded',
    'document_uploaded',
    'note'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- wm_wine_lots
-- -----------------------------------------------------------------------------
create table if not exists public.wm_wine_lots (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  lot_code text not null,
  name text not null default '',
  varietal text not null default '',
  status public.wm_wine_lot_status not null default 'fermentation',
  vintage smallint check (vintage is null or (vintage >= 1900 and vintage <= 2100)),
  liters_initial numeric(12, 3) check (liters_initial is null or liters_initial > 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_id, lot_code)
);

create index if not exists wm_wine_lots_clerk_status_idx
  on public.wm_wine_lots (clerk_id, status);

-- -----------------------------------------------------------------------------
-- wm_documents (inmutable tras insert — sin UPDATE/DELETE en app)
-- -----------------------------------------------------------------------------
create table if not exists public.wm_documents (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  document_type public.wm_document_type not null default 'other',
  storage_path text,
  original_filename text not null default '',
  vendor text not null default '',
  ocr_text text not null default '',
  parsed_json jsonb not null default '{}'::jsonb,
  document_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists wm_documents_clerk_date_idx
  on public.wm_documents (clerk_id, document_date desc);

-- -----------------------------------------------------------------------------
-- wm_production_costs
-- -----------------------------------------------------------------------------
create table if not exists public.wm_production_costs (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  lot_id uuid references public.wm_wine_lots (id) on delete set null,
  document_id uuid references public.wm_documents (id) on delete set null,
  category public.wm_cost_category not null default 'otro',
  allocation_method public.wm_allocation_method not null default 'direct',
  description text not null default '',
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'MXN',
  cost_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists wm_production_costs_clerk_date_idx
  on public.wm_production_costs (clerk_id, cost_date desc);

create index if not exists wm_production_costs_lot_idx
  on public.wm_production_costs (lot_id)
  where lot_id is not null;

-- -----------------------------------------------------------------------------
-- wm_events (ledger inmutable)
-- -----------------------------------------------------------------------------
create table if not exists public.wm_events (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  lot_id uuid references public.wm_wine_lots (id) on delete set null,
  document_id uuid references public.wm_documents (id) on delete set null,
  event_type public.wm_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists wm_events_clerk_occurred_idx
  on public.wm_events (clerk_id, occurred_at desc);

create index if not exists wm_events_lot_idx
  on public.wm_events (lot_id)
  where lot_id is not null;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.wm_wine_lots enable row level security;
alter table public.wm_documents enable row level security;
alter table public.wm_production_costs enable row level security;
alter table public.wm_events enable row level security;

do $pol$
declare
  t text;
  tables text[] := array[
    'wm_wine_lots',
    'wm_production_costs'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select using (proof.winemaker_row_owned(clerk_id))',
      t, t
    );
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format(
      'create policy %I_insert on public.%I for insert with check (proof.winemaker_row_owned(clerk_id))',
      t, t
    );
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format(
      'create policy %I_update on public.%I for update using (proof.winemaker_row_owned(clerk_id)) with check (proof.winemaker_row_owned(clerk_id))',
      t, t
    );
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format(
      'create policy %I_delete on public.%I for delete using (proof.winemaker_row_owned(clerk_id))',
      t, t
    );
  end loop;
end;
$pol$;

-- wm_documents: solo SELECT + INSERT
drop policy if exists wm_documents_select on public.wm_documents;
create policy wm_documents_select on public.wm_documents
  for select using (proof.winemaker_row_owned(clerk_id));

drop policy if exists wm_documents_insert on public.wm_documents;
create policy wm_documents_insert on public.wm_documents
  for insert with check (proof.winemaker_row_owned(clerk_id));

revoke update, delete on public.wm_documents from authenticated, anon;

-- wm_events: solo SELECT + INSERT
drop policy if exists wm_events_select on public.wm_events;
create policy wm_events_select on public.wm_events
  for select using (proof.winemaker_row_owned(clerk_id));

drop policy if exists wm_events_insert on public.wm_events;
create policy wm_events_insert on public.wm_events
  for insert with check (proof.winemaker_row_owned(clerk_id));

revoke update, delete on public.wm_events from authenticated, anon;
