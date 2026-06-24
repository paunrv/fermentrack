create table public.lots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vintage_id uuid references public.vintages (id) on delete set null,
  code text not null,
  product_type text not null default 'wine' check (product_type in ('wine', 'beer', 'spirit')),
  current_stage text check (
    current_stage in ('harvest', 'fermentation', 'malolactic', 'aging', 'bottling', 'bottled')
  ),
  status text not null default 'active' check (status in ('active', 'completed', 'discarded')),
  notes text,
  unique (organization_id, code)
);

create table public.lot_grape_inputs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lot_id uuid not null references public.lots (id) on delete cascade,
  harvest_cut_id uuid references public.harvest_cuts (id) on delete set null,
  vineyard_id uuid references public.vineyards (id) on delete set null,
  varietal_id uuid references public.varietals (id) on delete set null,
  weight_kg numeric not null check (weight_kg > 0),
  received_at timestamptz not null,
  intended_style text,
  notes text
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lot_id uuid references public.lots (id) on delete set null,
  vintage_id uuid references public.vintages (id) on delete set null,
  vineyard_id uuid references public.vineyards (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  actor_id uuid references public.profiles (id) on delete set null,
  evidence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index events_organization_id_occurred_at_idx
  on public.events (organization_id, occurred_at desc);
create index events_lot_id_occurred_at_idx
  on public.events (lot_id, occurred_at desc);
create index events_event_type_idx on public.events (event_type);
create index events_payload_gin_idx on public.events using gin (payload);

create or replace function public.lot_stage_rank(p_stage text)
returns int
language sql
immutable
as $$
  select case p_stage
    when 'harvest' then 1
    when 'fermentation' then 2
    when 'malolactic' then 3
    when 'aging' then 4
    when 'bottling' then 5
    when 'bottled' then 6
    else 0
  end;
$$;

create or replace function public.project_lot_stage_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stage text;
begin
  if new.lot_id is null then
    return new;
  end if;

  new_stage := case new.event_type
    when 'HARVEST_STARTED' then 'harvest'
    when 'GRAPE_RECEIVED' then 'harvest'
    when 'FERMENTATION_STARTED' then 'fermentation'
    when 'MALOLACTIC_STARTED' then 'malolactic'
    when 'AGING_STARTED' then 'aging'
    when 'BOTTLING_STARTED' then 'bottling'
    when 'BOTTLING_COMPLETED' then 'bottled'
    else null
  end;

  if new_stage is null then
    return new;
  end if;

  update public.lots l
  set current_stage = new_stage
  where l.id = new.lot_id
    and public.lot_stage_rank(new_stage) > public.lot_stage_rank(l.current_stage);

  return new;
end;
$$;

create trigger events_project_lot_stage
  after insert on public.events
  for each row
  execute function public.project_lot_stage_from_event();

alter table public.lots enable row level security;
alter table public.lot_grape_inputs enable row level security;
alter table public.events enable row level security;

create policy lots_select on public.lots
  for select using (public.organization_ids() @> array[organization_id]);
create policy lots_insert on public.lots
  for insert with check (public.organization_ids() @> array[organization_id]);
create policy lots_update on public.lots
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);

create policy lot_grape_inputs_select on public.lot_grape_inputs
  for select using (public.organization_ids() @> array[organization_id]);
create policy lot_grape_inputs_insert on public.lot_grape_inputs
  for insert with check (public.organization_ids() @> array[organization_id]);

create policy events_select on public.events
  for select using (public.organization_ids() @> array[organization_id]);
create policy events_insert on public.events
  for insert with check (public.organization_ids() @> array[organization_id]);
create policy events_update on public.events
  for update using (false) with check (false);
create policy events_delete on public.events
  for delete using (false);

create view public.winemaker_notes
  with (security_invoker = true)
as
select
  id,
  lot_id,
  vintage_id,
  payload ->> 'text' as text,
  occurred_at,
  actor_id
from public.events
where event_type in (
  'WINEMAKER_NOTE',
  'VINTAGE_OBSERVATION',
  'TASTING_NOTE',
  'DECISION_RECORDED'
);

grant select, insert, update on public.lots to authenticated;
grant select, insert on public.lot_grape_inputs to authenticated;
grant select, insert on public.events to authenticated;
grant select on public.winemaker_notes to authenticated;
