-- Pagos de clientes (cartera clientes) · scope clerk_id + profile_type_v2

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  monto numeric(12, 2) not null,
  fecha_pago date not null,
  fecha_vencimiento date,
  estado text not null check (estado in ('pendiente', 'pagado', 'vencido', 'pago_parcial')),
  referencia text,
  banco_origen text,
  banco_destino text,
  imagen_comprobante_url text,
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  created_at timestamptz not null default now()
);

create index if not exists pagos_scope_idx
  on public.pagos (clerk_id, profile_type_v2);

create index if not exists pagos_cliente_id_idx
  on public.pagos (cliente_id);

create index if not exists pagos_estado_idx
  on public.pagos (estado);

create index if not exists pagos_fecha_vencimiento_idx
  on public.pagos (fecha_vencimiento)
  where fecha_vencimiento is not null;

-- created_at inmutable
create or replace function proof.trg_pagos_guard_created_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.created_at is distinct from new.created_at then
    raise exception 'created_at no es modificable';
  end if;
  return new;
end;
$$;

drop trigger if exists pagos_guard_created_at on public.pagos;
create trigger pagos_guard_created_at
  before update on public.pagos
  for each row
  execute function proof.trg_pagos_guard_created_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.pagos enable row level security;

drop policy if exists pagos_select on public.pagos;
create policy pagos_select on public.pagos
  for select
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists pagos_insert on public.pagos;
create policy pagos_insert on public.pagos
  for insert
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists pagos_update on public.pagos;
create policy pagos_update on public.pagos
  for update
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

grant select, insert, update on public.pagos to authenticated, service_role;

notify pgrst, 'reload schema';
