-- =============================================================================
-- PROOF · the board Aldo actually reads
--
-- The tank board answered "where can the next load go". Sitting down with a
-- winemaker during his own vendimia, that is the second question. The first is
-- "is this my cellar?" — and to answer that it has to say, for every vessel:
-- what is in it, how much, how sure, what stage, **what happened to it last**,
-- and **what he said comes next**.
--
-- Everything here is derived. Nothing is stored twice, and nothing is guessed:
--
--   last operation   the most recent event that touched the wine, in the
--                    words the timeline already uses
--   next action      the last thing somebody said was next. Not inferred, not
--                    suggested — said, and recorded as an ordinary event
--   his own unit     the amount in the unit he last used for that wine, so a
--                    board answering "2.4 t" does not come back with "2,400 kg"
--
-- The next action is the smallest possible piece of intent, and deliberately
-- so. What Aldo calls a "lote" — a label with a recipe and a bottle target,
-- decided before the fruit exists — is a different thing that belongs in the
-- protocol layer, and nothing here pretends otherwise.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- What happened to this wine last
-- -----------------------------------------------------------------------------
create or replace view public.lot_last_operation with (security_invoker = true) as
  select distinct on (t.lot_id)
         t.organization_id,
         t.lot_id,
         e.id          as event_id,
         e.kind,
         e.type_key,
         e.occurred_at,
         e.note,
         app.kind_headline(e.kind, e.type_key) as headline
  from public.lot_timeline t
  join public.events e on e.id = t.event_id
  -- Saying what comes next is not something that happened to the wine. It is
  -- recorded as an event so it has a time and a history, but it must never be
  -- the answer to "what happened to this last".
  where e.type_key is distinct from 'next_action'
  order by t.lot_id, e.occurred_at desc, e.recorded_at desc, e.id;


-- -----------------------------------------------------------------------------
-- What he said comes next
--
-- Recorded as an ordinary observation, so it is an event like everything else:
-- it has a time, an author, and a history. Saying something new supersedes the
-- old one; saying nothing clears it. Nothing is ever edited in place.
-- -----------------------------------------------------------------------------
create or replace view public.lot_next_action with (security_invoker = true) as
  select distinct on (e.subject_lot_id)
         e.organization_id,
         e.subject_lot_id as lot_id,
         e.id             as event_id,
         e.occurred_at,
         e.note
  from public.events e
  where e.type_key = 'next_action' and e.subject_lot_id is not null
  order by e.subject_lot_id, e.occurred_at desc, e.recorded_at desc, e.id;


create or replace function public.capture_next_action(
  p_organization_id uuid,
  p_occurred_at     timestamptz,
  p_lot_code        text,
  p_note            text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot uuid;
begin
  perform app.require_membership(p_organization_id);

  select id into v_lot from public.lots
  where organization_id = p_organization_id and code = btrim(p_lot_code);

  if v_lot is null then
    raise exception 'there is no lot called %', p_lot_code using errcode = 'no_data_found';
  end if;

  -- Nothing moves. This is somebody saying what they intend to do, which is
  -- worth remembering and is not a change to the wine.
  return app.record_event(
    p_organization_id, 'observation', p_occurred_at, '[]'::jsonb,
    'next_action', nullif(btrim(coalesce(p_note, '')), ''), '{}'::jsonb, v_lot
  );
end;
$$;

revoke all on function public.capture_next_action(uuid,timestamptz,text,text) from public, anon;
grant execute on function public.capture_next_action(uuid,timestamptz,text,text)
  to authenticated, service_role;

grant select on public.lot_last_operation, public.lot_next_action
  to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- The board, restated
-- -----------------------------------------------------------------------------
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
          -- The same amount in the unit he last used for this wine. He says
          -- "dos punto cuatro toneladas"; the board should not answer him in
          -- kilograms. Cases and bottles already net in their own base, so
          -- this only ever changes t↔kg and hL↔L — never invents a conversion
          -- that depends on a bill of materials.
          'quantity_said', round(p.quantity / nullif(said.to_base, 0), 3),
          'unit_said',     said.code,
          'stage',      s.stage,
          'confidence', conf.worst,
          -- What happened to it last, and what he said comes next. Both are
          -- derived: the first from the ledger, the second from the last time
          -- anybody said it out loud.
          'last_operation', last_op.headline,
          'last_note',      last_op.note,
          'last_at',        last_op.occurred_at,
          'next_action',    nullif(btrim(coalesce(nxt.note, '')), '')
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
      -- The unit this wine was last talked about in.
      select u.code, u.to_base
      from public.ledger_lines ll3
      join public.units u on u.code = ll3.unit_code
      where ll3.lot_id = p.lot_id and ll3.material_id is null
        and u.base_code = p.unit
      order by ll3.created_at desc
      limit 1
    ) said on true
    left join public.lot_last_operation last_op on last_op.lot_id = p.lot_id
    left join public.lot_next_action    nxt     on nxt.lot_id = p.lot_id
    left join lateral (
      select max(e.occurred_at) as last_at
      from public.ledger_lines ll2
      join public.events e on e.id = ll2.event_id
      where ll2.vessel_id = v.id
    ) t on true
    where p.vessel_id = v.id and p.quantity <> 0
  ) c on true
  where v.is_active;



grant select on public.vessel_board to authenticated, service_role;
