-- =============================================================================
-- PROOF · Cycle 1 · Step 6 — The tank board
--
-- "What is in my tanks, and how much room have I actually got?"
--
-- A projection, like the timeline. Occupancy is the sum of ledger lines
-- carrying a vessel; nothing about what a tank contains is stored anywhere.
--
-- The uncomfortable part this view has to be honest about: a vessel created by
-- somebody typing "Tank 9" mid-capture has no recorded size. That was the right
-- trade for pace in Step 3 — an equipment wizard would have wrecked it — but it
-- means the board cannot answer its own headline question for those vessels.
-- Showing zero, or quietly leaving them out of the totals, would be a lie of
-- exactly the kind `basis` exists to prevent. So they are reported as unknown,
-- counted separately, and the board asks for the number it needs.
-- =============================================================================

create or replace view public.vessel_board with (security_invoker = true) as
  select
    v.organization_id,
    v.id            as vessel_id,
    v.code,
    v.name,
    v.vessel_type,
    v.capacity,
    v.capacity_unit,
    coalesce(cu.base_code, c.unit)                    as unit,
    round(v.capacity * cu.to_base, 6)                 as capacity_base,
    round(coalesce(c.occupied, 0), 6)                 as occupied,

    case when v.capacity is not null
         then round(v.capacity * cu.to_base - coalesce(c.occupied, 0), 6) end as available,

    case when v.capacity is not null and v.capacity * cu.to_base > 0
         then round(coalesce(c.occupied, 0) / (v.capacity * cu.to_base), 4) end as fill,

    coalesce(c.contents, '[]'::jsonb)                 as contents,
    coalesce(c.lot_count, 0)                          as lot_count,

    -- `over` is worth its own state rather than a negative number. More wine in
    -- a tank than the tank holds means either the volume or the capacity is
    -- wrong, and both are worth somebody's attention.
    case
      when v.capacity is null                                              then 'unknown_size'
      when coalesce(c.occupied, 0) > v.capacity * cu.to_base + 0.000001    then 'over'
      when coalesce(c.occupied, 0) > 0                                     then 'in_use'
      else 'empty'
    end as status,

    c.last_activity
  from public.vessels v
  left join public.units cu on cu.code = v.capacity_unit
  left join lateral (
    select
      -- Only quantities in the same family as the vessel's own measure count
      -- towards how full it is. A bin measured in kilograms and a tank measured
      -- in litres must never be added together.
      sum(p.quantity) filter (where cu.base_code is null or p.unit = cu.base_code) as occupied,
      count(*)                                                                     as lot_count,
      max(p.unit)                                                                  as unit,
      max(t.last_at)                                                               as last_activity,
      jsonb_agg(
        jsonb_build_object(
          'lot_code',   l.code,
          'lot_name',   l.name,
          'quantity',   p.quantity,
          'unit',       p.unit,
          'stage',      s.stage,
          'confidence', conf.worst
        ) order by p.quantity desc
      ) as contents
    from public.lot_vessel_positions p
    join public.lots l on l.id = p.lot_id
    left join public.lot_current_stage s on s.lot_id = p.lot_id
    left join lateral (
      -- The same rule the lot card uses: a guess anywhere upstream still
      -- governs, so a tank holding wine descended from "about 2.4 tonnes" says
      -- so rather than looking measured.
      select case
               when bool_or(ll.basis = 'estimated') then 'estimated'
               when bool_or(ll.basis = 'stated')    then 'stated'
               when bool_or(ll.basis = 'derived')   then 'derived'
               else 'measured'
             end as worst
      from public.ledger_lines ll
      where ll.material_id is null
        and (ll.lot_id = p.lot_id
             or ll.lot_id in (select a.ancestor_lot_id
                              from public.lot_ancestry a where a.lot_id = p.lot_id))
    ) conf on true
    left join lateral (
      select max(e.occurred_at) as last_at
      from public.ledger_lines ll2
      join public.events e on e.id = ll2.event_id
      where ll2.vessel_id = v.id
    ) t on true
    where p.vessel_id = v.id and p.quantity <> 0
  ) c on true
  where v.is_active;


-- -----------------------------------------------------------------------------
-- Answering the board's own question.
--
-- Deliberately the only thing that can be changed from the board: how big a
-- vessel is. No creating, no renaming, no deleting — a vessel still comes into
-- existence by being used, and stops mattering by being empty. This exists
-- because the board asks "how much room have you got" and cannot answer it
-- for a tank whose size nobody has ever told us.
-- -----------------------------------------------------------------------------
create or replace function public.set_vessel_size(
  p_organization_id uuid,
  p_vessel_code     text,
  p_capacity        numeric,
  p_capacity_unit   text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  perform app.require_membership(p_organization_id);

  if p_capacity is null or p_capacity <= 0 then
    raise exception 'how big is it? a size needs to be more than nothing'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.units where code = p_capacity_unit) then
    raise exception 'unknown unit %', p_capacity_unit using errcode = 'check_violation';
  end if;

  update public.vessels
     set capacity = p_capacity, capacity_unit = p_capacity_unit
   where organization_id = p_organization_id and code = btrim(p_vessel_code)
  returning id into v_id;

  if v_id is null then
    raise exception 'there is no vessel called %', p_vessel_code
      using errcode = 'no_data_found';
  end if;
end;
$$;

revoke all on function public.set_vessel_size(uuid, text, numeric, text) from public, anon;
grant execute on function public.set_vessel_size(uuid, text, numeric, text)
  to authenticated, service_role;

grant select on public.vessel_board to authenticated, service_role;


-- =============================================================================
-- Corrections belong to the vessel the wine is actually in
--
-- Found by building this board: Tank 7 read 1,700 L while the lot itself read
-- 1,685. Both figures were derived, and both were arithmetically right — the
-- correction had simply been recorded without a vessel, so its −15 L belonged
-- to no tank. Two derived views disagreeing about the same wine is the exact
-- failure the ledger exists to prevent, and the fix belongs at the source
-- rather than in a view that quietly reconciles them.
--
-- A correction about a lot sitting in a tank is a correction about what is in
-- that tank, so when the caller does not say where, PROOF uses where the wine
-- already is.
-- =============================================================================
create or replace function app.lot_current_vessel(p_lot_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.vessel_id
  from public.lot_vessel_positions p
  where p.lot_id = p_lot_id and p.quantity <> 0
  order by p.quantity desc
  limit 1;
$$;

grant execute on function app.lot_current_vessel(uuid) to authenticated, service_role;

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

  -- Where the wine is, unless told otherwise.
  v_vessel   := coalesce(app.ensure_vessel(p_organization_id, p_vessel_code, 'tank'),
                         app.lot_current_vessel(v_lot));
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
