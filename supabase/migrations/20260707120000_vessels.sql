-- PROOF · Vessels — recursos físicos de bodega (entrevista Aldo, Viñas del Tigre)
-- Ocupación actual: derivada de events (VESSEL_ASSIGNMENT / VESSEL_MOVE), no columna en vessels.
-- Prioridad de enfriamiento: conocimiento operativo vía eventos de temperatura, no tabla chiller.

begin;

-- -----------------------------------------------------------------------------
-- vessels — tanques, barricas, ánforas, etc.
-- -----------------------------------------------------------------------------
create table if not exists public.vessels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  vessel_type text not null check (
    vessel_type in ('steel_tank', 'barrel', 'concrete', 'amphora', 'other')
  ),
  capacity_liters numeric check (capacity_liters is null or capacity_liters > 0),
  material text,
  notes text,
  is_active boolean not null default true,
  unique (organization_id, name)
);

create index if not exists vessels_organization_id_idx
  on public.vessels (organization_id);

create index if not exists vessels_organization_id_active_idx
  on public.vessels (organization_id, is_active)
  where is_active = true;

comment on table public.vessels is
  'Catálogo de contenedores físicos (tanque, barrica, ánfora). '
  'La ocupación por lote se deriva de events, no de una columna aquí.';

comment on column public.vessels.name is
  'Identificador legible en bodega (ej. "Tanque 3", "Barrica Fr-12").';

-- -----------------------------------------------------------------------------
-- Convención event types — ocupación de vessels (append-only en public.events)
-- -----------------------------------------------------------------------------
comment on column public.events.event_type is
  'Catálogo operativo incluye, entre otros: '
  'VESSEL_ASSIGNMENT — payload { vessel_id, lot_id }: asigna lote a vessel; '
  'VESSEL_MOVE — payload { vessel_id, lot_id, from_vessel_id? }: traslado entre vessels. '
  'Un lote puede requerir un vessel por cada vino simultáneo en temporada alta.';

-- -----------------------------------------------------------------------------
-- RLS — full CRUD (vessels se editan y retiran)
-- -----------------------------------------------------------------------------
alter table public.vessels enable row level security;

drop policy if exists vessels_select on public.vessels;
create policy vessels_select on public.vessels
  for select using (public.organization_ids() @> array[organization_id]);

drop policy if exists vessels_insert on public.vessels;
create policy vessels_insert on public.vessels
  for insert with check (public.organization_ids() @> array[organization_id]);

drop policy if exists vessels_update on public.vessels;
create policy vessels_update on public.vessels
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);

drop policy if exists vessels_delete on public.vessels;
create policy vessels_delete on public.vessels
  for delete using (public.organization_ids() @> array[organization_id]);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.vessels to authenticated;

notify pgrst, 'reload schema';

commit;
