-- =============================================================================
-- PROOF · Cycle 1 · Step 2 — The ledger
--
-- Four layers, kept strictly apart:
--
--   PROTOCOL        what we planned to do          protocols, protocol_steps
--        ↓                                          protocol_runs, protocol_run_steps
--   EVENT           what actually happened         events
--        ↓
--   LEDGER          what physically changed        ledger_lines
--        ↓
--   DERIVED STATE   what is true right now         views only, never stored
--
-- Nothing here is wine-specific. The generic primitive is `event_kind`; the
-- winery's own vocabulary ("despalillado", "remontado") lives in `type_key` as
-- data, so a brewery or a distillery needs new rows, not new migrations.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Units
--
-- Netting happens per BASE UNIT, not per dimension. That distinction matters:
-- boxes and bottles are both counts but are not interchangeable, and a system
-- that adds them has invented a quantity. Each family converts only within
-- itself, and cross-family conversion (boxes → kg, bottles → cases) is a
-- derivation with its own uncertainty, deliberately absent here.
-- -----------------------------------------------------------------------------
create table if not exists public.units (
  code       text primary key,
  dimension  text not null check (dimension in ('mass', 'volume', 'count')),
  name       text not null,
  base_code  text not null,
  to_base    numeric(24,12) not null check (to_base > 0)
);

insert into public.units (code, dimension, name, base_code, to_base) values
  ('kg',   'mass',   'kilogram',      'kg',   1),
  ('g',    'mass',   'gram',          'kg',   0.001),
  ('t',    'mass',   'tonne',         'kg',   1000),
  ('lb',   'mass',   'pound',         'kg',   0.45359237),
  ('L',    'volume', 'litre',         'L',    1),
  ('mL',   'volume', 'millilitre',    'L',    0.001),
  ('hL',   'volume', 'hectolitre',    'L',    100),
  ('gal',  'volume', 'US gallon',     'L',    3.785411784),
  ('ea',   'count',  'each',          'ea',   1),
  ('btl',  'count',  'bottle',        'btl',  1),
  ('case', 'count',  'case',          'case', 1),
  ('box',  'count',  'box',           'box',  1)
on conflict (code) do nothing;

comment on column public.units.base_code is
  'Netting unit. Bottles, cases and boxes each have their own base: converting '
  'between them depends on a bill of materials and is a derivation, not a fact.';


-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- The generic vocabulary. Industry-neutral and expected to stay small.
do $$ begin
  create type public.event_kind as enum (
    'receipt',      -- something entered the organization from outside
    'transfer',     -- a quantity moved between vessels
    'split',        -- one lot became several
    'blend',        -- several lots became one
    'transform',    -- inputs became outputs, possibly in another unit
    'package',      -- bulk became discrete finished units
    'consume',      -- a material was used up
    'loss',         -- a quantity left, with a reason
    'adjustment',   -- the ledger was wrong and is being corrected
    'count',        -- a physical count, and its variance from expectation
    'observation',  -- a measurement or note; nothing moved
    'stage'         -- an operational milestone; nothing moved
  );
exception when duplicate_object then null; end $$;

-- How well a number is known. A winery runs on approximations, and a system
-- that stores "about 2.4 tons" as a fact is lying quietly.
do $$ begin
  create type public.quantity_basis as enum ('measured', 'estimated', 'stated', 'derived');
exception when duplicate_object then null; end $$;

-- Why a quantity changed. Never collapse these into a single notion of "loss":
-- an estimate resolving into a measurement is not a loss, and treating it as
-- one makes every loss report worthless.
do $$ begin
  create type public.delta_reason as enum (
    'receipt',        -- entered from outside the organization
    'movement',       -- one leg of a transfer, split or blend; nets to zero
    'transformation', -- consumed or produced by a transformation
    'resolution',     -- an estimate replaced by a measurement
    'consumption',    -- deliberately used up
    'expected_loss',  -- anticipated process loss: lees, racking, evaporation
    'incident_loss',  -- an event: spill, breakage, rejection
    'waste',          -- discarded or removed as unusable
    'adjustment',     -- an explicit correction to the ledger
    'count_variance'  -- the gap between expected and counted
  );
exception when duplicate_object then null; end $$;

comment on type public.delta_reason is
  'Yield is deliberately absent: it is a ratio derived from a transformation, '
  'not a reason a quantity changed.';


-- -----------------------------------------------------------------------------
-- Resources
-- -----------------------------------------------------------------------------
create table if not exists public.materials (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  key              text not null,
  name             text not null,
  -- Text, not an enum: a distillery's categories are not a winery's, and this
  -- must not require a migration to extend.
  category         text not null default 'raw_material',
  default_unit     text not null references public.units (code),
  is_active        boolean not null default true,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, key),
  unique (id, organization_id)
);

create table if not exists public.vessels (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  code             text not null,
  name             text,
  -- Also text: tank, barrel, foudre, amphora, concrete egg, kettle, still.
  vessel_type      text not null default 'tank',
  capacity         numeric(20,4) check (capacity is null or capacity > 0),
  capacity_unit    text references public.units (code),
  location_label   text,
  is_active        boolean not null default true,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  check ((capacity is null) = (capacity_unit is null))
);

-- A lot is an evolving production identity, not an inventory row. It has no
-- volume column and no location column and no stage column: all three change
-- constantly and all three are derived from the ledger. Storing any of them
-- here would create the second source of truth this architecture exists to
-- avoid.
create table if not exists public.lots (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  code             text not null,
  name             text,
  data_origin      public.data_origin not null default 'real',
  opened_at        timestamptz not null default now(),
  archived_at      timestamptz,
  note             text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);


-- -----------------------------------------------------------------------------
-- Protocol — the plan. Never mutated to match reality.
-- -----------------------------------------------------------------------------
create table if not exists public.protocols (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  key              text not null,
  name             text not null,
  version          integer not null default 1,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, key, version),
  unique (id, organization_id)
);

create table if not exists public.protocol_steps (
  id            uuid primary key default gen_random_uuid(),
  protocol_id   uuid not null references public.protocols (id) on delete cascade,
  seq           integer not null,
  key           text not null,
  name          text not null,
  expected_kind public.event_kind,
  planned       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (protocol_id, seq)
);

create table if not exists public.protocol_runs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  protocol_id      uuid not null,
  lot_id           uuid,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (protocol_id, organization_id) references public.protocols (id, organization_id),
  foreign key (lot_id, organization_id)      references public.lots (id, organization_id)
);

create table if not exists public.protocol_run_steps (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  run_id           uuid not null,
  step_id          uuid not null references public.protocol_steps (id) on delete restrict,
  planned          jsonb not null default '{}'::jsonb,
  actual_started_at   timestamptz,
  actual_completed_at timestamptz,
  created_at       timestamptz not null default now(),
  unique (id, organization_id),
  unique (run_id, step_id),
  foreign key (run_id, organization_id) references public.protocol_runs (id, organization_id)
);

comment on column public.protocol_run_steps.planned is
  'A copy of the step''s plan, frozen when the run began. The protocol is never '
  'edited to match what happened — the difference between this and the linked '
  'events is the finding.';


-- -----------------------------------------------------------------------------
-- Event — what actually happened
--
-- Every cross-table reference is a COMPOSITE foreign key carrying
-- organization_id. That makes referencing another tenant's lot or vessel
-- structurally impossible rather than merely forbidden by a policy someone
-- might forget to write.
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations (id) on delete restrict,
  kind                   public.event_kind not null,

  -- The organization's own word for what happened, recorded verbatim. This is
  -- where a winery's vocabulary lives, and where we learn it.
  type_key               text,

  occurred_at            timestamptz not null,  -- when it happened in the world
  recorded_at            timestamptz not null default now(),  -- when PROOF learned

  actor_user_id          uuid references auth.users (id) on delete restrict,
  subject_lot_id         uuid,
  subject_vessel_id      uuid,
  protocol_run_step_id   uuid,
  corrects_event_id      uuid,

  note                   text,
  metadata               jsonb not null default '{}'::jsonb,
  data_origin            public.data_origin not null default 'real',
  created_at             timestamptz not null default now(),

  unique (id, organization_id),
  foreign key (subject_lot_id, organization_id)       references public.lots (id, organization_id),
  foreign key (subject_vessel_id, organization_id)    references public.vessels (id, organization_id),
  foreign key (protocol_run_step_id, organization_id) references public.protocol_run_steps (id, organization_id),
  foreign key (corrects_event_id, organization_id)    references public.events (id, organization_id)
);

create index if not exists events_org_time_idx on public.events (organization_id, occurred_at desc);
create index if not exists events_subject_lot_idx on public.events (subject_lot_id) where subject_lot_id is not null;

comment on column public.events.subject_lot_id is
  'The lot this event concerns. For events with ledger effects the lines remain '
  'authoritative for quantity; this exists so that events which move nothing — '
  'a stage change, an observation — still attach to a timeline.';


-- -----------------------------------------------------------------------------
-- Ledger — what physically changed
--
-- A line is a signed delta on a position. Two rules give it meaning:
--
--   material_id IS NULL      the quantity IS the lot itself (bulk wine, must)
--   material_id IS NOT NULL  the quantity is of that material, optionally
--                            attributed to a lot for costing
-- -----------------------------------------------------------------------------
create table if not exists public.ledger_lines (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  event_id         uuid not null,

  lot_id           uuid,
  material_id      uuid,
  vessel_id        uuid,

  quantity         numeric(24,6) not null check (quantity <> 0),
  unit_code        text not null references public.units (code),
  basis            public.quantity_basis not null,
  reason           public.delta_reason not null,

  -- Cost is carried but not computed. Attribution arrives in a later cycle;
  -- the point is that the ledger will not have to be rebuilt to support it.
  unit_cost        numeric(24,6),
  cost_amount      numeric(24,6),
  currency         text,

  note             text,
  created_at       timestamptz not null default now(),

  check (lot_id is not null or material_id is not null),
  foreign key (event_id, organization_id)    references public.events (id, organization_id) on delete restrict,
  foreign key (lot_id, organization_id)      references public.lots (id, organization_id),
  foreign key (material_id, organization_id) references public.materials (id, organization_id),
  foreign key (vessel_id, organization_id)   references public.vessels (id, organization_id)
);

create index if not exists ledger_lines_event_idx    on public.ledger_lines (event_id);
create index if not exists ledger_lines_lot_idx      on public.ledger_lines (lot_id)      where lot_id is not null;
create index if not exists ledger_lines_vessel_idx   on public.ledger_lines (vessel_id)   where vessel_id is not null;
create index if not exists ledger_lines_material_idx on public.ledger_lines (material_id) where material_id is not null;


-- -----------------------------------------------------------------------------
-- Lineage — where wine came from, and where it went
-- -----------------------------------------------------------------------------
create table if not exists public.lot_lineage (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  event_id         uuid not null,
  parent_lot_id    uuid not null,
  child_lot_id     uuid not null,
  quantity         numeric(24,6),
  unit_code        text references public.units (code),
  created_at       timestamptz not null default now(),
  check (parent_lot_id <> child_lot_id),
  unique (event_id, parent_lot_id, child_lot_id),
  foreign key (event_id, organization_id)      references public.events (id, organization_id) on delete restrict,
  foreign key (parent_lot_id, organization_id) references public.lots (id, organization_id),
  foreign key (child_lot_id, organization_id)  references public.lots (id, organization_id)
);

create index if not exists lot_lineage_parent_idx on public.lot_lineage (parent_lot_id);
create index if not exists lot_lineage_child_idx  on public.lot_lineage (child_lot_id);


-- -----------------------------------------------------------------------------
-- Documents — evidence, never required
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  storage_path     text not null,
  kind             text,
  original_name    text,
  content_type     text,
  byte_size        bigint,
  uploaded_by      uuid references auth.users (id) on delete restrict,
  created_at       timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, storage_path)
);

create table if not exists public.event_documents (
  organization_id  uuid not null references public.organizations (id) on delete restrict,
  event_id         uuid not null,
  document_id      uuid not null,
  primary key (event_id, document_id),
  foreign key (event_id, organization_id)    references public.events (id, organization_id) on delete restrict,
  foreign key (document_id, organization_id) references public.documents (id, organization_id) on delete restrict
);


-- =============================================================================
-- INVARIANTS
-- =============================================================================

-- Which balance rule governs each kind of event.
create or replace function app.event_balance_rule(p_kind public.event_kind)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'receipt'     then 'source'
    when 'consume'     then 'sink'
    when 'loss'        then 'sink'
    when 'transfer'    then 'movement'
    when 'split'       then 'movement'
    when 'blend'       then 'movement'
    when 'transform'   then 'conversion'
    when 'package'     then 'conversion'
    when 'adjustment'  then 'correction'
    when 'count'       then 'correction'
    when 'observation' then 'nonmaterial'
    when 'stage'       then 'nonmaterial'
  end;
$$;

-- The whole guarantee, in one function.
--
-- Deferred to commit time, because an event's lines are inserted one at a time
-- but are only meaningful as a set.
create or replace function app.assert_event_valid(p_event_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event      public.events%rowtype;
  v_rule       text;
  v_lines      integer;
  v_positive   integer;
  v_negative   integer;
  v_unbalanced text;
  v_bad_reason integer;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    return;  -- rolled back elsewhere in this transaction
  end if;

  v_rule := app.event_balance_rule(v_event.kind);

  select count(*),
         count(*) filter (where quantity > 0),
         count(*) filter (where quantity < 0)
    into v_lines, v_positive, v_negative
  from public.ledger_lines where event_id = p_event_id;

  -- Universal: movement legs must cancel exactly, per base unit. Anything that
  -- genuinely enters or leaves the organization must say so with a reason of
  -- its own. This is what makes "nothing appears from nowhere" enforceable.
  select string_agg(format('%s: %s', base_code, net), ', ')
    into v_unbalanced
  from (
    select u.base_code, sum(l.quantity * u.to_base) as net
    from public.ledger_lines l
    join public.units u on u.code = l.unit_code
    where l.event_id = p_event_id and l.reason = 'movement'
    group by u.base_code
    having sum(l.quantity * u.to_base) <> 0
  ) s;

  if v_unbalanced is not null then
    raise exception
      'unbalanced movement in % event: movement lines must net to zero per unit (%). A quantity that truly left must carry its own reason.',
      v_event.kind, v_unbalanced
      using errcode = 'check_violation';
  end if;

  case v_rule
    when 'nonmaterial' then
      if v_lines > 0 then
        raise exception '% events record no quantity change, but % ledger line(s) were attached',
          v_event.kind, v_lines using errcode = 'check_violation';
      end if;

    when 'source' then
      if v_negative > 0 then
        raise exception '% events may only add quantity; % negative line(s) found',
          v_event.kind, v_negative using errcode = 'check_violation';
      end if;
      if v_lines = 0 then
        raise exception '% events require at least one line', v_event.kind
          using errcode = 'check_violation';
      end if;

    when 'sink' then
      if v_positive > 0 then
        raise exception '% events may only remove quantity; % positive line(s) found',
          v_event.kind, v_positive using errcode = 'check_violation';
      end if;
      if v_lines = 0 then
        raise exception '% events require at least one line', v_event.kind
          using errcode = 'check_violation';
      end if;

    when 'movement' then
      if v_positive = 0 or v_negative = 0 then
        raise exception '% events need at least one source and one destination line', v_event.kind
          using errcode = 'check_violation';
      end if;

    when 'conversion' then
      -- Units legitimately change here, so no conservation is possible or
      -- desirable: 8,500 kg of fruit becoming 6,200 L of must is not a loss of
      -- 2,300 of anything. Yield is derived from the pair, never assumed.
      if v_positive = 0 or v_negative = 0 then
        raise exception '% events need at least one input and one output line', v_event.kind
          using errcode = 'check_violation';
      end if;

    when 'correction' then
      select count(*) into v_bad_reason
      from public.ledger_lines
      where event_id = p_event_id
        and reason not in ('adjustment', 'resolution', 'count_variance');
      if v_bad_reason > 0 then
        raise exception '% events may only carry adjustment, resolution or count_variance lines', v_event.kind
          using errcode = 'check_violation';
      end if;
      if coalesce(btrim(v_event.note), '') = '' then
        raise exception '% events require a note explaining why the ledger was wrong', v_event.kind
          using errcode = 'check_violation';
      end if;
  end case;

  -- A conversion that turns one lot into a different lot is lineage too:
  -- grapes becoming must, bulk wine becoming bottles. Without this, a lot's
  -- ancestry stops at the last blend and traceability quietly breaks.
  if v_event.kind in ('transform', 'package') then
    if exists (
      select 1
      from public.ledger_lines o
      where o.event_id = p_event_id and o.lot_id is not null and o.material_id is null and o.quantity > 0
        and exists (
          select 1 from public.ledger_lines i
          where i.event_id = p_event_id and i.lot_id is not null and i.material_id is null
            and i.quantity < 0 and i.lot_id <> o.lot_id
        )
        and not exists (
          select 1 from public.lot_lineage g
          where g.event_id = p_event_id and g.child_lot_id = o.lot_id
        )
    ) then
      raise exception
        '% produced a new lot from an existing one without recording lineage; ancestry would break here',
        v_event.kind using errcode = 'check_violation';
    end if;
  end if;

  -- Lineage is what makes "where did this wine come from" answerable. It is
  -- not optional for the two events that create or destroy identity.
  if v_event.kind in ('split', 'blend') then
    if not exists (select 1 from public.lot_lineage where event_id = p_event_id) then
      raise exception '% events must record lineage linking parent and child lots', v_event.kind
        using errcode = 'check_violation';
    end if;
  end if;
end;
$$;

create or replace function app.trg_assert_event_valid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  -- Branch rather than using CASE: plpgsql resolves every field reference in an
  -- expression against NEW's actual record type, so `new.event_id` would fail
  -- when the trigger fires on `events`.
  if tg_table_name = 'events' then
    v_event_id := new.id;
  else
    v_event_id := new.event_id;
  end if;

  perform app.assert_event_valid(v_event_id);
  return null;
end;
$$;

drop trigger if exists events_valid on public.events;
create constraint trigger events_valid
  after insert on public.events
  deferrable initially deferred
  for each row execute function app.trg_assert_event_valid();

drop trigger if exists ledger_lines_valid on public.ledger_lines;
create constraint trigger ledger_lines_valid
  after insert on public.ledger_lines
  deferrable initially deferred
  for each row execute function app.trg_assert_event_valid();


-- -----------------------------------------------------------------------------
-- Immutability
--
-- History is not editable. A mistake is corrected by recording a correction,
-- which leaves both the error and the fix visible — that is the difference
-- between a ledger and a spreadsheet.
-- -----------------------------------------------------------------------------
create or replace function app.forbid_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    '% on %.% is not permitted: recorded history is immutable. Record a corrective event instead.',
    tg_op, tg_table_schema, tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists events_immutable on public.events;
create trigger events_immutable before update or delete on public.events
  for each row execute function app.forbid_mutation();

drop trigger if exists ledger_lines_immutable on public.ledger_lines;
create trigger ledger_lines_immutable before update or delete on public.ledger_lines
  for each row execute function app.forbid_mutation();

drop trigger if exists lot_lineage_immutable on public.lot_lineage;
create trigger lot_lineage_immutable before update or delete on public.lot_lineage
  for each row execute function app.forbid_mutation();

-- A protocol step that a run has already followed cannot be edited either:
-- rewriting the plan to match the outcome destroys the only thing plan-versus-
-- actual is for.
create or replace function app.forbid_used_protocol_step_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.protocol_run_steps where step_id = old.id) then
    raise exception
      'protocol step % has already been used by a run and cannot be changed. Create a new protocol version instead.',
      old.id using errcode = 'restrict_violation';
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protocol_steps_frozen on public.protocol_steps;
create trigger protocol_steps_frozen before update or delete on public.protocol_steps
  for each row execute function app.forbid_used_protocol_step_change();


-- housekeeping
drop trigger if exists materials_touch on public.materials;
create trigger materials_touch before update on public.materials
  for each row execute function app.touch_updated_at();

drop trigger if exists vessels_touch on public.vessels;
create trigger vessels_touch before update on public.vessels
  for each row execute function app.touch_updated_at();

drop trigger if exists lots_touch on public.lots;
create trigger lots_touch before update on public.lots
  for each row execute function app.touch_updated_at();

drop trigger if exists protocols_touch on public.protocols;
create trigger protocols_touch before update on public.protocols
  for each row execute function app.touch_updated_at();


-- =============================================================================
-- DERIVED STATE — views only. Nothing below is stored.
--
-- security_invoker is mandatory: without it a view runs with its owner's
-- rights and silently bypasses every RLS policy underneath. That is precisely
-- the class of leak the legacy audit found, and a structural test enforces it.
-- =============================================================================

create or replace view public.lot_balances with (security_invoker = true) as
  select l.organization_id,
         l.lot_id,
         u.base_code as unit,
         round(sum(l.quantity * u.to_base), 6) as quantity
  from public.ledger_lines l
  join public.units u on u.code = l.unit_code
  where l.lot_id is not null and l.material_id is null
  group by l.organization_id, l.lot_id, u.base_code;

create or replace view public.lot_vessel_positions with (security_invoker = true) as
  select l.organization_id,
         l.lot_id,
         l.vessel_id,
         u.base_code as unit,
         round(sum(l.quantity * u.to_base), 6) as quantity
  from public.ledger_lines l
  join public.units u on u.code = l.unit_code
  where l.lot_id is not null and l.material_id is null and l.vessel_id is not null
  group by l.organization_id, l.lot_id, l.vessel_id, u.base_code;

create or replace view public.material_stock with (security_invoker = true) as
  select l.organization_id,
         l.material_id,
         u.base_code as unit,
         round(sum(l.quantity * u.to_base), 6) as quantity
  from public.ledger_lines l
  join public.units u on u.code = l.unit_code
  where l.material_id is not null
  group by l.organization_id, l.material_id, u.base_code;

-- Answers "where can I put this?" — the question a winery actually asks during
-- harvest, and the first thing PROOF gives back.
create or replace view public.vessel_occupancy with (security_invoker = true) as
  select v.organization_id,
         v.id            as vessel_id,
         v.code,
         v.name,
         v.vessel_type,
         v.capacity,
         v.capacity_unit,
         cu.base_code    as base_unit,
         round(v.capacity * cu.to_base, 6)                as capacity_base,
         round(coalesce(occ.quantity, 0), 6)              as occupied_base,
         round(v.capacity * cu.to_base - coalesce(occ.quantity, 0), 6) as available_base,
         coalesce(occ.lot_count, 0)                       as lot_count
  from public.vessels v
  left join public.units cu on cu.code = v.capacity_unit
  left join lateral (
    select sum(b.qty) as quantity,
           count(*) filter (where b.qty <> 0) as lot_count
    from (
      select l.lot_id, sum(l.quantity * u.to_base) as qty
      from public.ledger_lines l
      join public.units u on u.code = l.unit_code
      where l.vessel_id = v.id
        and l.material_id is null
        and (cu.base_code is null or u.base_code = cu.base_code)
      group by l.lot_id
    ) b
  ) occ on true;

-- The current stage is the most recent stage event, derived — never a column
-- somebody can set out of band.
create or replace view public.lot_current_stage with (security_invoker = true) as
  select distinct on (e.subject_lot_id)
         e.organization_id,
         e.subject_lot_id as lot_id,
         e.type_key       as stage,
         e.occurred_at,
         e.note
  from public.events e
  where e.kind = 'stage' and e.subject_lot_id is not null
  order by e.subject_lot_id, e.occurred_at desc, e.recorded_at desc;

create or replace view public.lot_timeline with (security_invoker = true) as
  select e.organization_id, e.subject_lot_id as lot_id, e.id as event_id,
         e.kind, e.type_key, e.occurred_at, e.recorded_at, e.note
  from public.events e
  where e.subject_lot_id is not null
  union
  select e.organization_id, l.lot_id, e.id,
         e.kind, e.type_key, e.occurred_at, e.recorded_at, e.note
  from public.events e
  join public.ledger_lines l on l.event_id = e.id
  where l.lot_id is not null;

-- "Where did this wine come from?" and "which lots carry wine from this one?"
create or replace view public.lot_ancestry with (security_invoker = true) as
  with recursive walk as (
    select ll.organization_id, ll.child_lot_id as lot_id, ll.parent_lot_id as ancestor_lot_id, 1 as depth
    from public.lot_lineage ll
    union all
    select w.organization_id, w.lot_id, ll.parent_lot_id, w.depth + 1
    from walk w
    join public.lot_lineage ll on ll.child_lot_id = w.ancestor_lot_id
    where w.depth < 20
  )
  select * from walk;

create or replace view public.lot_descendants with (security_invoker = true) as
  with recursive walk as (
    select ll.organization_id, ll.parent_lot_id as lot_id, ll.child_lot_id as descendant_lot_id, 1 as depth
    from public.lot_lineage ll
    union all
    select w.organization_id, w.lot_id, ll.child_lot_id, w.depth + 1
    from walk w
    join public.lot_lineage ll on ll.parent_lot_id = w.descendant_lot_id
    where w.depth < 20
  )
  select * from walk;

-- Yield is a derivation of a conversion, not a stored fact and not a reason.
create or replace view public.conversion_yields with (security_invoker = true) as
  select e.organization_id,
         e.id as event_id,
         e.kind,
         e.occurred_at,
         inp.base_code  as input_unit,
         inp.qty        as input_quantity,
         outp.base_code as output_unit,
         outp.qty       as output_quantity,
         case when inp.qty <> 0 then round(outp.qty / inp.qty, 6) end as output_per_input
  from public.events e
  join lateral (
    select u.base_code, -sum(l.quantity * u.to_base) as qty
    from public.ledger_lines l join public.units u on u.code = l.unit_code
    where l.event_id = e.id and l.quantity < 0 and l.reason = 'transformation'
    group by u.base_code
  ) inp on true
  join lateral (
    select u.base_code, sum(l.quantity * u.to_base) as qty
    from public.ledger_lines l join public.units u on u.code = l.unit_code
    where l.event_id = e.id and l.quantity > 0 and l.reason = 'transformation'
    group by u.base_code
  ) outp on true
  where e.kind in ('transform', 'package');


-- =============================================================================
-- WRITE API
--
-- One entry point. It checks membership itself, so it is safe to expose to a
-- session later without becoming the confused deputy the legacy RPCs were.
-- =============================================================================
create or replace function app.is_service_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.role(), '') = 'service_role';
$$;

create or replace function app.record_event(
  p_organization_id       uuid,
  p_kind                  public.event_kind,
  p_occurred_at           timestamptz,
  p_lines                 jsonb default '[]'::jsonb,
  p_type_key              text default null,
  p_note                  text default null,
  p_metadata              jsonb default '{}'::jsonb,
  p_subject_lot_id        uuid default null,
  p_subject_vessel_id     uuid default null,
  p_lineage               jsonb default '[]'::jsonb,
  p_corrects_event_id     uuid default null,
  p_protocol_run_step_id  uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_line     jsonb;
  v_link     jsonb;
begin
  -- The tenant is never taken on trust from the caller's argument alone.
  if not (app.is_member_of(p_organization_id) or app.is_service_role()) then
    raise exception 'not authorized to record events for organization %', p_organization_id
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.events (
    organization_id, kind, type_key, occurred_at, actor_user_id,
    subject_lot_id, subject_vessel_id, protocol_run_step_id, corrects_event_id,
    note, metadata
  ) values (
    p_organization_id, p_kind, p_type_key, p_occurred_at, auth.uid(),
    p_subject_lot_id, p_subject_vessel_id, p_protocol_run_step_id, p_corrects_event_id,
    p_note, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    insert into public.ledger_lines (
      organization_id, event_id, lot_id, material_id, vessel_id,
      quantity, unit_code, basis, reason, unit_cost, cost_amount, currency, note
    ) values (
      p_organization_id,
      v_event_id,
      nullif(v_line ->> 'lot_id', '')::uuid,
      nullif(v_line ->> 'material_id', '')::uuid,
      nullif(v_line ->> 'vessel_id', '')::uuid,
      (v_line ->> 'quantity')::numeric,
      v_line ->> 'unit',
      (v_line ->> 'basis')::public.quantity_basis,
      (v_line ->> 'reason')::public.delta_reason,
      nullif(v_line ->> 'unit_cost', '')::numeric,
      nullif(v_line ->> 'cost_amount', '')::numeric,
      nullif(v_line ->> 'currency', ''),
      nullif(v_line ->> 'note', '')
    );
  end loop;

  for v_link in select * from jsonb_array_elements(coalesce(p_lineage, '[]'::jsonb))
  loop
    insert into public.lot_lineage (
      organization_id, event_id, parent_lot_id, child_lot_id, quantity, unit_code
    ) values (
      p_organization_id,
      v_event_id,
      (v_link ->> 'parent_lot_id')::uuid,
      (v_link ->> 'child_lot_id')::uuid,
      nullif(v_link ->> 'quantity', '')::numeric,
      nullif(v_link ->> 'unit', '')
    );
  end loop;

  return v_event_id;
end;
$$;

comment on function app.record_event is
  'The only supported way to write history. Builds the event, its ledger lines '
  'and its lineage atomically; the deferred constraint triggers then validate '
  'the whole set at commit.';


-- =============================================================================
-- RLS — one canonical helper, no per-table conventions
-- =============================================================================
alter table public.units              enable row level security;
alter table public.materials          enable row level security;
alter table public.vessels            enable row level security;
alter table public.lots               enable row level security;
alter table public.protocols          enable row level security;
alter table public.protocol_steps     enable row level security;
alter table public.protocol_runs      enable row level security;
alter table public.protocol_run_steps enable row level security;
alter table public.events             enable row level security;
alter table public.ledger_lines       enable row level security;
alter table public.lot_lineage        enable row level security;
alter table public.documents          enable row level security;
alter table public.event_documents    enable row level security;

-- Units are shared reference data, readable by any signed-in user and writable
-- by nobody through the API.
drop policy if exists units_select on public.units;
create policy units_select on public.units for select to authenticated using (true);

do $$
declare t text;
begin
  foreach t in array array[
    'materials', 'vessels', 'lots', 'protocols', 'protocol_runs',
    'protocol_run_steps', 'events', 'ledger_lines', 'lot_lineage',
    'documents', 'event_documents'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (app.is_member_of(organization_id))',
      t || '_select', t
    );
  end loop;
end $$;

-- protocol_steps has no organization_id of its own; it inherits through its
-- protocol rather than duplicating the column.
drop policy if exists protocol_steps_select on public.protocol_steps;
create policy protocol_steps_select on public.protocol_steps for select to authenticated
  using (exists (
    select 1 from public.protocols p
    where p.id = protocol_id and app.is_member_of(p.organization_id)
  ));


-- =============================================================================
-- GRANTS — read-only for sessions; all writes go through the API
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'units', 'materials', 'vessels', 'lots', 'protocols', 'protocol_steps',
    'protocol_runs', 'protocol_run_steps', 'events', 'ledger_lines',
    'lot_lineage', 'documents', 'event_documents'
  ] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert on public.%I to service_role', t);
    execute format('revoke delete, truncate on public.%I from service_role', t);
  end loop;

  -- Resource catalogues are editable; recorded history is not.
  foreach t in array array['materials', 'vessels', 'lots', 'protocols', 'protocol_steps', 'protocol_runs', 'protocol_run_steps'] loop
    execute format('grant update on public.%I to service_role', t);
  end loop;
end $$;

grant select on public.lot_balances, public.lot_vessel_positions, public.material_stock,
                public.vessel_occupancy, public.lot_current_stage, public.lot_timeline,
                public.lot_ancestry, public.lot_descendants, public.conversion_yields
  to authenticated, service_role;

grant execute on function app.record_event(uuid, public.event_kind, timestamptz, jsonb, text, text, jsonb, uuid, uuid, jsonb, uuid, uuid)
  to authenticated, service_role;
grant execute on function app.event_balance_rule(public.event_kind) to authenticated, service_role;
grant execute on function app.is_service_role() to authenticated, service_role;
grant execute on function app.assert_event_valid(uuid) to authenticated, service_role;
