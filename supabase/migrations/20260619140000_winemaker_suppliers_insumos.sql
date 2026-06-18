-- PROOF · Winemaker — proveedores de insumos + taxonomía + líneas de documento
-- Aditivo · idempotente

do $$ begin
  create type public.wm_supply_kind as enum (
    'uva',
    'corcho',
    'botella',
    'etiqueta',
    'caja',
    'tapa',
    'sulfito',
    'levadura',
    'clarificante',
    'barrica',
    'energia',
    'mano_obra',
    'analisis',
    'flete',
    'equipo',
    'limpieza',
    'otro'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- wm_suppliers (proveedores de insumos — catálogo por bodega)
-- -----------------------------------------------------------------------------
create table if not exists public.wm_suppliers (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  name text not null,
  name_normalized text not null,
  rfc text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_id, name_normalized)
);

create index if not exists wm_suppliers_clerk_name_idx
  on public.wm_suppliers (clerk_id, name);

-- -----------------------------------------------------------------------------
-- wm_documents · proveedor principal del ticket
-- -----------------------------------------------------------------------------
alter table public.wm_documents
  add column if not exists supplier_id uuid references public.wm_suppliers (id) on delete set null;

create index if not exists wm_documents_supplier_idx
  on public.wm_documents (supplier_id)
  where supplier_id is not null;

-- -----------------------------------------------------------------------------
-- wm_document_lines (líneas clasificadas: uva+cabernet, corchos, botellas…)
-- -----------------------------------------------------------------------------
create table if not exists public.wm_document_lines (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  document_id uuid not null references public.wm_documents (id) on delete cascade,
  supplier_id uuid references public.wm_suppliers (id) on delete set null,
  supply_kind public.wm_supply_kind not null default 'otro',
  varietal text not null default '',
  description text not null default '',
  quantity numeric(14, 3) check (quantity is null or quantity >= 0),
  unit text not null default '',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  line_index smallint not null default 0 check (line_index >= 0),
  created_at timestamptz not null default now()
);

create index if not exists wm_document_lines_document_idx
  on public.wm_document_lines (document_id, line_index);

create index if not exists wm_document_lines_kind_idx
  on public.wm_document_lines (clerk_id, supply_kind);

-- -----------------------------------------------------------------------------
-- wm_production_costs · trazabilidad insumo/proveedor
-- -----------------------------------------------------------------------------
alter table public.wm_production_costs
  add column if not exists supplier_id uuid references public.wm_suppliers (id) on delete set null;

alter table public.wm_production_costs
  add column if not exists supply_kind public.wm_supply_kind;

alter table public.wm_production_costs
  add column if not exists varietal text not null default '';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.wm_suppliers enable row level security;
alter table public.wm_document_lines enable row level security;

do $pol$
declare
  t text;
  tables text[] := array['wm_suppliers'];
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

drop policy if exists wm_document_lines_select on public.wm_document_lines;
create policy wm_document_lines_select on public.wm_document_lines
  for select using (proof.winemaker_row_owned(clerk_id));

drop policy if exists wm_document_lines_insert on public.wm_document_lines;
create policy wm_document_lines_insert on public.wm_document_lines
  for insert with check (proof.winemaker_row_owned(clerk_id));

revoke update, delete on public.wm_document_lines from authenticated, anon;
