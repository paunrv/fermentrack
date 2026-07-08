-- PROOF · Labels + cases — cierre blend → etiqueta → cajas (Aldo + Silvana Pijoan)
-- Embotellar el lote blend genera identidad comercial (labels) e inventario (label_cases).
-- Futuro: label_cases conecta con inventario distribuidor (movimientos_stock) — no ahora.

begin;

-- -----------------------------------------------------------------------------
-- labels — producto terminado / identidad comercial (distinto del lote físico)
-- -----------------------------------------------------------------------------
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lot_id uuid references public.lots (id) on delete set null,
  name text not null,
  vintage_year int check (vintage_year is null or (vintage_year >= 1800 and vintage_year <= 2200)),
  bottle_volume_ml int not null default 750 check (bottle_volume_ml > 0),
  notes text,
  unique (organization_id, name, vintage_year)
);

create index if not exists labels_organization_id_idx
  on public.labels (organization_id);

create index if not exists labels_lot_id_idx
  on public.labels (lot_id)
  where lot_id is not null;

comment on table public.labels is
  'Modelo PROOF de producción (etiqueta vinculada a lot_id + lot_relationships). '
  'Coexiste temporalmente con wm_etiquetas (Epic D, catálogo comercial sin vínculo a lote). '
  'Convergencia pendiente cuando la UI migre al modelo unificado — decidir entonces si wm_etiquetas '
  'se absorbe en labels o se conecta por FK.';

comment on column public.labels.vintage_year is
  'Añada comercial; puede diferir del vintage técnico del lote.';

-- -----------------------------------------------------------------------------
-- label_cases — inventario producido (puente futuro al distribuidor)
-- -----------------------------------------------------------------------------
create table if not exists public.label_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  case_count int check (case_count is null or case_count >= 0),
  bottles_per_case int not null default 12 check (bottles_per_case > 0),
  total_bottles int check (total_bottles is null or total_bottles >= 0),
  bottled_at date,
  notes text
);

create index if not exists label_cases_organization_id_idx
  on public.label_cases (organization_id);

create index if not exists label_cases_label_id_idx
  on public.label_cases (label_id);

comment on table public.label_cases is
  'Inventario embotellado por etiqueta (cajas / botellas). '
  'Intención futura: conectar con movimientos_stock del distribuidor; sin FK aún.';

-- -----------------------------------------------------------------------------
-- Integridad — lot y label deben pertenecer a la misma org
-- -----------------------------------------------------------------------------
create or replace function public.label_assert_lot_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lot_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.lots l
    where l.id = new.lot_id
      and l.organization_id = new.organization_id
  ) then
    raise exception 'label_lot_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists labels_lot_org on public.labels;
create trigger labels_lot_org
  before insert or update on public.labels
  for each row
  execute function public.label_assert_lot_org();

create or replace function public.label_case_sync_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select lb.organization_id
  into new.organization_id
  from public.labels lb
  where lb.id = new.label_id;

  if new.organization_id is null then
    raise exception 'label_not_found';
  end if;

  return new;
end;
$$;

drop trigger if exists label_cases_sync_org on public.label_cases;
create trigger label_cases_sync_org
  before insert on public.label_cases
  for each row
  execute function public.label_case_sync_organization_id();

-- -----------------------------------------------------------------------------
-- Convención event types — blend y embotellado (append-only en public.events)
-- -----------------------------------------------------------------------------
comment on column public.events.event_type is
  'Catálogo operativo incluye, entre otros: '
  'VESSEL_ASSIGNMENT — payload { vessel_id, lot_id }; '
  'VESSEL_MOVE — payload { vessel_id, lot_id, from_vessel_id? }; '
  'BLEND_COMPLETED — payload { child_lot_id, source: [{ lot_id, volume_liters }] }; '
  'BOTTLED — payload { label_id, case_count, total_bottles }.';

-- -----------------------------------------------------------------------------
-- RLS — full CRUD
-- -----------------------------------------------------------------------------
alter table public.labels enable row level security;
alter table public.label_cases enable row level security;

drop policy if exists labels_select on public.labels;
create policy labels_select on public.labels
  for select using (public.organization_ids() @> array[organization_id]);

drop policy if exists labels_insert on public.labels;
create policy labels_insert on public.labels
  for insert with check (public.organization_ids() @> array[organization_id]);

drop policy if exists labels_update on public.labels;
create policy labels_update on public.labels
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);

drop policy if exists labels_delete on public.labels;
create policy labels_delete on public.labels
  for delete using (public.organization_ids() @> array[organization_id]);

drop policy if exists label_cases_select on public.label_cases;
create policy label_cases_select on public.label_cases
  for select using (public.organization_ids() @> array[organization_id]);

drop policy if exists label_cases_insert on public.label_cases;
create policy label_cases_insert on public.label_cases
  for insert with check (public.organization_ids() @> array[organization_id]);

drop policy if exists label_cases_update on public.label_cases;
create policy label_cases_update on public.label_cases
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);

drop policy if exists label_cases_delete on public.label_cases;
create policy label_cases_delete on public.label_cases
  for delete using (public.organization_ids() @> array[organization_id]);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.labels to authenticated;
grant select, insert, update, delete on public.label_cases to authenticated;

notify pgrst, 'reload schema';

commit;
