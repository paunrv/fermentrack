-- Epic A (#35) · Issue A1 (#39): explicit pipeline stage on lots + STAGE_CHANGED event
-- Spec: docs/WINEMAKER-UX-SPEC.md

create type public.lot_etapa as enum (
  'cosecha',
  'analisis',
  'fermentacion',
  'malolactica',
  'crianza',
  'embotellado'
);

alter table public.lots
  add column etapa public.lot_etapa;

create or replace function public.map_stage_to_etapa(p_stage text)
returns public.lot_etapa
language sql
immutable
as $$
  select case p_stage
    when 'harvest' then 'cosecha'::public.lot_etapa
    when 'fermentation' then 'fermentacion'::public.lot_etapa
    when 'malolactic' then 'malolactica'::public.lot_etapa
    when 'aging' then 'crianza'::public.lot_etapa
    when 'bottling' then 'embotellado'::public.lot_etapa
    when 'bottled' then 'embotellado'::public.lot_etapa
    else 'cosecha'::public.lot_etapa
  end;
$$;

-- Backfill from current_stage; default cosecha when unknown
update public.lots
set etapa = public.map_stage_to_etapa(current_stage)
where etapa is null;

alter table public.lots
  alter column etapa set default 'cosecha'::public.lot_etapa,
  alter column etapa set not null;

create index lots_organization_id_etapa_idx
  on public.lots (organization_id, etapa);

create or replace function public.lot_etapa_rank(p_etapa public.lot_etapa)
returns int
language sql
immutable
as $$
  select case p_etapa
    when 'cosecha' then 1
    when 'analisis' then 2
    when 'fermentacion' then 3
    when 'malolactica' then 4
    when 'crianza' then 5
    when 'embotellado' then 6
    else 0
  end;
$$;

create or replace function public.sync_lot_etapa_before_write()
returns trigger
language plpgsql
as $$
begin
  if new.etapa is null then
    if new.current_stage is not null then
      new.etapa := public.map_stage_to_etapa(new.current_stage);
    else
      new.etapa := 'cosecha'::public.lot_etapa;
    end if;
  end if;
  return new;
end;
$$;

create trigger lots_sync_etapa_before_insert
  before insert on public.lots
  for each row
  execute function public.sync_lot_etapa_before_write();

create or replace function public.project_lot_stage_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stage text;
  new_etapa public.lot_etapa;
  explicit_etapa public.lot_etapa;
begin
  if new.lot_id is null then
    return new;
  end if;

  if new.event_type = 'STAGE_CHANGED' then
    begin
      explicit_etapa := (new.payload ->> 'to_etapa')::public.lot_etapa;
    exception
      when others then
        return new;
    end;

    update public.lots l
    set etapa = explicit_etapa
    where l.id = new.lot_id;

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

  new_etapa := case new.event_type
    when 'HARVEST_STARTED' then 'cosecha'::public.lot_etapa
    when 'GRAPE_RECEIVED' then 'cosecha'::public.lot_etapa
    when 'ANALYSIS_STARTED' then 'analisis'::public.lot_etapa
    when 'ANALYSIS_COMPLETED' then 'analisis'::public.lot_etapa
    when 'FERMENTATION_STARTED' then 'fermentacion'::public.lot_etapa
    when 'MALOLACTIC_STARTED' then 'malolactica'::public.lot_etapa
    when 'AGING_STARTED' then 'crianza'::public.lot_etapa
    when 'BOTTLING_STARTED' then 'embotellado'::public.lot_etapa
    when 'BOTTLING_COMPLETED' then 'embotellado'::public.lot_etapa
    else null
  end;

  if new_stage is not null then
    update public.lots l
    set current_stage = new_stage
    where l.id = new.lot_id
      and public.lot_stage_rank(new_stage) > public.lot_stage_rank(l.current_stage);
  end if;

  if new_etapa is not null then
    update public.lots l
    set etapa = new_etapa
    where l.id = new.lot_id
      and public.lot_etapa_rank(new_etapa) > public.lot_etapa_rank(l.etapa);
  end if;

  return new;
end;
$$;
