-- =============================================================================
-- PROOF · Cycle 1 · Step 3 — Harvest capture operations
--
-- The first operational surface over the ledger. Six functions, named for what
-- a person does, taking the numbers a person actually has.
--
-- The translation is the whole point. An operator says "6,150 came out of Tank 3
-- and 6,100 went into Tank 7". They do not say "post two movement lines that net
-- to zero plus an expected_loss line of 50". PROOF derives the second from the
-- first. Nobody types a delta, a reason code, or a ledger line.
--
-- These live in `public` because they are the API a session calls. Every one
-- checks membership on the organization it was handed — the tenant is never
-- taken on trust from an argument, which is exactly what went wrong in the
-- legacy system's RPCs.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Find-or-create helpers.
--
-- A vessel comes into existence because somebody typed "Tank 3" while recording
-- what they did, never because they visited an equipment setup screen. An
-- inventory wizard is the ERP experience this product exists to avoid.
-- -----------------------------------------------------------------------------
create or replace function app.ensure_vessel(
  p_organization_id uuid,
  p_code            text,
  p_vessel_type     text default 'tank',
  p_capacity        numeric default null,
  p_capacity_unit   text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if p_code is null or btrim(p_code) = '' then
    return null;
  end if;

  select id into v_id from public.vessels
  where organization_id = p_organization_id and code = btrim(p_code);

  if v_id is not null then
    return v_id;
  end if;

  insert into public.vessels (organization_id, code, vessel_type, capacity, capacity_unit)
  values (p_organization_id, btrim(p_code), coalesce(p_vessel_type, 'tank'), p_capacity, p_capacity_unit)
  returning id into v_id;

  return v_id;
end;
$$;


create or replace function app.ensure_lot(
  p_organization_id uuid,
  p_code            text,
  p_name            text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if p_code is null or btrim(p_code) = '' then
    raise exception 'a lot needs a code' using errcode = 'null_value_not_allowed';
  end if;

  select id into v_id from public.lots
  where organization_id = p_organization_id and code = btrim(p_code);

  if v_id is not null then
    return v_id;
  end if;

  insert into public.lots (organization_id, code, name)
  values (p_organization_id, btrim(p_code), p_name)
  returning id into v_id;

  return v_id;
end;
$$;


create or replace function app.ensure_material(
  p_organization_id uuid,
  p_key             text,
  p_name            text default null,
  p_category        text default 'raw_material',
  p_default_unit    text default 'kg'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if p_key is null or btrim(p_key) = '' then
    return null;
  end if;

  select id into v_id from public.materials
  where organization_id = p_organization_id and key = btrim(p_key);

  if v_id is not null then
    return v_id;
  end if;

  insert into public.materials (organization_id, key, name, category, default_unit)
  values (p_organization_id, btrim(p_key), coalesce(p_name, btrim(p_key)),
          coalesce(p_category, 'raw_material'), coalesce(p_default_unit, 'kg'))
  returning id into v_id;

  return v_id;
end;
$$;


-- What the ledger currently says a lot holds, in the base unit of the unit given.
create or replace function app.lot_balance(p_lot_id uuid, p_unit text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(round(sum(l.quantity * u.to_base), 6), 0)
  from public.ledger_lines l
  join public.units u on u.code = l.unit_code
  where l.lot_id = p_lot_id
    and l.material_id is null
    and u.base_code = (select base_code from public.units where code = p_unit);
$$;


-- Every capture operation opens with this. A caller who is not a member of the
-- organization gets nothing — not a lot, not a vessel, not an event.
create or replace function app.require_membership(p_organization_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (app.is_member_of(p_organization_id) or app.is_service_role()) then
    raise exception 'not authorized to record work for organization %', p_organization_id
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;


-- =============================================================================
-- 1 · RECEPTION — "About 2.4 tonnes of Cabernet arrived from La Cañada."
--
-- Basis defaults to `estimated`, because at a weighbridge-less crush pad most
-- first numbers are a judgement. Recording a guess as a measurement is the
-- failure this whole model exists to prevent, so the safer default is the one
-- that admits uncertainty.
-- =============================================================================
create or replace function public.capture_reception(
  p_organization_id uuid,
  p_occurred_at     timestamptz,
  p_lot_code        text,
  p_quantity        numeric,
  p_unit            text,
  p_lot_name        text default null,
  p_basis           public.quantity_basis default 'estimated',
  p_vessel_code     text default null,
  p_source          text default null,
  p_source_kind     text default null,
  p_variety         text default null,
  p_note            text default null,
  p_type_key        text default null,
  p_cost_amount     numeric default null,
  p_currency        text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot    uuid;
  v_vessel uuid;
begin
  perform app.require_membership(p_organization_id);

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'how much arrived? a reception needs a positive quantity'
      using errcode = 'check_violation';
  end if;

  v_lot    := app.ensure_lot(p_organization_id, p_lot_code, p_lot_name);
  v_vessel := app.ensure_vessel(p_organization_id, p_vessel_code, 'bin');

  -- Where the fruit came from is kept as context on the event rather than in a
  -- supplier catalogue. We have not yet seen how this winery names its blocks
  -- and growers, and inventing that vocabulary before observing it is how you
  -- end up with a form nobody can fill in.
  return app.record_event(
    p_organization_id, 'receipt', p_occurred_at,
    jsonb_build_array(jsonb_build_object(
      'lot_id',      v_lot,
      'vessel_id',   v_vessel,
      'quantity',    p_quantity,
      'unit',        p_unit,
      'basis',       p_basis::text,
      'reason',      'receipt',
      'cost_amount', p_cost_amount,
      'currency',    p_currency
    )),
    coalesce(p_type_key, 'reception'),
    p_note,
    jsonb_strip_nulls(jsonb_build_object(
      'source', p_source, 'source_kind', p_source_kind, 'variety', p_variety
    )),
    v_lot, v_vessel
  );
end;
$$;


-- =============================================================================
-- 2 · PROCESSING — "We crushed it; there's about 1,730 litres in Tank 3."
--
-- Leaving the input quantity null consumes whatever the ledger says is left,
-- which is what actually happens when a bin of fruit goes through the press.
-- Kilograms become litres: no conservation is possible and none is attempted.
-- =============================================================================
create or replace function public.capture_processing(
  p_organization_id     uuid,
  p_occurred_at         timestamptz,
  p_input_lot_code      text,
  p_output_lot_code     text,
  p_output_quantity     numeric,
  p_output_unit         text,
  p_input_quantity      numeric default null,
  p_input_unit          text default null,
  p_output_lot_name     text default null,
  p_output_basis        public.quantity_basis default 'estimated',
  p_output_vessel_code  text default null,
  p_byproduct_key       text default null,
  p_byproduct_quantity  numeric default null,
  p_byproduct_unit      text default null,
  p_note                text default null,
  p_type_key            text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_in_lot     uuid;
  v_out_lot    uuid;
  v_out_vessel uuid;
  v_in_vessel  uuid;
  v_in_unit    text;
  v_in_qty     numeric;
  v_byproduct  uuid;
  v_lines      jsonb;
begin
  perform app.require_membership(p_organization_id);

  select id into v_in_lot from public.lots
  where organization_id = p_organization_id and code = btrim(p_input_lot_code);

  if v_in_lot is null then
    raise exception 'there is no lot called % to process', p_input_lot_code
      using errcode = 'no_data_found';
  end if;

  v_out_lot    := app.ensure_lot(p_organization_id, p_output_lot_code, p_output_lot_name);
  v_out_vessel := app.ensure_vessel(p_organization_id, p_output_vessel_code, 'tank');

  -- Whatever unit the input is currently held in, unless told otherwise.
  v_in_unit := coalesce(p_input_unit, (
    select u.base_code
    from public.ledger_lines l join public.units u on u.code = l.unit_code
    where l.lot_id = v_in_lot and l.material_id is null
    group by u.base_code
    order by abs(sum(l.quantity * u.to_base)) desc
    limit 1
  ));

  if v_in_unit is null then
    raise exception 'lot % holds nothing to process', p_input_lot_code
      using errcode = 'check_violation';
  end if;

  v_in_qty := coalesce(p_input_quantity, app.lot_balance(v_in_lot, v_in_unit));

  if v_in_qty <= 0 then
    raise exception 'lot % holds nothing to process', p_input_lot_code
      using errcode = 'check_violation';
  end if;

  -- Where the input is sitting now, so the vessel empties on the tank board.
  select l.vessel_id into v_in_vessel
  from public.ledger_lines l
  where l.lot_id = v_in_lot and l.material_id is null and l.vessel_id is not null
  order by l.created_at desc limit 1;

  v_lines := jsonb_build_array(
    jsonb_build_object('lot_id', v_in_lot, 'vessel_id', v_in_vessel,
                       'quantity', -v_in_qty, 'unit', v_in_unit,
                       'basis', 'derived', 'reason', 'transformation'),
    jsonb_build_object('lot_id', v_out_lot, 'vessel_id', v_out_vessel,
                       'quantity', p_output_quantity, 'unit', p_output_unit,
                       'basis', p_output_basis::text, 'reason', 'transformation')
  );

  -- Pomace, spent grain, spent lees: a byproduct is an output, not a loss.
  if p_byproduct_key is not null and coalesce(p_byproduct_quantity, 0) > 0 then
    v_byproduct := app.ensure_material(
      p_organization_id, p_byproduct_key, null, 'byproduct',
      coalesce(p_byproduct_unit, v_in_unit));
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'material_id', v_byproduct,
      'quantity', p_byproduct_quantity,
      'unit', coalesce(p_byproduct_unit, v_in_unit),
      'basis', 'estimated', 'reason', 'transformation'));
  end if;

  return app.record_event(
    p_organization_id, 'transform', p_occurred_at, v_lines,
    coalesce(p_type_key, 'processing'), p_note, '{}'::jsonb,
    v_out_lot, v_out_vessel,
    jsonb_build_array(jsonb_build_object(
      'parent_lot_id', v_in_lot, 'child_lot_id', v_out_lot,
      'quantity', p_output_quantity, 'unit', p_output_unit))
  );
end;
$$;


-- =============================================================================
-- 3 · TRANSFER — "6,150 came out of Tank 3 and 6,100 went into Tank 7."
--
-- The operator gives two real numbers. PROOF works out that 50 litres are
-- unaccounted for, insists on a reason for them, and writes the movement legs
-- so they cancel. Asking anyone to reason about netting would be a design
-- failure.
--
-- Naming a different lot at a destination makes this a split, and the lineage
-- is recorded automatically — because a wine that came from somewhere must
-- always be able to say where.
-- =============================================================================
create or replace function public.capture_transfer(
  p_organization_id  uuid,
  p_occurred_at      timestamptz,
  p_lot_code         text,
  p_quantity_out     numeric,
  p_unit             text,
  p_destinations     jsonb,
  p_from_vessel_code text default null,
  p_basis            public.quantity_basis default 'measured',
  p_shortfall_reason public.delta_reason default 'expected_loss',
  p_shortfall_note   text default null,
  p_note             text default null,
  p_type_key         text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot         uuid;
  v_from        uuid;
  v_dest        jsonb;
  v_dest_lot    uuid;
  v_dest_vessel uuid;
  v_arrived     numeric := 0;
  v_shortfall   numeric;
  v_is_split    boolean := false;
  v_lines       jsonb := '[]'::jsonb;
  v_lineage     jsonb := '[]'::jsonb;
begin
  perform app.require_membership(p_organization_id);

  select id into v_lot from public.lots
  where organization_id = p_organization_id and code = btrim(p_lot_code);

  if v_lot is null then
    raise exception 'there is no lot called %', p_lot_code using errcode = 'no_data_found';
  end if;

  if jsonb_typeof(p_destinations) <> 'array' or jsonb_array_length(p_destinations) = 0 then
    raise exception 'where did it go? a transfer needs at least one destination'
      using errcode = 'check_violation';
  end if;

  v_from := app.ensure_vessel(p_organization_id, p_from_vessel_code, 'tank');

  for v_dest in select * from jsonb_array_elements(p_destinations)
  loop
    v_arrived := v_arrived + coalesce((v_dest ->> 'quantity')::numeric, 0);
  end loop;

  v_shortfall := p_quantity_out - v_arrived;

  if v_shortfall < 0 then
    raise exception
      'more arrived (%) than left (%) — check the numbers, or record the extra as its own event',
      v_arrived, p_quantity_out using errcode = 'check_violation';
  end if;

  -- The legs that cancel: only what actually reached a destination moves.
  for v_dest in select * from jsonb_array_elements(p_destinations)
  loop
    v_dest_vessel := app.ensure_vessel(p_organization_id, v_dest ->> 'vessel_code', 'tank');

    if coalesce(btrim(v_dest ->> 'lot_code'), btrim(p_lot_code)) <> btrim(p_lot_code) then
      v_is_split := true;
      v_dest_lot := app.ensure_lot(p_organization_id, v_dest ->> 'lot_code', v_dest ->> 'lot_name');
      v_lineage := v_lineage || jsonb_build_array(jsonb_build_object(
        'parent_lot_id', v_lot, 'child_lot_id', v_dest_lot,
        'quantity', (v_dest ->> 'quantity')::numeric, 'unit', p_unit));
    else
      v_dest_lot := v_lot;
    end if;

    v_lines := v_lines
      || jsonb_build_array(jsonb_build_object(
           'lot_id', v_lot, 'vessel_id', v_from,
           'quantity', -((v_dest ->> 'quantity')::numeric), 'unit', p_unit,
           'basis', p_basis::text, 'reason', 'movement'))
      || jsonb_build_array(jsonb_build_object(
           'lot_id', v_dest_lot, 'vessel_id', v_dest_vessel,
           'quantity', (v_dest ->> 'quantity')::numeric, 'unit', p_unit,
           'basis', p_basis::text, 'reason', 'movement'));
  end loop;

  -- The gap between what left and what arrived, named rather than absorbed.
  if v_shortfall > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'lot_id', v_lot, 'vessel_id', v_from,
      'quantity', -v_shortfall, 'unit', p_unit,
      'basis', p_basis::text, 'reason', p_shortfall_reason::text,
      'note', p_shortfall_note));
  end if;

  return app.record_event(
    p_organization_id,
    case when v_is_split then 'split'::public.event_kind else 'transfer'::public.event_kind end,
    p_occurred_at, v_lines,
    coalesce(p_type_key, case when v_is_split then 'split' else 'transfer' end),
    p_note, '{}'::jsonb, v_lot, v_from, v_lineage
  );
end;
$$;


-- =============================================================================
-- 4 · STAGE — "It started fermenting."
--
-- Free text on purpose. The words the winemaker uses are a finding, not a form
-- value, and they are the vocabulary a future parser will be trained on.
-- =============================================================================
create or replace function public.capture_stage(
  p_organization_id uuid,
  p_occurred_at     timestamptz,
  p_lot_code        text,
  p_stage           text,
  p_note            text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_lot uuid;
begin
  perform app.require_membership(p_organization_id);

  select id into v_lot from public.lots
  where organization_id = p_organization_id and code = btrim(p_lot_code);

  if v_lot is null then
    raise exception 'there is no lot called %', p_lot_code using errcode = 'no_data_found';
  end if;

  if p_stage is null or btrim(p_stage) = '' then
    raise exception 'what changed? a stage needs a name' using errcode = 'check_violation';
  end if;

  return app.record_event(
    p_organization_id, 'stage', p_occurred_at, '[]'::jsonb,
    btrim(p_stage), p_note, '{}'::jsonb, v_lot
  );
end;
$$;


-- =============================================================================
-- 5 · OBSERVATION — "Brix 24.1, and it smells right."
--
-- Cheap to record, and the catch-all for anything PROOF cannot yet model. What
-- gets typed here during the first visits is the list of what we got wrong.
-- =============================================================================
create or replace function public.capture_observation(
  p_organization_id uuid,
  p_occurred_at     timestamptz,
  p_lot_code        text default null,
  p_readings        jsonb default '{}'::jsonb,
  p_note            text default null,
  p_vessel_code     text default null,
  p_type_key        text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot    uuid;
  v_vessel uuid;
begin
  perform app.require_membership(p_organization_id);

  if p_lot_code is not null then
    select id into v_lot from public.lots
    where organization_id = p_organization_id and code = btrim(p_lot_code);
    if v_lot is null then
      raise exception 'there is no lot called %', p_lot_code using errcode = 'no_data_found';
    end if;
  end if;

  if p_vessel_code is not null then
    v_vessel := app.ensure_vessel(p_organization_id, p_vessel_code, 'tank');
  end if;

  if coalesce(p_readings, '{}'::jsonb) = '{}'::jsonb
     and coalesce(btrim(p_note), '') = '' then
    raise exception 'an observation needs a reading or a note' using errcode = 'check_violation';
  end if;

  return app.record_event(
    p_organization_id, 'observation', p_occurred_at, '[]'::jsonb,
    coalesce(p_type_key, 'observation'), p_note,
    coalesce(p_readings, '{}'::jsonb), v_lot, v_vessel
  );
end;
$$;


-- =============================================================================
-- 6 · CORRECTION — "The tank actually gauges 1,785 litres."
--
-- The operator states the observed truth. PROOF works out the difference from
-- what the ledger believed and records that, so nobody is ever asked to compute
-- a delta or to edit a number in place.
--
-- A count that agrees is still worth recording: it is evidence the memory is
-- sound, so it lands as an observation rather than being thrown away.
-- =============================================================================
create or replace function public.capture_correction(
  p_organization_id   uuid,
  p_occurred_at       timestamptz,
  p_lot_code          text,
  p_observed_quantity numeric,
  p_unit              text,
  p_note              text,
  p_basis             public.quantity_basis default 'measured',
  p_reason            public.delta_reason default 'resolution',
  p_vessel_code       text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot      uuid;
  v_vessel   uuid;
  v_expected numeric;
  v_delta    numeric;
  v_kind     public.event_kind;
begin
  perform app.require_membership(p_organization_id);

  if coalesce(btrim(p_note), '') = '' then
    raise exception 'why was it wrong? a correction needs an explanation'
      using errcode = 'check_violation';
  end if;

  select id into v_lot from public.lots
  where organization_id = p_organization_id and code = btrim(p_lot_code);

  if v_lot is null then
    raise exception 'there is no lot called %', p_lot_code using errcode = 'no_data_found';
  end if;

  if p_reason not in ('resolution', 'adjustment', 'count_variance') then
    raise exception 'a correction must be a resolution, an adjustment or a count variance'
      using errcode = 'check_violation';
  end if;

  v_vessel   := app.ensure_vessel(p_organization_id, p_vessel_code, 'tank');
  v_expected := app.lot_balance(v_lot, p_unit);
  v_delta    := round(p_observed_quantity - v_expected, 6);

  if v_delta = 0 then
    return app.record_event(
      p_organization_id, 'observation', p_occurred_at, '[]'::jsonb,
      'count_confirmed', p_note,
      jsonb_build_object('expected', v_expected, 'observed', p_observed_quantity, 'unit', p_unit),
      v_lot, v_vessel
    );
  end if;

  v_kind := case when p_reason = 'count_variance' then 'count'::public.event_kind
                 else 'adjustment'::public.event_kind end;

  return app.record_event(
    p_organization_id, v_kind, p_occurred_at,
    jsonb_build_array(jsonb_build_object(
      'lot_id', v_lot, 'vessel_id', v_vessel,
      'quantity', v_delta, 'unit', p_unit,
      'basis', p_basis::text, 'reason', p_reason::text)),
    case when p_reason = 'count_variance' then 'physical_count' else 'correction' end,
    p_note,
    jsonb_build_object('expected', v_expected, 'observed', p_observed_quantity, 'unit', p_unit),
    v_lot, v_vessel
  );
end;
$$;


-- =============================================================================
-- What the capture surface reads back
--
-- One row per lot, in the words an operator uses: what it is, where it is, how
-- much, how well that is known, and what happened last.
-- =============================================================================
create or replace view public.lot_overview with (security_invoker = true) as
  select l.organization_id,
         l.id            as lot_id,
         l.code,
         l.name,
         l.data_origin,
         l.opened_at,
         l.archived_at,
         b.unit,
         coalesce(b.quantity, 0) as quantity,
         s.stage,
         s.occurred_at   as stage_since,
         v.code          as vessel_code,
         last_seen.occurred_at as last_activity,
         basis.worst     as confidence
  from public.lots l
  left join public.lot_balances b on b.lot_id = l.id
  left join public.lot_current_stage s on s.lot_id = l.id
  left join lateral (
    select p.vessel_id
    from public.lot_vessel_positions p
    where p.lot_id = l.id and p.quantity <> 0
    order by p.quantity desc
    limit 1
  ) pos on true
  left join public.vessels v on v.id = pos.vessel_id
  left join lateral (
    select max(t.occurred_at) as occurred_at
    from public.lot_timeline t where t.lot_id = l.id
  ) last_seen on true
  -- Confidence follows the wine, not just the row. A lot whose every litre
  -- descends from "about two and a half tonnes" is not a measured quantity, no
  -- matter how carefully the later transfers were gauged — so ancestors count
  -- too, and the least certain input anywhere in the history wins.
  left join lateral (
    select case
             when bool_or(ll.basis = 'estimated') then 'estimated'
             when bool_or(ll.basis = 'stated')    then 'stated'
             when bool_or(ll.basis = 'derived')   then 'derived'
             else 'measured'
           end as worst
    from public.ledger_lines ll
    where ll.material_id is null
      and (ll.lot_id = l.id
           or ll.lot_id in (select a.ancestor_lot_id
                            from public.lot_ancestry a where a.lot_id = l.id))
  ) basis on true;


-- =============================================================================
-- Grants
-- =============================================================================
grant select on public.lot_overview to authenticated, service_role;

do $$
declare f text;
begin
  foreach f in array array[
    'public.capture_reception(uuid,timestamptz,text,numeric,text,text,public.quantity_basis,text,text,text,text,text,text,numeric,text)',
    'public.capture_processing(uuid,timestamptz,text,text,numeric,text,numeric,text,text,public.quantity_basis,text,text,numeric,text,text,text)',
    'public.capture_transfer(uuid,timestamptz,text,numeric,text,jsonb,text,public.quantity_basis,public.delta_reason,text,text,text)',
    'public.capture_stage(uuid,timestamptz,text,text,text)',
    'public.capture_observation(uuid,timestamptz,text,jsonb,text,text,text)',
    'public.capture_correction(uuid,timestamptz,text,numeric,text,text,public.quantity_basis,public.delta_reason,text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

grant execute on function app.ensure_vessel(uuid,text,text,numeric,text)   to authenticated, service_role;
grant execute on function app.ensure_lot(uuid,text,text)                   to authenticated, service_role;
grant execute on function app.ensure_material(uuid,text,text,text,text)    to authenticated, service_role;
grant execute on function app.lot_balance(uuid,text)                       to authenticated, service_role;
grant execute on function app.require_membership(uuid)                     to authenticated, service_role;
