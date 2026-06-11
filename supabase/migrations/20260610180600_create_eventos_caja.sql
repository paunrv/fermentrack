-- Eventos de trazabilidad por caja (recepción · salida · entrega)
-- RLS vía caja padre · log inmutable (solo INSERT)

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
create table if not exists public.eventos_caja (
  id uuid primary key default gen_random_uuid(),
  caja_id uuid not null references public.cajas_distribuidor(id) on delete restrict,
  tipo text not null check (tipo in ('recepcion', 'salida_bodega', 'entrega')),
  trabajador_id uuid not null references public.trabajadores(id) on delete restrict,
  pedido_id uuid references public.pedidos(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists eventos_caja_caja_id_idx
  on public.eventos_caja (caja_id);

create index if not exists eventos_caja_trabajador_id_idx
  on public.eventos_caja (trabajador_id);

create index if not exists eventos_caja_pedido_id_idx
  on public.eventos_caja (pedido_id)
  where pedido_id is not null;

create index if not exists eventos_caja_tipo_idx
  on public.eventos_caja (tipo);

-- -----------------------------------------------------------------------------
-- RLS (vía cajas_distribuidor padre)
-- -----------------------------------------------------------------------------
alter table public.eventos_caja enable row level security;

drop policy if exists eventos_caja_select on public.eventos_caja;
create policy eventos_caja_select on public.eventos_caja
  for select
  using (exists (
    select 1
    from public.cajas_distribuidor c
    where c.id = caja_id
      and proof.row_belongs_to_requester(c.clerk_id, c.profile_type_v2)
  ));

drop policy if exists eventos_caja_insert on public.eventos_caja;
create policy eventos_caja_insert on public.eventos_caja
  for insert
  with check (exists (
    select 1
    from public.cajas_distribuidor c
    where c.id = caja_id
      and proof.row_belongs_to_requester(c.clerk_id, c.profile_type_v2)
  ));

grant select, insert on public.eventos_caja to authenticated, service_role;

notify pgrst, 'reload schema';
