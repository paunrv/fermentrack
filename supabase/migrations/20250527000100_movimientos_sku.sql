-- M2 · Ledger PROOF de movimientos por SKU (botellas)
-- Reemplazo futuro de dist_movements; sin backfill en este paso.
-- sku_id text: paridad con skus.id en producción (text, no uuid).
--
-- Nota SQL Editor: las políticas RLS van en un bloque DO con search_path
-- explícito (public, proof). Sin esto, sentencias sueltas pueden fallar con
-- "schema proof does not exist" aunque el schema exista.

create table if not exists public.movimientos_sku (
  id uuid primary key default gen_random_uuid(),
  sku_id text not null references public.skus(id) on delete restrict,
  tipo text not null check (tipo in ('entrada', 'venta', 'donacion', 'merma', 'muestra')),
  cantidad integer not null check (cantidad > 0),
  fecha date not null default current_date,
  notas text,
  client_id uuid references public.clients(id) on delete set null,
  recipient text,
  reason text,
  event text,
  precio_unitario numeric(12, 2),
  total numeric(12, 2),
  moneda text,
  dist_movement_id uuid unique,
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  created_at timestamptz not null default now()
);

create index if not exists movimientos_sku_sku_created_idx
  on public.movimientos_sku (sku_id, created_at desc);

create index if not exists movimientos_sku_scope_fecha_idx
  on public.movimientos_sku (clerk_id, profile_type_v2, fecha desc);

create index if not exists movimientos_sku_client_id_idx
  on public.movimientos_sku (client_id)
  where client_id is not null;

create index if not exists movimientos_sku_dist_movement_id_idx
  on public.movimientos_sku (dist_movement_id)
  where dist_movement_id is not null;

alter table public.movimientos_sku enable row level security;

do $rls$
begin
  perform set_config('search_path', 'public, proof', true);

  execute 'drop policy if exists movimientos_sku_select on public.movimientos_sku';
  execute $p$
    create policy movimientos_sku_select on public.movimientos_sku
    for select
    using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  $p$;

  execute 'drop policy if exists movimientos_sku_insert on public.movimientos_sku';
  execute $p$
    create policy movimientos_sku_insert on public.movimientos_sku
    for insert
    with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  $p$;

  execute 'drop policy if exists movimientos_sku_update on public.movimientos_sku';
  execute $p$
    create policy movimientos_sku_update on public.movimientos_sku
    for update
    using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
    with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  $p$;

  execute 'drop policy if exists movimientos_sku_delete on public.movimientos_sku';
  execute $p$
    create policy movimientos_sku_delete on public.movimientos_sku
    for delete
    using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  $p$;
end;
$rls$;
