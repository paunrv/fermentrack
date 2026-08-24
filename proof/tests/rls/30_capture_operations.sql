-- =============================================================================
-- PROOF · Cycle 1 · Step 3 — Harvest capture operations
--
-- The whole harvest is recorded here the way it will be recorded at the winery:
-- as Aldo, an ordinary authenticated session, calling the six operations with
-- the numbers a person actually has. Nothing in this file mentions a ledger
-- line, a delta or a reason code unless the point is that PROOF derived it.
-- =============================================================================

set role service_role;
set request.jwt.claims = '{"role":"service_role"}';

-- A separate organization so the harvest story stands on its own, and so a
-- user belonging to two organizations is exercised at the same time.
insert into public.organizations (id, slug, name, status, data_origin) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', 'harvest-pilot', 'Harvest Pilot', 'active', 'synthetic');

select app.grant_membership('harvest-pilot', 'aldo@vinasdeltigre.example', 'owner');


-- From here on, everything is done by a real signed-in person.
reset role;
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';


-- =============================================================================
-- "Tuesday we brought in about two and a half tonnes of Cabernet from
--  La Cañada. It went into the reception bin."
-- =============================================================================
select public.capture_reception(
  p_organization_id => 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe',
  p_occurred_at     => '2026-08-18 08:30+00',
  p_lot_code        => 'CS-26-H',
  p_lot_name        => 'Cabernet, La Cañada',
  p_quantity        => 2.4,
  p_unit            => 't',
  p_vessel_code     => 'BIN-A',
  p_source          => 'La Cañada',
  p_source_kind     => 'own',
  p_variety         => 'Cabernet Sauvignon',
  p_note            => 'About two and a half tonnes, eyeballed off the trailer'
);

insert into t.results (name, want, got)
select 'capture · the tonnes he said are the tonnes we stored', 't', unit_code
from public.ledger_lines l
join public.lots lo on lo.id = l.lot_id
where lo.code = 'CS-26-H';

insert into t.results (name, want, got)
select 'capture · the kilograms are derived, not typed', '2400.000000', quantity::text
from public.lot_overview where code = 'CS-26-H';

insert into t.results (name, want, got)
select 'capture · saying "about" is recorded as an estimate', 'estimated', confidence
from public.lot_overview where code = 'CS-26-H';

insert into t.results (name, want, got)
select 'capture · naming a bin that did not exist created it', 'BIN-A', code
from public.vessels
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe' and code = 'BIN-A';

insert into t.results (name, want, got)
select 'capture · where the fruit came from is kept', 'La Cañada', metadata ->> 'source'
from public.events where type_key = 'reception'
  and organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe';


-- =============================================================================
-- "We crushed it the same day. There's about 1,730 litres in Tank A now,
--  and the pomace went to the pile."
--
-- He does not say how much fruit went in — all of it did. Leaving the input
-- blank consumes whatever the ledger says is left.
-- =============================================================================
select public.capture_processing(
  p_organization_id    => 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe',
  p_occurred_at        => '2026-08-18 15:00+00',
  p_input_lot_code     => 'CS-26-H',
  p_output_lot_code    => 'MST-26-H',
  p_output_lot_name    => 'Cabernet must',
  p_output_quantity    => 1730,
  p_output_unit        => 'L',
  p_output_vessel_code => 'TK-A',
  p_byproduct_key      => 'pomace',
  p_byproduct_quantity => 640,
  p_byproduct_unit     => 'kg',
  p_note               => 'Destemmed and pressed'
);

insert into t.results (name, want, got)
select 'capture · pressing emptied the fruit without him saying how much', '0.000000',
       coalesce(max(quantity)::text, '0.000000')
from public.lot_overview where code = 'CS-26-H';

insert into t.results (name, want, got)
select 'capture · the must lot holds what he said', '1730.000000', quantity::text
from public.lot_overview where code = 'MST-26-H';

insert into t.results (name, want, got)
select 'capture · the must can name the fruit it came from', 'CS-26-H', parent.code
from public.lot_ancestry a
join public.lots child  on child.id  = a.lot_id
join public.lots parent on parent.id = a.ancestor_lot_id
where child.code = 'MST-26-H';

insert into t.results (name, want, got)
select 'capture · pomace is a byproduct, not a loss', '640.000000', quantity::text
from public.material_stock ms
join public.materials m on m.id = ms.material_id
where m.key = 'pomace' and m.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe';

insert into t.results (name, want, got)
select 'capture · the tank board shows the must', '1730.000000', occupied_base::text
from public.vessel_occupancy
where code = 'TK-A' and organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe';


-- =============================================================================
-- "It started fermenting on Thursday." · "Brix is 24.1 this morning."
-- =============================================================================
select public.capture_stage(
  'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', '2026-08-20 07:00+00',
  'MST-26-H', 'inicio de fermentación', 'Spontaneous, no inoculation');

select public.capture_observation(
  p_organization_id => 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe',
  p_occurred_at     => '2026-08-22 07:30+00',
  p_lot_code        => 'MST-26-H',
  p_readings        => jsonb_build_object('brix', 24.1, 'temp_c', 27),
  p_note            => 'Smells right');

insert into t.results (name, want, got)
select 'capture · his own words for the stage, accents and all', 'inicio de fermentación', stage
from public.lot_overview where code = 'MST-26-H';

insert into t.results (name, want, got)
select 'capture · the reading is kept as a reading', '24.1', metadata ->> 'brix'
from public.events
where kind = 'observation' and organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe';

insert into t.results (name, want, got)
select 'capture · neither of those moved any wine', '1730.000000', quantity::text
from public.lot_overview where code = 'MST-26-H';


-- =============================================================================
-- "We racked it into Tank B. Seventeen-thirty came out, seventeen hundred
--  went in."
--
-- Two numbers. PROOF finds the missing thirty litres, insists they are named,
-- and writes the movement so it cancels. Aldo never sees any of that.
-- =============================================================================
select public.capture_transfer(
  p_organization_id  => 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe',
  p_occurred_at      => '2026-09-05 10:00+00',
  p_lot_code         => 'MST-26-H',
  p_from_vessel_code => 'TK-A',
  p_quantity_out     => 1730,
  p_unit             => 'L',
  p_destinations     => jsonb_build_array(jsonb_build_object('vessel_code', 'TK-B', 'quantity', 1700)),
  p_shortfall_reason => 'expected_loss',
  p_shortfall_note   => 'Lees',
  p_note             => 'Racked off the gross lees'
);

insert into t.results (name, want, got)
select 'transfer · the lot holds what arrived', '1700.000000', quantity::text
from public.lot_overview where code = 'MST-26-H';

insert into t.results (name, want, got)
select 'transfer · the source tank is empty on the board', '0.000000', occupied_base::text
from public.vessel_occupancy
where code = 'TK-A' and organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe';

insert into t.results (name, want, got)
select 'transfer · PROOF found the 30 litres nobody mentioned', '-30.000000', quantity::text
from public.ledger_lines l
join public.events e on e.id = l.event_id
where e.type_key = 'transfer' and l.reason <> 'movement';

insert into t.results (name, want, got)
select 'transfer · and gave them a reason', 'expected_loss', reason::text
from public.ledger_lines l
join public.events e on e.id = l.event_id
where e.type_key = 'transfer' and l.reason <> 'movement';

insert into t.results (name, want, got)
select 'transfer · the movement legs cancel, as always', '0', count(*)::text
from (
  select sum(l.quantity * u.to_base) as net
  from public.ledger_lines l
  join public.units u on u.code = l.unit_code
  join public.events e on e.id = l.event_id
  where e.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe' and l.reason = 'movement'
  group by u.base_code having sum(l.quantity * u.to_base) <> 0
) s;


-- =============================================================================
-- "Split it — a thousand stays in Tank B, seven hundred goes to Tank C, and
--  they're separate wines from here."
--
-- Naming different lots at the destinations makes this a split. The lineage is
-- written without anybody asking for it.
-- =============================================================================
select public.capture_transfer(
  p_organization_id  => 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe',
  p_occurred_at      => '2026-09-20 09:00+00',
  p_lot_code         => 'MST-26-H',
  p_from_vessel_code => 'TK-B',
  p_quantity_out     => 1700,
  p_unit             => 'L',
  p_destinations     => jsonb_build_array(
    jsonb_build_object('vessel_code','TK-B','quantity',1000,'lot_code','CS-26-H1','lot_name','Cabernet, tank B'),
    jsonb_build_object('vessel_code','TK-C','quantity', 700,'lot_code','CS-26-H2','lot_name','Cabernet, tank C')),
  p_note             => 'Separated for different ageing'
);

insert into t.results (name, want, got)
select 'split · PROOF recognised it as a split, not a transfer', 'split', kind::text
from public.events
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe' and kind = 'split';

insert into t.results (name, want, got)
select 'split · nothing was lost in the dividing', '1700.000000',
       (coalesce((select quantity from public.lot_overview where code='CS-26-H1'),0)
      + coalesce((select quantity from public.lot_overview where code='CS-26-H2'),0))::text;

insert into t.results (name, want, got)
select 'split · both new wines know where they came from', '2', count(*)::text
from public.lot_ancestry a
join public.lots child on child.id = a.lot_id
where child.code in ('CS-26-H1','CS-26-H2') and a.depth = 1;

insert into t.results (name, want, got)
select 'split · and can still trace back to the fruit', 'true',
       (count(*) filter (where parent.code = 'CS-26-H') > 0)::text
from public.lot_ancestry a
join public.lots child  on child.id  = a.lot_id
join public.lots parent on parent.id = a.ancestor_lot_id
where child.code = 'CS-26-H1';


-- =============================================================================
-- "We gauged Tank B properly. It's 985, not a thousand."
--
-- He states what he sees. PROOF works out that fifteen litres were never there
-- and records that, rather than letting anyone edit a number in place.
-- =============================================================================
select public.capture_correction(
  p_organization_id   => 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe',
  p_occurred_at       => '2026-09-21 11:00+00',
  p_lot_code          => 'CS-26-H1',
  p_observed_quantity => 985,
  p_unit              => 'L',
  p_note              => 'Dipped the tank with a proper stick; the transfer figure was optimistic'
);

insert into t.results (name, want, got)
select 'correction · the ledger now agrees with the tank', '985.000000', quantity::text
from public.lot_overview where code = 'CS-26-H1';

insert into t.results (name, want, got)
select 'correction · he stated 985, PROOF worked out the −15', '-15.000000', l.quantity::text
from public.ledger_lines l
join public.events e on e.id = l.event_id
where e.type_key = 'correction';

insert into t.results (name, want, got)
select 'correction · an estimate becoming a measurement is not a loss', 'resolution', l.reason::text
from public.ledger_lines l
join public.events e on e.id = l.event_id
where e.type_key = 'correction';

insert into t.results (name, want, got)
select 'correction · what was believed and what was seen are both kept', '1000.000000|985',
       (e.metadata ->> 'expected') || '|' || (e.metadata ->> 'observed')
from public.events e where e.type_key = 'correction';

-- A count that agrees is evidence too.
select public.capture_correction(
  p_organization_id   => 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe',
  p_occurred_at       => '2026-09-21 11:30+00',
  p_lot_code          => 'CS-26-H2',
  p_observed_quantity => 700,
  p_unit              => 'L',
  p_note              => 'Checked Tank C as well'
);

insert into t.results (name, want, got)
select 'correction · a count that agrees is recorded, not discarded', 'count_confirmed', type_key
from public.events
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe' and type_key = 'count_confirmed';

insert into t.results (name, want, got)
select 'correction · and it moved nothing', '700.000000', quantity::text
from public.lot_overview where code = 'CS-26-H2';

-- A real stock count, which is a different thing again.
select public.capture_correction(
  p_organization_id   => 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe',
  p_occurred_at       => '2026-09-30 09:00+00',
  p_lot_code          => 'CS-26-H2',
  p_observed_quantity => 694,
  p_unit              => 'L',
  p_reason            => 'count_variance',
  p_note              => 'Monthly cellar count; six litres unaccounted for'
);

insert into t.results (name, want, got)
select 'correction · a stock count is filed as a count', 'count', kind::text
from public.events
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe' and kind = 'count';


-- =============================================================================
-- What Aldo sees when he looks at the winery
-- =============================================================================
insert into t.results (name, want, got)
select 'overview · every lot he has, in one place', '4', count(*)::text
from public.lot_overview where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe';

insert into t.results (name, want, got)
select 'overview · a lot says where it is', 'TK-C', vessel_code
from public.lot_overview where code = 'CS-26-H2';

insert into t.results (name, want, got)
-- CS-26-H1's own lines are all measured, but it is made of wine that arrived as
-- "about two and a half tonnes". The guess upstream still governs.
select 'overview · a guess upstream keeps the whole figure honest', 'estimated', confidence
from public.lot_overview where code = 'CS-26-H1';

insert into t.results (name, want, got)
-- Pressing, the stage, the reading, the racking, the split.
select 'overview · the timeline holds the whole harvest', '5', count(*)::text
from public.lot_timeline t
join public.lots l on l.id = t.lot_id
where l.code = 'MST-26-H';


-- =============================================================================
-- REFUSALS — the operator is protected from recording nonsense
-- =============================================================================
do $$
declare v_org uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe';
begin
  begin
    perform public.capture_transfer(v_org, now(), 'CS-26-H2', 100, 'L',
      jsonb_build_array(jsonb_build_object('vessel_code','TK-C','quantity',150)));
    insert into t.results (name, want, got) values ('refusal · more arriving than left', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('refusal · more arriving than left', 'refused', 'refused');
  end;

  begin
    perform public.capture_transfer(v_org, now(), 'CS-26-H2', 100, 'L', '[]'::jsonb);
    insert into t.results (name, want, got) values ('refusal · a transfer with nowhere to go', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('refusal · a transfer with nowhere to go', 'refused', 'refused');
  end;

  begin
    perform public.capture_reception(v_org, now(), 'X-1', 0, 'kg');
    insert into t.results (name, want, got) values ('refusal · a reception of nothing', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('refusal · a reception of nothing', 'refused', 'refused');
  end;

  begin
    perform public.capture_stage(v_org, now(), 'CS-26-H2', '   ');
    insert into t.results (name, want, got) values ('refusal · a nameless stage', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('refusal · a nameless stage', 'refused', 'refused');
  end;

  begin
    perform public.capture_observation(v_org, now(), 'CS-26-H2');
    insert into t.results (name, want, got) values ('refusal · an observation with nothing in it', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('refusal · an observation with nothing in it', 'refused', 'refused');
  end;

  begin
    perform public.capture_correction(v_org, now(), 'CS-26-H2', 500, 'L', '');
    insert into t.results (name, want, got) values ('refusal · an unexplained correction', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('refusal · an unexplained correction', 'refused', 'refused');
  end;

  begin
    perform public.capture_processing(v_org, now(), 'NOPE-1', 'OUT-1', 100, 'L');
    insert into t.results (name, want, got) values ('refusal · processing a lot that does not exist', 'refused', 'ACCEPTED');
  exception when no_data_found then
    insert into t.results (name, want, got) values ('refusal · processing a lot that does not exist', 'refused', 'refused');
  end;

  -- CS-26-H was fully consumed by the press; there is nothing left to press.
  begin
    perform public.capture_processing(v_org, now(), 'CS-26-H', 'OUT-2', 100, 'L');
    insert into t.results (name, want, got) values ('refusal · processing an empty lot', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('refusal · processing an empty lot', 'refused', 'refused');
  end;
end $$;

-- Nothing the refusals attempted should have leaked through.
insert into t.results (name, want, got)
select 'refusal · no half-written lot survived a refusal', '0', count(*)::text
from public.lots where code in ('X-1', 'OUT-1', 'OUT-2');


-- =============================================================================
-- The tenant boundary, from the capture surface
-- =============================================================================
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
begin
  begin
    perform public.capture_reception('aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', now(), 'INTRUDER', 100, 'kg');
    insert into t.results (name, want, got) values ('boundary · capturing into a winery you are not in', 'refused', 'ACCEPTED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('boundary · capturing into a winery you are not in', 'refused', 'refused');
  end;

  begin
    perform public.capture_stage('aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', now(), 'MST-26-H', 'tampered');
    insert into t.results (name, want, got) values ('boundary · changing a stage in a winery you are not in', 'refused', 'ACCEPTED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('boundary · changing a stage in a winery you are not in', 'refused', 'refused');
  end;
end $$;

insert into t.results (name, want, got)
select 'boundary · an outsider''s refusal created no vessel', '0', count(*)::text
from public.lots where code = 'INTRUDER';

insert into t.results (name, want, got)
select 'boundary · the overview shows an outsider nothing', '0', count(*)::text
from public.lot_overview where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe';


-- =============================================================================
-- Structural
-- =============================================================================
reset role;
reset request.jwt.claims;

insert into t.results (name, want, got)
select 'structural · anon cannot call any capture operation', '0', count(*)::text
from information_schema.role_routine_grants
where grantee = 'anon' and routine_schema = 'public' and routine_name like 'capture_%';

insert into t.results (name, want, got)
select 'structural · all six operations are callable by a session', '6', count(*)::text
from information_schema.role_routine_grants
where grantee = 'authenticated' and routine_schema = 'public'
  and routine_name like 'capture_%' and privilege_type = 'EXECUTE';

-- The capture surface speaks operational language. If a parameter name ever
-- leaks a storage concept, this fails and someone has to justify it.
insert into t.results (name, want, got)
select 'structural · no capture parameter names a database concept', '0', count(*)::text
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral unnest(coalesce(p.proargnames, array[]::text[])) as arg
where n.nspname = 'public' and p.proname like 'capture_%'
  and arg ~ '(ledger|event_line|delta|projection|rls|derived_state|row_level)';
