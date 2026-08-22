-- =============================================================================
-- PROOF · Cycle 1 · Step 4 — The lot story
--
-- A projection, not a table. Nothing here is stored: every row is computed from
-- events, ledger lines and lineage at read time. There is no second timeline
-- database, and no lot.current_anything was added to make the screen easier.
--
-- The humanising lives here rather than in the interface on purpose. If React
-- decided how to describe a racking, then the mobile view, the tank board and
-- the AI narration would each decide it differently. One projection, many
-- surfaces — the same argument as ADR 0007, running the other way.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Words for things the ledger names in its own vocabulary.
-- -----------------------------------------------------------------------------
create or replace function app.reason_label(p_reason public.delta_reason)
returns text
language sql
immutable
as $$
  select case p_reason
    when 'receipt'        then 'received'
    when 'movement'       then 'moved'
    when 'transformation' then 'transformed'
    when 'resolution'     then 'measurement corrected'
    when 'consumption'    then 'used'
    when 'expected_loss'  then 'expected loss'
    when 'incident_loss'  then 'loss'
    when 'waste'          then 'waste'
    when 'adjustment'     then 'adjustment'
    when 'count_variance' then 'unaccounted for'
  end;
$$;

create or replace function app.kind_headline(
  p_kind     public.event_kind,
  p_type_key text
)
returns text
language sql
immutable
as $$
  select case p_kind
    -- A stage is the one event whose headline is the operator's own words.
    -- "inicio de fermentación" beats anything we would write for them.
    when 'stage'       then coalesce(nullif(btrim(p_type_key), ''), 'Stage change')
    when 'receipt'     then 'Received'
    when 'transform'   then 'Processed'
    when 'transfer'    then 'Moved'
    when 'split'       then 'Split'
    when 'blend'       then 'Blended'
    when 'package'     then 'Bottled'
    when 'consume'     then 'Used'
    when 'loss'        then 'Loss recorded'
    when 'adjustment'  then 'Corrected'
    when 'count'       then 'Counted'
    when 'observation' then 'Noted'
  end;
$$;

-- How confident a set of lines is, taken as the least confident among them.
create or replace function app.worst_basis(p_bases public.quantity_basis[])
returns public.quantity_basis
language sql
immutable
as $$
  select case
    when 'estimated' = any (p_bases) then 'estimated'::public.quantity_basis
    when 'stated'    = any (p_bases) then 'stated'::public.quantity_basis
    when 'derived'   = any (p_bases) then 'derived'::public.quantity_basis
    when 'measured'  = any (p_bases) then 'measured'::public.quantity_basis
  end;
$$;


-- -----------------------------------------------------------------------------
-- The primary unit a lot is held in.
--
-- A lot is fruit in kilograms or wine in litres, never both — but the ledger
-- does not forbid it, so the projection picks the unit carrying the most weight
-- rather than assuming.
-- -----------------------------------------------------------------------------
create or replace view public.lot_primary_unit with (security_invoker = true) as
  select distinct on (l.lot_id)
         l.organization_id,
         l.lot_id,
         u.base_code as unit
  from public.ledger_lines l
  join public.units u on u.code = l.unit_code
  where l.material_id is null and l.lot_id is not null
  group by l.organization_id, l.lot_id, u.base_code
  order by l.lot_id, sum(abs(l.quantity * u.to_base)) desc;


-- =============================================================================
-- THE STORY
--
-- One row per event that touched this lot, in the order it happened, carrying
-- everything a screen needs and no identifiers a person would not recognise.
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
                                  rows between unbounded preceding and current row), 6) as balance_after
  from base b;


-- =============================================================================
-- THE HEADER
--
-- What a person needs before reading the story: what this is, where it came
-- from, where it is now, how much, and how much of that to believe.
-- =============================================================================
create or replace view public.lot_card with (security_invoker = true) as
  select
    o.organization_id,
    o.lot_id,
    o.code,
    o.name,
    o.quantity,
    o.unit,
    o.stage,
    o.stage_since,
    o.vessel_code,
    o.confidence,
    o.last_activity,
    o.opened_at,
    o.archived_at,
    o.data_origin,

    -- Variety and origin come off the reception that started this wine, or off
    -- whichever ancestor was received if this lot is a descendant.
    prov.variety,
    prov.source,
    prov.source_kind,
    prov.received_at,
    prov.received_quantity,
    prov.received_unit,

    coalesce(parents.list, '[]'::jsonb) as came_from,
    coalesce(children.list, '[]'::jsonb) as became,
    coalesce(ev.event_count, 0)          as event_count
  from public.lot_overview o
  left join lateral (
    select e.metadata ->> 'variety'     as variety,
           e.metadata ->> 'source'      as source,
           e.metadata ->> 'source_kind' as source_kind,
           e.occurred_at                as received_at,
           l.quantity                   as received_quantity,
           l.unit_code                  as received_unit
    from public.events e
    join public.ledger_lines l on l.event_id = e.id
    where e.kind = 'receipt'
      and (l.lot_id = o.lot_id
           or l.lot_id in (select a.ancestor_lot_id from public.lot_ancestry a where a.lot_id = o.lot_id))
      and l.material_id is null
    order by e.occurred_at asc
    limit 1
  ) prov on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('lot_code', p.code, 'lot_name', p.name) order by p.code) as list
    from public.lot_lineage g join public.lots p on p.id = g.parent_lot_id
    where g.child_lot_id = o.lot_id
  ) parents on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('lot_code', c.code, 'lot_name', c.name) order by c.code) as list
    from public.lot_lineage g join public.lots c on c.id = g.child_lot_id
    where g.parent_lot_id = o.lot_id
  ) children on true
  left join lateral (
    select count(*) as event_count from public.lot_timeline t where t.lot_id = o.lot_id
  ) ev on true;


grant select on public.lot_primary_unit, public.lot_story, public.lot_card
  to authenticated, service_role;

grant execute on function app.reason_label(public.delta_reason)      to authenticated, service_role;
grant execute on function app.kind_headline(public.event_kind, text) to authenticated, service_role;
grant execute on function app.worst_basis(public.quantity_basis[])   to authenticated, service_role;
