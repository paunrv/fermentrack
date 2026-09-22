-- =============================================================================
-- PROOF · Cycle 1 · Step 8 · F1 — a transfer can go to more than one tank
--
-- The dry run said "Tank 7 and Tank 8, about half each" and PROOF recorded that
-- half the wine evaporated. Everything below is written from that sentence
-- backwards: the exact failure first, then the general rule it belongs to.
--
--     An unrepresented destination is not a loss.
--     PROOF must not turn missing information into a physical loss.
--
-- Recorded as Aldo, an ordinary signed-in member, because a rule that only
-- holds for the service role is not a rule.
-- =============================================================================

set role service_role;
set request.jwt.claims = '{"role":"service_role"}';

insert into public.organizations (id, slug, name, status, data_origin) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', 'racking-pilot', 'Racking Pilot', 'active', 'synthetic');

select app.grant_membership('racking-pilot', 'aldo@vinasdeltigre.example', 'owner');

reset role;
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';


-- =============================================================================
-- THE FAILURE, REPRODUCED
--
-- "Racked it into Tank 7 and Tank 8, about half each."
--
-- 1,050 L of wine, 525 into each tank. Before this step the sheet took one
-- destination, so 525 L became an expected loss. Nothing about the numbers has
-- changed; the operator can now say the second half of the sentence.
-- =============================================================================
select public.capture_reception(
  p_organization_id => 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f',
  p_occurred_at     => '2026-03-01 08:00+00',
  p_lot_code        => 'F1-WINE',
  p_lot_name        => 'Cabernet, co-ferment',
  p_quantity        => 1050,
  p_unit            => 'L',
  p_basis           => 'measured',
  p_vessel_code     => 'TK-4'
);

select public.capture_transfer(
  p_organization_id  => 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f',
  p_occurred_at      => '2026-03-02 09:00+00',
  p_lot_code         => 'F1-WINE',
  p_from_vessel_code => 'TK-4',
  p_quantity_out     => 1050,
  p_unit             => 'L',
  p_destinations     => jsonb_build_array(
    jsonb_build_object('vessel_code', 'TK-7', 'quantity', 525),
    jsonb_build_object('vessel_code', 'TK-8', 'quantity', 525)),
  p_note             => 'Racked into Tank 7 and Tank 8, about half each'
);

insert into t.results (name, want, got)
select 'the racking · nothing was lost, because nothing was lost', '0', count(*)::text
from public.ledger_lines l
join public.events e on e.id = l.event_id
where e.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f'
  and e.kind = 'transfer' and l.reason <> 'movement';

insert into t.results (name, want, got)
select 'the racking · the wine went to two tanks', '2', count(distinct l.vessel_id)::text
from public.ledger_lines l
join public.events e on e.id = l.event_id
where e.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f'
  and e.kind = 'transfer' and l.quantity > 0;

insert into t.results (name, want, got)
select 'the racking · Tank 7 holds half', '525.000000', quantity::text
from public.lot_vessel_positions p
join public.vessels v on v.id = p.vessel_id
join public.lots lo on lo.id = p.lot_id
where lo.code = 'F1-WINE' and v.code = 'TK-7';

insert into t.results (name, want, got)
select 'the racking · Tank 8 holds the other half', '525.000000', quantity::text
from public.lot_vessel_positions p
join public.vessels v on v.id = p.vessel_id
join public.lots lo on lo.id = p.lot_id
where lo.code = 'F1-WINE' and v.code = 'TK-8';

insert into t.results (name, want, got)
select 'the racking · the lot still holds every litre it started with', '1050.000000',
       quantity::text
from public.lot_overview where code = 'F1-WINE';

insert into t.results (name, want, got)
select 'the racking · the source tank is empty', '0.000000', coalesce(occupied_base, 0)::text
from public.vessel_occupancy
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f' and code = 'TK-4';

-- The invariant that made the false loss possible in the first place still
-- holds. It was never wrong — it was fed a lie.
insert into t.results (name, want, got)
select 'the racking · the movement legs still cancel', '0', count(*)::text
from (
  select sum(l.quantity * u.to_base) as net
  from public.ledger_lines l
  join public.units u on u.code = l.unit_code
  where l.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f' and l.reason = 'movement'
  group by u.base_code having sum(l.quantity * u.to_base) <> 0
) s;

-- The story a person reads has to say both tanks too. A destination the ledger
-- holds and the screen hides is the same untruth wearing different clothes.
insert into t.results (name, want, got)
select 'the racking · the story names both tanks', 'TK-7|TK-8',
       (select string_agg(d ->> 'code', '|' order by d ->> 'code')
        from jsonb_array_elements(s.to_vessels) d)
from public.lot_story s
join public.lots lo on lo.id = s.subject_lot_id
where lo.code = 'F1-WINE' and s.kind = 'transfer';

insert into t.results (name, want, got)
select 'the racking · with how much went into each', '525.000000|525.000000',
       (select string_agg(d ->> 'quantity', '|' order by d ->> 'code')
        from jsonb_array_elements(s.to_vessels) d)
from public.lot_story s
join public.lots lo on lo.id = s.subject_lot_id
where lo.code = 'F1-WINE' and s.kind = 'transfer';


-- =============================================================================
-- CASE A — exact. 1,000 out, 500 and 500 in. No loss.
-- =============================================================================
select public.capture_reception(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-03 08:00+00',
  'F1-A', 1000, 'L', p_basis => 'measured', p_vessel_code => 'TK-A0');

select public.capture_transfer(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-04 08:00+00', 'F1-A', 1000, 'L',
  jsonb_build_array(
    jsonb_build_object('vessel_code', 'TK-A1', 'quantity', 500),
    jsonb_build_object('vessel_code', 'TK-A2', 'quantity', 500)),
  p_from_vessel_code => 'TK-A0');

insert into t.results (name, want, got)
select 'case A · exact — no loss line exists at all', '0', count(*)::text
from public.ledger_lines l
join public.lots lo on lo.id = l.lot_id
where lo.code = 'F1-A' and l.reason <> 'movement' and l.reason <> 'receipt';


-- =============================================================================
-- CASE B — partial. 1,000 out, 500 and 400 in. 100 unaccounted for, and the
-- person who was there says what happened to it.
-- =============================================================================
select public.capture_reception(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-03 08:00+00',
  'F1-B', 1000, 'L', p_basis => 'measured', p_vessel_code => 'TK-B0');

select public.capture_transfer(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-04 08:00+00', 'F1-B', 1000, 'L',
  jsonb_build_array(
    jsonb_build_object('vessel_code', 'TK-B1', 'quantity', 500),
    jsonb_build_object('vessel_code', 'TK-B2', 'quantity', 400)),
  p_from_vessel_code => 'TK-B0',
  p_shortfall_reason => 'expected_loss',
  p_shortfall_note   => 'Lees');

insert into t.results (name, want, got)
select 'case B · partial — the hundred litres are named, not absorbed',
       '-100.000000|expected_loss',
       l.quantity::text || '|' || l.reason::text
from public.ledger_lines l
join public.lots lo on lo.id = l.lot_id
where lo.code = 'F1-B' and l.reason not in ('movement', 'receipt');

insert into t.results (name, want, got)
select 'case B · and nobody typed the hundred', '900.000000', quantity::text
from public.lot_overview where code = 'F1-B';


-- =============================================================================
-- CASE C — three destinations. 1,000 out; 300, 300 and 250 in.
-- =============================================================================
select public.capture_reception(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-03 08:00+00',
  'F1-C', 1000, 'L', p_basis => 'measured', p_vessel_code => 'TK-C0');

select public.capture_transfer(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-04 08:00+00', 'F1-C', 1000, 'L',
  jsonb_build_array(
    jsonb_build_object('vessel_code', 'TK-C1', 'quantity', 300),
    jsonb_build_object('vessel_code', 'TK-C2', 'quantity', 300),
    jsonb_build_object('vessel_code', 'TK-C3', 'quantity', 250)),
  p_from_vessel_code => 'TK-C0',
  p_shortfall_reason => 'incident_loss',
  p_shortfall_note   => 'Hose came off');

insert into t.results (name, want, got)
select 'case C · three tanks, and the gap is 150', '-150.000000|incident_loss',
       l.quantity::text || '|' || l.reason::text
from public.ledger_lines l
join public.lots lo on lo.id = l.lot_id
where lo.code = 'F1-C' and l.reason not in ('movement', 'receipt');

insert into t.results (name, want, got)
select 'case C · the wine is in three tanks', '3', count(*)::text
from public.lot_vessel_positions p
join public.lots lo on lo.id = p.lot_id
join public.vessels v on v.id = p.vessel_id
where lo.code = 'F1-C' and v.code like 'TK-C_' and v.code <> 'TK-C0' and p.quantity > 0;


-- =============================================================================
-- ONE DESTINATION STILL WORKS, exactly as it did in Step 3
-- =============================================================================
select public.capture_reception(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-03 08:00+00',
  'F1-ONE', 1000, 'L', p_basis => 'measured', p_vessel_code => 'TK-D0');

select public.capture_transfer(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-04 08:00+00', 'F1-ONE', 1000, 'L',
  jsonb_build_array(jsonb_build_object('vessel_code', 'TK-D1', 'quantity', 1000)),
  p_from_vessel_code => 'TK-D0');

insert into t.results (name, want, got)
select 'single destination · still a plain move, with nothing invented', '1000.000000|TK-D1',
       o.quantity::text || '|' || o.vessel_code
from public.lot_overview o where o.code = 'F1-ONE';


-- =============================================================================
-- LINEAGE — every destination, both directions
--
-- "Split it: six hundred stays as one wine, four hundred becomes another."
-- Where did it go, and where did each of those come from.
-- =============================================================================
select public.capture_reception(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-05 08:00+00',
  'F1-PARENT', 1000, 'L', p_basis => 'measured', p_vessel_code => 'TK-E0');

select public.capture_transfer(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-06 08:00+00', 'F1-PARENT', 1000, 'L',
  jsonb_build_array(
    jsonb_build_object('vessel_code', 'TK-E1', 'quantity', 600,
                       'lot_code', 'F1-CHILD-1', 'lot_name', 'Kept in E1'),
    jsonb_build_object('vessel_code', 'TK-E2', 'quantity', 400,
                       'lot_code', 'F1-CHILD-2', 'lot_name', 'Moved to E2')),
  p_from_vessel_code => 'TK-E0');

insert into t.results (name, want, got)
select 'lineage · "where did it go" answers with both', 'F1-CHILD-1|F1-CHILD-2',
       string_agg(child.code, '|' order by child.code)
from public.lot_lineage g
join public.lots parent on parent.id = g.parent_lot_id
join public.lots child on child.id = g.child_lot_id
where parent.code = 'F1-PARENT';

insert into t.results (name, want, got)
select 'lineage · "where did this come from" answers for the smaller half', 'F1-PARENT',
       anc.code
from public.lot_ancestry a
join public.lots lo on lo.id = a.lot_id
join public.lots anc on anc.id = a.ancestor_lot_id
where lo.code = 'F1-CHILD-2';

insert into t.results (name, want, got)
select 'lineage · and the wine divides without any of it disappearing', '1000.000000',
       (coalesce((select quantity from public.lot_overview where code = 'F1-CHILD-1'), 0)
      + coalesce((select quantity from public.lot_overview where code = 'F1-CHILD-2'), 0))::text;


-- =============================================================================
-- THE RULE — missing information is refused, never converted into a loss
-- =============================================================================
do $$
declare v_org uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f';
begin
  perform public.capture_reception(v_org, '2026-03-07 08:00+00',
    'F1-REFUSE', 1000, 'L', p_basis => 'measured', p_vessel_code => 'TK-F0');

  -- The exact shape of the Step 7 failure: half the wine has nowhere to go and
  -- nobody has said why. Before this step it was recorded as expected loss.
  begin
    perform public.capture_transfer(v_org, '2026-03-08 08:00+00', 'F1-REFUSE', 1000, 'L',
      jsonb_build_array(jsonb_build_object('vessel_code', 'TK-F1', 'quantity', 500)),
      p_from_vessel_code => 'TK-F0');
    insert into t.results (name, want, got)
    values ('the rule · an unexplained gap is not a loss', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got)
    values ('the rule · an unexplained gap is not a loss', 'refused', 'refused');
  end;

  insert into t.results (name, want, got)
  select 'the rule · and the refusal left nothing behind', '1000.000000',
         quantity::text
  from public.lot_overview where code = 'F1-REFUSE';

  -- Saying what happened to it is all that was missing.
  begin
    perform public.capture_transfer(v_org, '2026-03-08 08:00+00', 'F1-REFUSE', 1000, 'L',
      jsonb_build_array(jsonb_build_object('vessel_code', 'TK-F1', 'quantity', 500)),
      p_from_vessel_code => 'TK-F0', p_shortfall_reason => 'waste',
      p_shortfall_note => 'Dumped, it was volatile');
    insert into t.results (name, want, got)
    values ('the rule · a gap with a reason records fine', 'recorded', 'recorded');
  exception when others then
    insert into t.results (name, want, got)
    values ('the rule · a gap with a reason records fine', 'recorded', sqlerrm);
  end;

  -- Naming the other tank is the other way to answer, and costs nothing.
  begin
    perform public.capture_transfer(v_org, '2026-03-09 08:00+00', 'F1-REFUSE', 500, 'L',
      jsonb_build_array(
        jsonb_build_object('vessel_code', 'TK-F2', 'quantity', 250),
        jsonb_build_object('vessel_code', 'TK-F3', 'quantity', 250)),
      p_from_vessel_code => 'TK-F1');
    insert into t.results (name, want, got)
    values ('the rule · naming the other tank needs no reason at all', 'recorded', 'recorded');
  exception when others then
    insert into t.results (name, want, got)
    values ('the rule · naming the other tank needs no reason at all', 'recorded', sqlerrm);
  end;

  -- A destination row with a tank and no amount is half a sentence.
  begin
    perform public.capture_transfer(v_org, '2026-03-10 08:00+00', 'F1-A', 100, 'L',
      jsonb_build_array(
        jsonb_build_object('vessel_code', 'TK-A1', 'quantity', 100),
        jsonb_build_object('vessel_code', 'TK-A9')));
    insert into t.results (name, want, got)
    values ('the rule · a tank with no amount is refused', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got)
    values ('the rule · a tank with no amount is refused', 'refused', 'refused');
  end;

  -- An empty row left on the sheet is not a destination, and must not become
  -- one — nor stop a perfectly good transfer being recorded.
  begin
    perform public.capture_transfer(v_org, '2026-03-11 08:00+00', 'F1-ONE', 1000, 'L',
      jsonb_build_array(
        jsonb_build_object('vessel_code', 'TK-D2', 'quantity', 1000),
        '{}'::jsonb),
      p_from_vessel_code => 'TK-D1');
    insert into t.results (name, want, got)
    values ('the rule · a blank row is ignored, not counted', 'recorded', 'recorded');
  exception when others then
    insert into t.results (name, want, got)
    values ('the rule · a blank row is ignored, not counted', 'recorded', sqlerrm);
  end;

  -- Still refused, as before: wine cannot arrive that never left.
  begin
    perform public.capture_transfer(v_org, '2026-03-12 08:00+00', 'F1-C', 100, 'L',
      jsonb_build_array(
        jsonb_build_object('vessel_code', 'TK-C1', 'quantity', 60),
        jsonb_build_object('vessel_code', 'TK-C2', 'quantity', 60)));
    insert into t.results (name, want, got)
    values ('the rule · more arriving than left is still refused', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got)
    values ('the rule · more arriving than left is still refused', 'refused', 'refused');
  end;
end $$;


-- =============================================================================
-- EVERYTHING AGREES
--
-- The board, the lot and the ledger are three readings of one set of lines. If
-- multi-destination broke that agreement it would have replaced one falsehood
-- with another.
-- =============================================================================
insert into t.results (name, want, got)
select 'agreement · every tank holds what the lots in it say it holds', '0', count(*)::text
from (
  select p.vessel_id, p.unit, round(sum(p.quantity), 6) as from_lots
  from public.lot_vessel_positions p
  where p.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f'
  group by p.vessel_id, p.unit
) lots
join public.vessel_occupancy o
  on o.vessel_id = lots.vessel_id and o.base_unit = lots.unit
where round(o.occupied_base, 6) <> lots.from_lots;

insert into t.results (name, want, got)
select 'agreement · no litre of it is anywhere PROOF cannot name', '0', count(*)::text
from public.ledger_lines l
where l.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f'
  and l.reason = 'movement' and l.quantity > 0 and l.vessel_id is null;


-- =============================================================================
-- THE BOARD ALDO READS
--
-- What is in it, in the unit he used, what happened to it last, and what he
-- said comes next. All derived; none of it stored twice.
-- =============================================================================
select public.capture_reception(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-20 08:00+00',
  'F1-TON', 2.4, 't', p_vessel_code => 'BIN-T');

insert into t.results (name, want, got)
select 'board · answers in the unit he used, not the one PROOF nets in', '2.400|t',
       (c ->> 'quantity_said') || '|' || (c ->> 'unit_said')
from public.vessel_board b, jsonb_array_elements(b.contents) c
where b.code = 'BIN-T';

insert into t.results (name, want, got)
select 'board · and still knows the netting unit underneath', '2400.000000|kg',
       (c ->> 'quantity') || '|' || (c ->> 'unit')
from public.vessel_board b, jsonb_array_elements(b.contents) c
where b.code = 'BIN-T';

insert into t.results (name, want, got)
select 'board · says what happened to it last', 'Received',
       c ->> 'last_operation'
from public.vessel_board b, jsonb_array_elements(b.contents) c
where b.code = 'BIN-T';

insert into t.results (name, want, got)
select 'board · and nothing is next until somebody says so', 'null',
       coalesce(c ->> 'next_action', 'null')
from public.vessel_board b, jsonb_array_elements(b.contents) c
where b.code = 'BIN-T';

select public.capture_next_action(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-21 07:00+00',
  'F1-TON', 'Moler mañana temprano');

insert into t.results (name, want, got)
select 'board · what he said comes next', 'Moler mañana temprano',
       c ->> 'next_action'
from public.vessel_board b, jsonb_array_elements(b.contents) c
where b.code = 'BIN-T';

-- Saying what is next is not something that happened to the wine.
insert into t.results (name, want, got)
select 'board · and saying it did not become the last thing that happened', 'Received',
       c ->> 'last_operation'
from public.vessel_board b, jsonb_array_elements(b.contents) c
where b.code = 'BIN-T';

select public.capture_next_action(
  'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f', '2026-03-22 07:00+00', 'F1-TON', '');

insert into t.results (name, want, got)
select 'board · clearing it clears it, without deleting anything', 'null',
       coalesce(c ->> 'next_action', 'null')
from public.vessel_board b, jsonb_array_elements(b.contents) c
where b.code = 'BIN-T';

insert into t.results (name, want, got)
select 'board · and both things he said are still on the record', '2', count(*)::text
from public.events
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-0000000f1f1f' and type_key = 'next_action';
