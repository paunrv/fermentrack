-- Distribuidor · cajas físicas (SKU / OC / QR)
-- Nota: public.cajas ya existe (módulo destilador). Esta tabla es cajas_distribuidor.

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
create table if not exists public.cajas_distribuidor (
  id uuid primary key default gen_random_uuid(),
  qr_code text not null unique,
  sku_id uuid not null references public.skus(id) on delete restrict,
  oc_id uuid references public.ordenes_compra_distribuidor(id) on delete set null,
  estado text not null default 'en_bodega'
    check (estado in ('en_bodega', 'en_camino', 'entregado')),
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  created_at timestamptz not null default now()
);

create index if not exists cajas_distribuidor_scope_idx
  on public.cajas_distribuidor (clerk_id, profile_type_v2);

create index if not exists cajas_distribuidor_sku_id_idx
  on public.cajas_distribuidor (sku_id);

create index if not exists cajas_distribuidor_oc_id_idx
  on public.cajas_distribuidor (oc_id)
  where oc_id is not null;

create index if not exists cajas_distribuidor_estado_idx
  on public.cajas_distribuidor (estado);

-- created_at inmutable
create or replace function proof.trg_cajas_distribuidor_guard_created_at()
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

drop trigger if exists cajas_distribuidor_guard_created_at on public.cajas_distribuidor;
create trigger cajas_distribuidor_guard_created_at
  before update on public.cajas_distribuidor
  for each row
  execute function proof.trg_cajas_distribuidor_guard_created_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.cajas_distribuidor enable row level security;

drop policy if exists cajas_distribuidor_select on public.cajas_distribuidor;
create policy cajas_distribuidor_select on public.cajas_distribuidor
  for select
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists cajas_distribuidor_insert on public.cajas_distribuidor;
create policy cajas_distribuidor_insert on public.cajas_distribuidor
  for insert
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists cajas_distribuidor_update on public.cajas_distribuidor;
create policy cajas_distribuidor_update on public.cajas_distribuidor
  for update
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

grant select, insert, update on public.cajas_distribuidor to authenticated, service_role;

notify pgrst, 'reload schema';
