-- Aplicación de pagos a pedidos (N:M pago ↔ pedido)

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
create table if not exists public.pagos_pedidos (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references public.pagos(id) on delete restrict,
  pedido_id uuid not null references public.pedidos(id) on delete restrict,
  monto_aplicado numeric(12, 2) not null,
  unique (pago_id, pedido_id)
);

create index if not exists pagos_pedidos_pago_id_idx
  on public.pagos_pedidos (pago_id);

create index if not exists pagos_pedidos_pedido_id_idx
  on public.pagos_pedidos (pedido_id);

-- -----------------------------------------------------------------------------
-- RLS (vía pagos padre)
-- -----------------------------------------------------------------------------
alter table public.pagos_pedidos enable row level security;

drop policy if exists pagos_pedidos_select on public.pagos_pedidos;
create policy pagos_pedidos_select on public.pagos_pedidos
  for select
  using (exists (
    select 1
    from public.pagos p
    where p.id = pago_id
      and proof.row_belongs_to_requester(p.clerk_id, p.profile_type_v2)
  ));

drop policy if exists pagos_pedidos_insert on public.pagos_pedidos;
create policy pagos_pedidos_insert on public.pagos_pedidos
  for insert
  with check (exists (
    select 1
    from public.pagos p
    where p.id = pago_id
      and proof.row_belongs_to_requester(p.clerk_id, p.profile_type_v2)
  ));

grant select, insert on public.pagos_pedidos to authenticated, service_role;

notify pgrst, 'reload schema';
