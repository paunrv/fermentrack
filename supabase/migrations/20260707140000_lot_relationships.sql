-- PROOF · Lot relationships — grafo de linaje (entrevista Aldo: proporción exacta vía volumen)
-- Blend produce lote nuevo (child); proporción = volume / sum(volumes) por child_lot_id.

begin;

-- -----------------------------------------------------------------------------
-- lot_relationships — linaje parent → child (blend, split, transfer, rack)
-- -----------------------------------------------------------------------------
create table if not exists public.lot_relationships (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_lot_id uuid not null references public.lots (id) on delete cascade,
  child_lot_id uuid not null references public.lots (id) on delete cascade,
  relationship_type text not null check (
    relationship_type in ('blend', 'split', 'transfer', 'rack')
  ),
  volume_liters_contributed numeric check (
    volume_liters_contributed is null or volume_liters_contributed > 0
  ),
  occurred_at timestamptz not null,
  notes text,
  check (parent_lot_id <> child_lot_id)
);

create index if not exists lot_relationships_child_lot_id_idx
  on public.lot_relationships (child_lot_id);

create index if not exists lot_relationships_parent_lot_id_idx
  on public.lot_relationships (parent_lot_id);

create index if not exists lot_relationships_organization_id_occurred_at_idx
  on public.lot_relationships (organization_id, occurred_at desc);

comment on table public.lot_relationships is
  'Grafo de linaje entre lotes. Append-only: el historial no se edita ni borra. '
  'Para blends, volume_liters_contributed guarda litros aportados; la proporción '
  'exacta (ej. 60/40) se deriva en blend_proportions.';

comment on column public.lot_relationships.volume_liters_contributed is
  'Litros que el parent aportó al child. Proporción = volume / sum(volumes del mismo child).';

-- -----------------------------------------------------------------------------
-- Integridad — parent y child deben pertenecer a la misma org que la fila
-- -----------------------------------------------------------------------------
create or replace function public.lot_relationship_assert_lot_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.lots l
    where l.id = new.parent_lot_id
      and l.organization_id = new.organization_id
  ) then
    raise exception 'lot_relationship_parent_org_mismatch';
  end if;

  if not exists (
    select 1
    from public.lots l
    where l.id = new.child_lot_id
      and l.organization_id = new.organization_id
  ) then
    raise exception 'lot_relationship_child_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists lot_relationships_lot_org on public.lot_relationships;
create trigger lot_relationships_lot_org
  before insert on public.lot_relationships
  for each row
  execute function public.lot_relationship_assert_lot_org();

-- -----------------------------------------------------------------------------
-- Vista blend_proportions — % derivado por child_lot_id (sin recalcular en frontend)
-- -----------------------------------------------------------------------------
create or replace view public.blend_proportions
  with (security_invoker = true)
as
select
  lr.organization_id,
  lr.child_lot_id,
  lr.parent_lot_id,
  lr.volume_liters_contributed,
  sum(lr.volume_liters_contributed) over w as total_volume_liters,
  round(
    100.0 * lr.volume_liters_contributed
      / nullif(sum(lr.volume_liters_contributed) over w, 0),
    2
  ) as proportion_pct
from public.lot_relationships lr
where lr.relationship_type = 'blend'
  and lr.volume_liters_contributed is not null
window w as (partition by lr.child_lot_id);

comment on view public.blend_proportions is
  'Por cada lote blend (child), lista parents con volumen aportado y % derivado '
  '(ej. 60% Cabernet / 40% Merlot).';

-- -----------------------------------------------------------------------------
-- RLS — append-only (SELECT + INSERT), igual que public.events
-- -----------------------------------------------------------------------------
alter table public.lot_relationships enable row level security;

drop policy if exists lot_relationships_select on public.lot_relationships;
create policy lot_relationships_select on public.lot_relationships
  for select using (public.organization_ids() @> array[organization_id]);

drop policy if exists lot_relationships_insert on public.lot_relationships;
create policy lot_relationships_insert on public.lot_relationships
  for insert with check (public.organization_ids() @> array[organization_id]);

drop policy if exists lot_relationships_update on public.lot_relationships;
create policy lot_relationships_update on public.lot_relationships
  for update using (false) with check (false);

drop policy if exists lot_relationships_delete on public.lot_relationships;
create policy lot_relationships_delete on public.lot_relationships
  for delete using (false);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
grant select, insert on public.lot_relationships to authenticated;
grant select on public.blend_proportions to authenticated;

notify pgrst, 'reload schema';

commit;
