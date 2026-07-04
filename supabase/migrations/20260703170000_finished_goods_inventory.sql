-- Epic D (#38) · Issue D1 (#53): finished goods — etiquetas, existencias, salidas
-- Spec: docs/WINEMAKER-UX-SPEC.md · docs/INVENTARIO-TERMINADO.md

begin;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.wm_salida_tipo as enum (
    'venta',
    'degustacion',
    'autoconsumo',
    'merma',
    'ajuste'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.wm_salida_origen as enum ('web', 'mcp');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- wm_etiquetas — product catalog per organization
-- -----------------------------------------------------------------------------
create table if not exists public.wm_etiquetas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  nombre text not null,
  varietal text,
  region text,
  tipo text,
  created_at timestamptz not null default now(),
  unique (organization_id, nombre)
);

create index if not exists wm_etiquetas_organization_id_idx
  on public.wm_etiquetas (organization_id);

-- -----------------------------------------------------------------------------
-- wm_existencias — stock line born at bottling (canonical unit = botella)
-- lote_id → public.lots (Epic A pipeline), not wm_wine_lots
-- -----------------------------------------------------------------------------
create table if not exists public.wm_existencias (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  etiqueta_id uuid not null references public.wm_etiquetas (id) on delete restrict,
  lote_id uuid not null references public.lots (id) on delete restrict,
  anada int not null check (anada >= 1900 and anada <= 2100),
  formato text not null check (char_length(btrim(formato)) > 0),
  botellas_por_caja int not null check (botellas_por_caja in (6, 9, 12)),
  botellas_producidas int not null check (botellas_producidas > 0),
  created_at timestamptz not null default now()
);

create index if not exists wm_existencias_organization_id_idx
  on public.wm_existencias (organization_id);

create index if not exists wm_existencias_etiqueta_id_idx
  on public.wm_existencias (organization_id, etiqueta_id);

create index if not exists wm_existencias_lote_id_idx
  on public.wm_existencias (organization_id, lote_id);

-- -----------------------------------------------------------------------------
-- wm_salidas — consumption ledger (never edit stock directly)
-- -----------------------------------------------------------------------------
create table if not exists public.wm_salidas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  existencia_id uuid not null references public.wm_existencias (id) on delete restrict,
  tipo public.wm_salida_tipo not null,
  botellas int not null check (botellas > 0),
  rango_inicio int check (rango_inicio is null or rango_inicio > 0),
  rango_fin int check (rango_fin is null or rango_fin > 0),
  registrado_por uuid not null references public.profiles (id) on delete restrict,
  origen public.wm_salida_origen not null default 'web',
  created_at timestamptz not null default now(),
  check (
    rango_inicio is null
    or rango_fin is null
    or rango_fin >= rango_inicio
  )
);

create index if not exists wm_salidas_existencia_id_idx
  on public.wm_salidas (existencia_id, created_at desc);

create index if not exists wm_salidas_organization_id_idx
  on public.wm_salidas (organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Constraint: sum(salidas) ≤ botellas_producidas per existencia
-- -----------------------------------------------------------------------------
create or replace function public.wm_assert_salida_within_produced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produced int;
  v_consumed int;
begin
  select e.botellas_producidas
  into v_produced
  from public.wm_existencias e
  where e.id = new.existencia_id;

  if v_produced is null then
    raise exception 'existencia_not_found';
  end if;

  select coalesce(sum(s.botellas), 0)
  into v_consumed
  from public.wm_salidas s
  where s.existencia_id = new.existencia_id
    and s.id is distinct from new.id;

  if v_consumed + new.botellas > v_produced then
    raise exception 'salidas_exceed_produced'
      using hint = format(
        'produced=%s consumed=%s requested=%s',
        v_produced,
        v_consumed,
        new.botellas
      );
  end if;

  return new;
end;
$$;

drop trigger if exists wm_salidas_within_produced on public.wm_salidas;
create trigger wm_salidas_within_produced
  before insert on public.wm_salidas
  for each row
  execute function public.wm_assert_salida_within_produced();

-- Align organization_id on salida with parent existencia
create or replace function public.wm_sync_salida_organization_id()
returns trigger
language plpgsql
as $$
begin
  select e.organization_id
  into new.organization_id
  from public.wm_existencias e
  where e.id = new.existencia_id;

  if new.organization_id is null then
    raise exception 'existencia_not_found';
  end if;

  return new;
end;
$$;

drop trigger if exists wm_salidas_sync_org on public.wm_salidas;
create trigger wm_salidas_sync_org
  before insert on public.wm_salidas
  for each row
  execute function public.wm_sync_salida_organization_id();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.wm_etiquetas enable row level security;
alter table public.wm_existencias enable row level security;
alter table public.wm_salidas enable row level security;

-- wm_etiquetas — catalog CRUD for writers
create policy wm_etiquetas_select on public.wm_etiquetas
  for select using (public.wm_row_select_allowed(organization_id));

create policy wm_etiquetas_insert on public.wm_etiquetas
  for insert with check (public.wm_row_write_allowed(organization_id));

create policy wm_etiquetas_update on public.wm_etiquetas
  for update
  using (public.wm_row_write_allowed(organization_id))
  with check (public.wm_row_write_allowed(organization_id));

create policy wm_etiquetas_delete on public.wm_etiquetas
  for delete using (public.wm_row_delete_allowed(organization_id));

-- wm_existencias — append-only stock lines (created at bottling)
create policy wm_existencias_select on public.wm_existencias
  for select using (public.wm_row_select_allowed(organization_id));

create policy wm_existencias_insert on public.wm_existencias
  for insert with check (public.wm_row_write_allowed(organization_id));

create policy wm_existencias_update on public.wm_existencias
  for update using (false) with check (false);

create policy wm_existencias_delete on public.wm_existencias
  for delete using (false);

-- wm_salidas — ledger: select + insert only
create policy wm_salidas_select on public.wm_salidas
  for select using (public.wm_row_select_allowed(organization_id));

create policy wm_salidas_insert on public.wm_salidas
  for insert with check (public.wm_row_write_allowed(organization_id));

create policy wm_salidas_update on public.wm_salidas
  for update using (false) with check (false);

create policy wm_salidas_delete on public.wm_salidas
  for delete using (false);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.wm_etiquetas to authenticated;
grant select, insert on public.wm_existencias to authenticated;
grant select, insert on public.wm_salidas to authenticated;

notify pgrst, 'reload schema';

commit;
