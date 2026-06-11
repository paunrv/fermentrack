-- Movimientos de stock por SKU (ledger inmutable)
-- Scope: clerk_id + profile_type_v2 · roles vía trabajadores

-- -----------------------------------------------------------------------------
-- Helpers RLS (patron/manager/bodega en scope)
-- -----------------------------------------------------------------------------
create or replace function proof.requester_es_trabajador_activo_scope(
  p_clerk_id text,
  p_profile_type_v2 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trabajadores t
    where t.clerk_user_id = proof.current_clerk_id()
      and t.clerk_id = p_clerk_id
      and t.profile_type_v2 = p_profile_type_v2
      and t.activo = true
  );
$$;

create or replace function proof.requester_es_patron_o_manager_scope(
  p_clerk_id text,
  p_profile_type_v2 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trabajadores t
    where t.clerk_user_id = proof.current_clerk_id()
      and t.clerk_id = p_clerk_id
      and t.profile_type_v2 = p_profile_type_v2
      and t.rol in ('patron', 'manager')
      and t.activo = true
  );
$$;

grant execute on function proof.requester_es_trabajador_activo_scope(text, text)
  to authenticated, service_role;
grant execute on function proof.requester_es_patron_o_manager_scope(text, text)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
create table if not exists public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.skus(id) on delete restrict,
  tipo text not null check (tipo in ('venta', 'compra', 'ajuste', 'cancelacion')),
  cantidad integer not null,
  pedido_id uuid references public.pedidos(id) on delete set null,
  oc_id uuid references public.ordenes_compra_distribuidor(id) on delete set null,
  trabajador_id uuid references public.trabajadores(id) on delete set null,
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  "timestamp" timestamptz not null default now()
);

create index if not exists movimientos_stock_scope_idx
  on public.movimientos_stock (clerk_id, profile_type_v2);

create index if not exists movimientos_stock_sku_id_idx
  on public.movimientos_stock (sku_id);

create index if not exists movimientos_stock_timestamp_idx
  on public.movimientos_stock ("timestamp" desc);

create index if not exists movimientos_stock_pedido_id_idx
  on public.movimientos_stock (pedido_id)
  where pedido_id is not null;

create index if not exists movimientos_stock_oc_id_idx
  on public.movimientos_stock (oc_id)
  where oc_id is not null;

-- -----------------------------------------------------------------------------
-- RLS · inmutable (solo SELECT + INSERT)
-- -----------------------------------------------------------------------------
alter table public.movimientos_stock enable row level security;

drop policy if exists movimientos_stock_select on public.movimientos_stock;
create policy movimientos_stock_select on public.movimientos_stock
  for select
  using (
    proof.row_belongs_to_requester(clerk_id, profile_type_v2)
    or proof.requester_es_patron_o_manager_scope(clerk_id, profile_type_v2)
  );

drop policy if exists movimientos_stock_insert on public.movimientos_stock;
create policy movimientos_stock_insert on public.movimientos_stock
  for insert
  with check (
    proof.row_belongs_to_requester(clerk_id, profile_type_v2)
    or proof.requester_es_trabajador_activo_scope(clerk_id, profile_type_v2)
  );

grant select, insert on public.movimientos_stock to authenticated, service_role;

notify pgrst, 'reload schema';
