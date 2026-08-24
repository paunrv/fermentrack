-- =============================================================================
-- PROOF · Cycle 1 · Step 8 · F1 — a transfer can go to more than one tank
--
-- The Step 7 dry run said "Tank 7 and Tank 8, about half each" and PROOF wrote
-- down that half the wine evaporated. The ledger was never the problem: it has
-- always taken an array of destinations. The capture layer offered one box, and
-- the shortfall rule — which exists so that a gap is never absorbed silently —
-- dutifully gave the unrepresented half a reason: expected loss.
--
-- That is the defect this migration closes, and it closes it as a rule rather
-- than a form change:
--
--     PROOF must not turn missing information into a physical loss.
--
-- So the shortfall reason loses its default. A gap between what left and what
-- arrived is now something the person recording has to account for — by naming
-- another destination, or by saying what happened to it. Nothing chooses on
-- their behalf, least of all a default argument.
--
-- Two reads are corrected to match, because a destination the ledger holds but
-- the screen does not show is the same untruth wearing different clothes.
-- =============================================================================


-- =============================================================================
-- MOVING WINE
--
-- "Seventeen-thirty came out of Tank A. Seventeen hundred went into Tank B."
-- "Rack it into Tank 7 and Tank 8, about half each."
--
-- Both are the same operation. The operator gives what left and what arrived
-- where; PROOF works out the relationship between them. Nobody types a delta,
-- and nobody is offered a pre-ticked reason for one.
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
  -- No default. A shortfall with no reason given is refused rather than
  -- quietly called expected loss — see the note above the refusal below.
  p_shortfall_reason public.delta_reason default null,
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
  v_dest_qty    numeric;
  v_dest_lot    uuid;
  v_dest_vessel uuid;
  v_named       integer := 0;
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

  if jsonb_typeof(p_destinations) <> 'array' then
    raise exception 'where did it go? a transfer needs at least one destination'
      using errcode = 'check_violation';
  end if;

  v_from := app.ensure_vessel(p_organization_id, p_from_vessel_code, 'tank');

  -- A sheet with a spare empty row on it has not said anything, so blank rows
  -- are not destinations. Everything else is counted, and the count is what
  -- decides whether a destination was named at all.
  for v_dest in select * from jsonb_array_elements(p_destinations)
  loop
    v_dest_qty := nullif(v_dest ->> 'quantity', '')::numeric;
    if v_dest_qty is null and nullif(btrim(coalesce(v_dest ->> 'vessel_code', '')), '') is null then
      continue;
    end if;
    if coalesce(v_dest_qty, 0) <= 0 then
      raise exception 'how much went into %? a destination needs an amount',
        coalesce(nullif(btrim(coalesce(v_dest ->> 'vessel_code', '')), ''), 'that tank')
        using errcode = 'check_violation';
    end if;
    v_named   := v_named + 1;
    v_arrived := v_arrived + v_dest_qty;
  end loop;

  if v_named = 0 then
    raise exception 'where did it go? a transfer needs at least one destination'
      using errcode = 'check_violation';
  end if;

  v_shortfall := round(p_quantity_out - v_arrived, 6);

  if v_shortfall < 0 then
    raise exception
      'more arrived (%) than left (%) — check the numbers, or record the extra as its own event',
      v_arrived, p_quantity_out using errcode = 'check_violation';
  end if;

  -- The rule this whole migration exists for.
  --
  -- A gap between what left and what arrived has exactly two honest readings:
  -- the wine went somewhere that has not been named, or it is gone. PROOF
  -- cannot tell which, and guessing costs a producer real wine on paper, so it
  -- asks instead of assuming.
  if v_shortfall > 0 and p_shortfall_reason is null then
    raise exception
      '% % unaccounted for — say which tank the rest went into, or what happened to it',
      v_shortfall, p_unit using errcode = 'check_violation';
  end if;

  -- The legs that cancel: only what actually reached a destination moves.
  for v_dest in select * from jsonb_array_elements(p_destinations)
  loop
    v_dest_qty := nullif(v_dest ->> 'quantity', '')::numeric;
    if v_dest_qty is null and nullif(btrim(coalesce(v_dest ->> 'vessel_code', '')), '') is null then
      continue;
    end if;

    v_dest_vessel := app.ensure_vessel(p_organization_id, v_dest ->> 'vessel_code', 'tank');

    if coalesce(btrim(v_dest ->> 'lot_code'), btrim(p_lot_code)) <> btrim(p_lot_code) then
      v_is_split := true;
      v_dest_lot := app.ensure_lot(p_organization_id, v_dest ->> 'lot_code', v_dest ->> 'lot_name');
      v_lineage := v_lineage || jsonb_build_array(jsonb_build_object(
        'parent_lot_id', v_lot, 'child_lot_id', v_dest_lot,
        'quantity', v_dest_qty, 'unit', p_unit));
    else
      v_dest_lot := v_lot;
    end if;

    v_lines := v_lines
      || jsonb_build_array(jsonb_build_object(
           'lot_id', v_lot, 'vessel_id', v_from,
           'quantity', -v_dest_qty, 'unit', p_unit,
           'basis', p_basis::text, 'reason', 'movement'))
      || jsonb_build_array(jsonb_build_object(
           'lot_id', v_dest_lot, 'vessel_id', v_dest_vessel,
           'quantity', v_dest_qty, 'unit', p_unit,
           'basis', p_basis::text, 'reason', 'movement'));
  end loop;

  -- The gap, named by the person who was there rather than by this function.
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

revoke all on function public.capture_transfer(uuid,timestamptz,text,numeric,text,jsonb,text,public.quantity_basis,public.delta_reason,text,text,text)
  from public, anon;
grant execute on function public.capture_transfer(uuid,timestamptz,text,numeric,text,jsonb,text,public.quantity_basis,public.delta_reason,text,text,text)
  to authenticated, service_role;


-- =============================================================================
-- THE STORY, restated so a second destination cannot fall out of it
--
-- Unchanged except for the last column: `to_vessels`, every tank this event put
-- wine into. `to_vessel` stays as it was — the largest single destination — so
-- nothing that already reads it changes meaning.
-- =============================================================================
create or replace view public.lot_story with (security_invoker = true) as
  with touched as (
    -- Events that moved something in this lot, plus events recorded against it
    -- that moved nothing at all. Both belong on the same timeline.
    select distinct t.organization_id, t.lot_id as subject_lot_id,
           t.lot_id as source_lot_id, t.event_id, false as is_inherited
    from public.lot_timeline t
    union
    -- And everything that happened to the wine before it had this name. A lot
    -- born in the press has no reception of its own, but the fruit it came from
    -- does, and that is the honest answer to "where did this come from".
    select distinct a.organization_id, a.lot_id as subject_lot_id,
           t.lot_id as source_lot_id, t.event_id, true as is_inherited
    from public.lot_ancestry a
    join public.lot_timeline t on t.lot_id = a.ancestor_lot_id
  ),
  base as (
    select
      e.organization_id,
      tc.subject_lot_id,
      tc.source_lot_id,
      src.code        as source_lot_code,
      src.name        as source_lot_name,
      tc.is_inherited,
      e.id            as event_id,
      e.kind,
      e.type_key,
      e.occurred_at,
      e.recorded_at,
      e.note,
      e.metadata,
      pu.unit         as unit,
      app.kind_headline(e.kind, e.type_key) as headline,

      -- This lot's own change, in this lot's own unit.
      coalesce((
        select round(sum(l.quantity * u.to_base), 6)
        from public.ledger_lines l join public.units u on u.code = l.unit_code
        where l.event_id = e.id and l.lot_id = tc.source_lot_id
          and l.material_id is null and u.base_code = pu.unit
      ), 0) as net_change,

      coalesce((
        select round(sum(l.quantity * u.to_base), 6)
        from public.ledger_lines l join public.units u on u.code = l.unit_code
        where l.event_id = e.id and l.lot_id = tc.source_lot_id
          and l.material_id is null and u.base_code = pu.unit
          and l.reason = 'movement' and l.quantity > 0
      ), 0) as moved_in,

      coalesce((
        select round(-sum(l.quantity * u.to_base), 6)
        from public.ledger_lines l join public.units u on u.code = l.unit_code
        where l.event_id = e.id and l.lot_id = tc.source_lot_id
          and l.material_id is null and u.base_code = pu.unit
          and l.reason = 'movement' and l.quantity < 0
      ), 0) as moved_out,

      -- Everything that was not simply moved: the losses, the corrections, the
      -- transformations. Each already carries the reason somebody gave it.
      coalesce((
        select jsonb_agg(jsonb_build_object(
                 'quantity', round(l.quantity * u.to_base, 6),
                 'unit',     u.base_code,
                 'reason',   l.reason,
                 'label',    app.reason_label(l.reason),
                 'note',     l.note
               ) order by l.quantity)
        from public.ledger_lines l join public.units u on u.code = l.unit_code
        where l.event_id = e.id and l.lot_id = tc.source_lot_id
          and l.material_id is null and l.reason <> 'movement'
      ), '[]'::jsonb) as changes,

      -- Materials consumed or produced alongside: packaging, additives, pomace.
      coalesce((
        select jsonb_agg(jsonb_build_object(
                 'material',  m.name,
                 'quantity',  round(l.quantity * u.to_base, 6),
                 'unit',      u.base_code,
                 'label',     app.reason_label(l.reason)
               ) order by m.name)
        from public.ledger_lines l
        join public.units u     on u.code = l.unit_code
        join public.materials m on m.id = l.material_id
        where l.event_id = e.id and l.material_id is not null
      ), '[]'::jsonb) as materials,

      (select v.code from public.ledger_lines l join public.vessels v on v.id = l.vessel_id
       where l.event_id = e.id and l.quantity < 0 and l.vessel_id is not null
       order by l.quantity limit 1) as from_vessel,

      (select v.code from public.ledger_lines l join public.vessels v on v.id = l.vessel_id
       where l.event_id = e.id and l.quantity > 0 and l.vessel_id is not null
       order by l.quantity desc limit 1) as to_vessel,

      -- Confidence in this lot's own numbers here, and in the event as a whole.
      -- The second is what surfaces "the source quantity was estimated": a
      -- carefully measured 1,730 L pressed out of a guessed 2.4 tonnes is not a
      -- measured 1,730 L.
      (select app.worst_basis(array_agg(l.basis))
       from public.ledger_lines l
       where l.event_id = e.id and l.lot_id = tc.source_lot_id and l.material_id is null) as confidence,

      (select app.worst_basis(array_agg(l.basis))
       from public.ledger_lines l where l.event_id = e.id) as event_confidence,

      -- Other lots this event tied us to, and which direction the wine went.
      coalesce((
        select jsonb_agg(distinct jsonb_build_object(
                 'lot_code',  other.code,
                 'lot_name',  other.name,
                 'direction', case when g.child_lot_id = tc.source_lot_id then 'from' else 'to' end,
                 'quantity',  g.quantity,
                 'unit',      g.unit_code))
        from public.lot_lineage g
        join public.lots other
          on other.id = case when g.child_lot_id = tc.source_lot_id then g.parent_lot_id else g.child_lot_id end
        where g.event_id = e.id
          and (g.child_lot_id = tc.source_lot_id or g.parent_lot_id = tc.source_lot_id)
      ), '[]'::jsonb) as related_lots,

      p.display_name  as actor_name,
      p.email         as actor_email
    from touched tc
    join public.events e on e.id = tc.event_id
    left join public.lot_primary_unit pu on pu.lot_id = tc.source_lot_id
    join public.lots src on src.id = tc.source_lot_id
    left join public.profiles p on p.id = e.actor_user_id
  )
  select
    b.*,
    row_number() over (partition by b.subject_lot_id
                       order by b.occurred_at, b.recorded_at, b.event_id) as seq,
    -- Running balance of whichever lot actually held the wine at the time, so
    -- an inherited row reports the fruit's kilograms rather than pretending
    -- they were this lot's litres.
    round(sum(b.net_change) over (partition by b.subject_lot_id, b.source_lot_id
                                  order by b.occurred_at, b.recorded_at, b.event_id
                                  rows between unbounded preceding and current row), 6) as balance_after,

    -- Every tank this event put wine into, not just the biggest one.
    --
    -- A racking into two tanks used to read "TK-4 → TK-7" because the single
    -- destination was picked by size. The second tank vanished from the story
    -- while sitting in the ledger, which is the same class of untruth as
    -- turning it into a loss.
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'code',     v.code,
               'quantity', round(l.quantity * u.to_base, 6),
               'unit',     u.base_code
             ) order by l.quantity desc)
      from public.ledger_lines l
      join public.vessels v on v.id = l.vessel_id
      join public.units u   on u.code = l.unit_code
      where l.event_id = b.event_id
        and l.reason = 'movement' and l.quantity > 0 and l.vessel_id is not null
    ), '[]'::jsonb) as to_vessels
  from base b;


grant select on public.lot_story to authenticated, service_role;
