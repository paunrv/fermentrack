-- =============================================================================
-- PROOF · Cycle 1 · Step 2 — Ledger scenarios
--
-- One wine lot is followed from fruit arriving to cases leaving, through every
-- transformation the brief names. Then the invariants are attacked: each
-- negative test tries to make the ledger lie, and must be refused.
--
-- Reuses the organizations created by 10_two_organizations.sql.
--   Viñas del Tigre  aaaaaaaa-…   Aldo owner, María operator
--   Other Winery     bbbbbbbb-…   Carlos owner
-- =============================================================================

set role service_role;
set request.jwt.claims = '{"role":"service_role"}';

-- -----------------------------------------------------------------------------
-- Resources
-- -----------------------------------------------------------------------------
insert into public.vessels (id, organization_id, code, name, vessel_type, capacity, capacity_unit) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BIN-01', 'Reception bin', 'bin',   10000, 'kg'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TK-01',  'Tank 1',        'tank',  10000, 'L'),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TK-02',  'Tank 2',        'tank',  10000, 'L'),
  ('11111111-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TK-03',  'Tank 3',        'tank',   5000, 'L');

insert into public.materials (id, organization_id, key, name, category, default_unit) values
  ('22222222-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pomace',     'Pomace',       'byproduct', 'kg'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bottle-750', 'Bottle 750ml', 'packaging', 'ea'),
  ('22222222-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cork',       'Cork',         'packaging', 'ea'),
  ('22222222-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'label',      'Front label',  'packaging', 'ea');

insert into public.lots (id, organization_id, code, name, data_origin) values
  ('33333333-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GRP-26-01', 'Cabernet fruit, La Cañada', 'synthetic'),
  ('33333333-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MST-26-01', 'Cabernet must',             'synthetic'),
  ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CS-26-A',   'Cabernet, portion A',       'synthetic'),
  ('33333333-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CS-26-B',   'Cabernet, portion B',       'synthetic'),
  ('33333333-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BL-26-01',  'Tigre Tinto blend',         'synthetic'),
  ('33333333-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FG-26-01',  'Tigre Tinto 2026, bottled', 'synthetic');

-- A lot belonging to the other winery, used later to prove that a ledger line
-- cannot reach across the tenant boundary.
insert into public.lots (id, organization_id, code, name, data_origin) values
  ('33333333-0000-0000-0000-0000000000ff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'OW-26-01', 'Other winery lot', 'synthetic');


-- =============================================================================
-- SCENARIO A — Harvest. Fruit arrives, and it arrives as an estimate.
-- =============================================================================
select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'receipt', '2026-08-11 09:00+00',
  jsonb_build_array(jsonb_build_object(
    'lot_id',   '33333333-0000-0000-0000-000000000001',
    'vessel_id','11111111-0000-0000-0000-000000000001',
    'quantity', 8500, 'unit', 'kg', 'basis', 'estimated', 'reason', 'receipt'
  )),
  'recepcion_uva', 'About 8.5 tonnes, weighed on the trailer scale'
) as scenario_a;

insert into t.results (name, want, got)
select 'A · fruit lot holds 8500 kg', '8500.000000', quantity::text
from public.lot_balances
where lot_id = '33333333-0000-0000-0000-000000000001' and unit = 'kg';

insert into t.results (name, want, got)
select 'A · the quantity is marked as an estimate, not a fact', 'estimated', basis::text
from public.ledger_lines where lot_id = '33333333-0000-0000-0000-000000000001';


-- =============================================================================
-- SCENARIO B — Processing. Kilograms become litres; the unit changes and no
-- conservation is possible. 2,300 kg of pomace is a byproduct, not a loss.
-- =============================================================================
select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'transform', '2026-08-11 14:00+00',
  jsonb_build_array(
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000001','vessel_id','11111111-0000-0000-0000-000000000001',
                       'quantity',-8500,'unit','kg','basis','estimated','reason','transformation'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000002','vessel_id','11111111-0000-0000-0000-000000000002',
                       'quantity',6200,'unit','L','basis','estimated','reason','transformation'),
    jsonb_build_object('material_id','22222222-0000-0000-0000-000000000001',
                       'quantity',2300,'unit','kg','basis','estimated','reason','transformation')
  ),
  'despalillado_prensado', 'Destemmed and pressed the same day',
  '{}'::jsonb, null, null,
  jsonb_build_array(jsonb_build_object(
    'parent_lot_id','33333333-0000-0000-0000-000000000001',
    'child_lot_id','33333333-0000-0000-0000-000000000002','quantity',6200,'unit','L'))
) as scenario_b;

insert into t.results (name, want, got)
select 'B · the fruit lot is fully consumed', '0.000000', coalesce(max(quantity)::text, '0.000000')
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000001' and unit = 'kg';

insert into t.results (name, want, got)
select 'B · the must lot holds 6200 L', '6200.000000', quantity::text
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000002' and unit = 'L';

insert into t.results (name, want, got)
select 'B · yield is derived, not stored', '0.729412', round(output_per_input, 6)::text
from public.conversion_yields
where input_unit = 'kg' and output_unit = 'L'
  and event_id in (select id from public.events where type_key = 'despalillado_prensado');


-- =============================================================================
-- SCENARIO C — Fermentation. The lot changes form but keeps its identity, and
-- its stage is derived from events rather than stored on the row.
-- =============================================================================
select app.record_event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'stage', '2026-08-12 08:00+00',
  '[]'::jsonb, 'inicio_fermentacion', null, '{}'::jsonb,
  '33333333-0000-0000-0000-000000000002');

select app.record_event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'observation', '2026-08-14 08:00+00',
  '[]'::jsonb, 'analisis', 'Brix 12.4, temp 26C',
  jsonb_build_object('brix', 12.4, 'temp_c', 26),
  '33333333-0000-0000-0000-000000000002');

select app.record_event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'stage', '2026-08-19 08:00+00',
  '[]'::jsonb, 'fin_fermentacion', null, '{}'::jsonb,
  '33333333-0000-0000-0000-000000000002');

insert into t.results (name, want, got)
select 'C · current stage is derived from the latest stage event', 'fin_fermentacion', stage
from public.lot_current_stage where lot_id = '33333333-0000-0000-0000-000000000002';

insert into t.results (name, want, got)
select 'C · fermentation changed no quantity', '6200.000000', quantity::text
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000002' and unit = 'L';

insert into t.results (name, want, got)
-- Four so far: the pressing that created it, and the three events recorded
-- against it during fermentation. Events that move quantity and events that
-- move nothing land on the same timeline.
select 'C · the lot timeline carries every event about it', '4', count(*)::text
from public.lot_timeline where lot_id = '33333333-0000-0000-0000-000000000002';


-- =============================================================================
-- SCENARIO D — Transfer with loss. The movement legs cancel; the 50 L of lees
-- is a separate line with its own reason. Modelling it as −6200/+6150 would
-- have made the loss invisible and untyped.
-- =============================================================================
select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'transfer', '2026-08-20 10:00+00',
  jsonb_build_array(
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000002','vessel_id','11111111-0000-0000-0000-000000000002',
                       'quantity',-6150,'unit','L','basis','measured','reason','movement'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000002','vessel_id','11111111-0000-0000-0000-000000000003',
                       'quantity',6150,'unit','L','basis','measured','reason','movement'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000002','vessel_id','11111111-0000-0000-0000-000000000002',
                       'quantity',-50,'unit','L','basis','estimated','reason','expected_loss')
  ),
  'trasiego', 'Racked off the lees into Tank 2'
) as scenario_d;

insert into t.results (name, want, got)
select 'D · the source tank is empty', '0.000000', coalesce(max(quantity)::text,'0.000000')
from public.lot_vessel_positions
where vessel_id = '11111111-0000-0000-0000-000000000002' and unit = 'L';

insert into t.results (name, want, got)
select 'D · the destination tank holds 6150 L', '6150.000000', quantity::text
from public.lot_vessel_positions
where vessel_id = '11111111-0000-0000-0000-000000000003' and unit = 'L';

insert into t.results (name, want, got)
select 'D · the lot lost exactly the declared 50 L', '6150.000000', quantity::text
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000002' and unit = 'L';

insert into t.results (name, want, got)
select 'D · the loss is typed, not inferred from a difference', 'expected_loss', reason::text
from public.ledger_lines
where event_id in (select id from public.events where type_key = 'trasiego')
  and reason <> 'movement';


-- =============================================================================
-- SCENARIO E — Split. One lot becomes two, with lineage.
-- =============================================================================
select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'split', '2026-08-25 09:00+00',
  jsonb_build_array(
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000002','vessel_id','11111111-0000-0000-0000-000000000003',
                       'quantity',-6150,'unit','L','basis','measured','reason','movement'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000003','vessel_id','11111111-0000-0000-0000-000000000003',
                       'quantity',4000,'unit','L','basis','measured','reason','movement'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000004','vessel_id','11111111-0000-0000-0000-000000000004',
                       'quantity',2150,'unit','L','basis','measured','reason','movement')
  ),
  'division', 'Split for separate ageing',
  '{}'::jsonb, null, null,
  jsonb_build_array(
    jsonb_build_object('parent_lot_id','33333333-0000-0000-0000-000000000002','child_lot_id','33333333-0000-0000-0000-000000000003','quantity',4000,'unit','L'),
    jsonb_build_object('parent_lot_id','33333333-0000-0000-0000-000000000002','child_lot_id','33333333-0000-0000-0000-000000000004','quantity',2150,'unit','L')
  )
) as scenario_e;

insert into t.results (name, want, got)
select 'E · a split conserves total volume', '6150.000000',
       (coalesce((select quantity from public.lot_balances where lot_id='33333333-0000-0000-0000-000000000003' and unit='L'),0)
      + coalesce((select quantity from public.lot_balances where lot_id='33333333-0000-0000-0000-000000000004' and unit='L'),0))::text;

insert into t.results (name, want, got)
select 'E · the parent lot is emptied', '0.000000', coalesce(max(quantity)::text,'0.000000')
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000002' and unit = 'L';

insert into t.results (name, want, got)
select 'E · both children record their parent', '2', count(*)::text
from public.lot_lineage where parent_lot_id = '33333333-0000-0000-0000-000000000002';


-- =============================================================================
-- SCENARIO F — Blend. Two lots become one, and lineage now runs two deep.
-- =============================================================================
select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'blend', '2026-11-02 11:00+00',
  jsonb_build_array(
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000003','vessel_id','11111111-0000-0000-0000-000000000003',
                       'quantity',-4000,'unit','L','basis','measured','reason','movement'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000004','vessel_id','11111111-0000-0000-0000-000000000004',
                       'quantity',-2150,'unit','L','basis','measured','reason','movement'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000005','vessel_id','11111111-0000-0000-0000-000000000003',
                       'quantity',6150,'unit','L','basis','measured','reason','movement'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000005','vessel_id','11111111-0000-0000-0000-000000000003',
                       'quantity',-50,'unit','L','basis','estimated','reason','expected_loss')
  ),
  'mezcla', 'Blended for bottling',
  '{}'::jsonb, null, null,
  jsonb_build_array(
    jsonb_build_object('parent_lot_id','33333333-0000-0000-0000-000000000003','child_lot_id','33333333-0000-0000-0000-000000000005','quantity',4000,'unit','L'),
    jsonb_build_object('parent_lot_id','33333333-0000-0000-0000-000000000004','child_lot_id','33333333-0000-0000-0000-000000000005','quantity',2150,'unit','L')
  )
) as scenario_f;

insert into t.results (name, want, got)
select 'F · the blend holds 6100 L after its declared loss', '6100.000000', quantity::text
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000005' and unit = 'L';

insert into t.results (name, want, got)
select 'F · both components are emptied', '0.000000',
       (coalesce((select quantity from public.lot_balances where lot_id='33333333-0000-0000-0000-000000000003' and unit='L'),0)
      + coalesce((select quantity from public.lot_balances where lot_id='33333333-0000-0000-0000-000000000004' and unit='L'),0))::text;

insert into t.results (name, want, got)
select 'F · the tank board shows the blend and its free space', '3900.000000', available_base::text
from public.vessel_occupancy where code = 'TK-02';

insert into t.results (name, want, got)
select 'F · the tank board counts one lot in that vessel', '1', lot_count::text
from public.vessel_occupancy where code = 'TK-02';

insert into t.results (name, want, got)
select 'F · the blend traces back through its parents to the fruit', 'true',
       (count(*) filter (where ancestor_lot_id = '33333333-0000-0000-0000-000000000002' and depth = 2) > 0)::text
from public.lot_ancestry where lot_id = '33333333-0000-0000-0000-000000000005';


-- =============================================================================
-- SCENARIO G — Bottling. Bulk becomes discrete units and packaging is consumed
-- in the same event, which is what joins production to inventory.
-- =============================================================================
select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'receipt', '2026-11-05 09:00+00',
  jsonb_build_array(
    jsonb_build_object('material_id','22222222-0000-0000-0000-000000000002','quantity',10000,'unit','ea','basis','measured','reason','receipt','unit_cost',6.20,'cost_amount',62000,'currency','MXN'),
    jsonb_build_object('material_id','22222222-0000-0000-0000-000000000003','quantity',10000,'unit','ea','basis','measured','reason','receipt'),
    jsonb_build_object('material_id','22222222-0000-0000-0000-000000000004','quantity',10000,'unit','ea','basis','measured','reason','receipt')
  ),
  'compra_insumos', 'Dry goods delivery'
);

select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'package', '2026-11-20 08:00+00',
  jsonb_build_array(
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000005','vessel_id','11111111-0000-0000-0000-000000000003',
                       'quantity',-6075,'unit','L','basis','measured','reason','transformation'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000005','vessel_id','11111111-0000-0000-0000-000000000003',
                       'quantity',-25,'unit','L','basis','estimated','reason','expected_loss'),
    jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',8100,'unit','btl','basis','measured','reason','transformation'),
    jsonb_build_object('material_id','22222222-0000-0000-0000-000000000002','quantity',-8130,'unit','ea','basis','measured','reason','consumption'),
    jsonb_build_object('material_id','22222222-0000-0000-0000-000000000003','quantity',-8110,'unit','ea','basis','measured','reason','consumption'),
    jsonb_build_object('material_id','22222222-0000-0000-0000-000000000004','quantity',-8105,'unit','ea','basis','measured','reason','consumption')
  ),
  'embotellado', 'Mobile bottling line',
  '{}'::jsonb, null, null,
  jsonb_build_array(jsonb_build_object(
    'parent_lot_id','33333333-0000-0000-0000-000000000005',
    'child_lot_id','33333333-0000-0000-0000-000000000006','quantity',8100,'unit','btl'))
) as scenario_g;

insert into t.results (name, want, got)
select 'G · the bulk lot is emptied by bottling', '0.000000', coalesce(max(quantity)::text,'0.000000')
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000005' and unit = 'L';

insert into t.results (name, want, got)
select 'G · 8100 bottles now exist', '8100.000000', quantity::text
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000006' and unit = 'btl';

insert into t.results (name, want, got)
select 'G · packaging stock fell by what was consumed', '1870.000000', quantity::text
from public.material_stock where material_id = '22222222-0000-0000-0000-000000000002';

insert into t.results (name, want, got)
select 'G · bottles trace back to the original fruit lot', 'true',
       (count(*) filter (where ancestor_lot_id = '33333333-0000-0000-0000-000000000001') > 0)::text
from public.lot_ancestry where lot_id = '33333333-0000-0000-0000-000000000006';

insert into t.results (name, want, got)
select 'G · bottles and litres are never added together', '2', count(distinct unit)::text
from public.lot_balances where lot_id in (
  '33333333-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000006');


-- =============================================================================
-- SCENARIO H — Loss. A case is dropped.
-- =============================================================================
select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'loss', '2026-11-25 15:00+00',
  jsonb_build_array(jsonb_build_object(
    'lot_id','33333333-0000-0000-0000-000000000006','quantity',-24,'unit','btl',
    'basis','measured','reason','incident_loss','note','Pallet corner dropped')),
  'rotura', 'Two cases broken while stacking'
) as scenario_h;

insert into t.results (name, want, got)
select 'H · breakage reduces stock and says why', '8076.000000', quantity::text
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000006' and unit = 'btl';


-- =============================================================================
-- SCENARIO I — Physical count. Expected and counted disagree; the gap becomes
-- an auditable record rather than a silently rewritten number.
-- =============================================================================
select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'count', '2026-12-01 09:00+00',
  jsonb_build_array(jsonb_build_object(
    'lot_id','33333333-0000-0000-0000-000000000006','quantity',-6,'unit','btl',
    'basis','measured','reason','count_variance')),
  'conteo_fisico', 'Counted 8070 against an expected 8076; six unaccounted for',
  jsonb_build_object('expected', 8076, 'counted', 8070)
) as scenario_i;

insert into t.results (name, want, got)
select 'I · the count reconciles the ledger to reality', '8070.000000', quantity::text
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000006' and unit = 'btl';

insert into t.results (name, want, got)
select 'I · the variance survives as a record, with its note', 'true',
       (note is not null and note <> '')::text
from public.events where type_key = 'conteo_fisico';


-- =============================================================================
-- DERIVED STATE
-- =============================================================================
insert into t.results (name, want, got)
select 'derived · every lot balance equals the sum of its own lines', '0', count(*)::text
from (
  select b.lot_id, b.unit, b.quantity,
         (select sum(l.quantity * u.to_base)
          from public.ledger_lines l join public.units u on u.code = l.unit_code
          where l.lot_id = b.lot_id and l.material_id is null and u.base_code = b.unit) as recomputed
  from public.lot_balances b
) x where quantity is distinct from recomputed;

insert into t.results (name, want, got)
select 'derived · available capacity is capacity minus what is in the vessel', 'true',
       bool_and(available_base = capacity_base - occupied_base)::text
from public.vessel_occupancy where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- After bottling the tank is empty again, and the board says so without anyone
-- having edited an occupancy field.
insert into t.results (name, want, got)
select 'derived · bottling frees the tank on the board', '10000.000000', available_base::text
from public.vessel_occupancy where code = 'TK-02';

-- The global form of the invariant: across the entire history, every movement
-- leg has a matching counter-leg. Quantity only enters or leaves through a
-- reason that names itself.
insert into t.results (name, want, got)
select 'derived · movement nets to zero across all history', '0', count(*)::text
from (
  select u.base_code, sum(l.quantity * u.to_base) as net
  from public.ledger_lines l join public.units u on u.code = l.unit_code
  where l.reason = 'movement'
  group by u.base_code having sum(l.quantity * u.to_base) <> 0
) s;


-- =============================================================================
-- INVARIANTS UNDER ATTACK
--
-- Each block tries to record something the ledger must refuse. Validation is
-- deferred to commit, so the checks are forced immediate inside a subtransaction.
-- =============================================================================
do $$
declare v_org uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  -- Quantity conjured from nowhere: 100 L leaves, 90 L arrives, nobody says
  -- where the other 10 went.
  begin
    perform app.record_event(v_org, 'transfer', now(),
      jsonb_build_array(
        jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',-100,'unit','btl','basis','measured','reason','movement'),
        jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',90,'unit','btl','basis','measured','reason','movement')));
    set constraints all immediate;
    insert into t.results (name, want, got) values ('attack · unexplained shortfall in a transfer', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('attack · unexplained shortfall in a transfer', 'refused', 'refused');
  end;
  set constraints all deferred;

  -- A transfer with no destination.
  begin
    perform app.record_event(v_org, 'transfer', now(),
      jsonb_build_array(jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',-10,'unit','btl','basis','measured','reason','movement')));
    set constraints all immediate;
    insert into t.results (name, want, got) values ('attack · a transfer going nowhere', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('attack · a transfer going nowhere', 'refused', 'refused');
  end;
  set constraints all deferred;

  -- A receipt that removes quantity.
  begin
    perform app.record_event(v_org, 'receipt', now(),
      jsonb_build_array(jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',-5,'unit','btl','basis','measured','reason','receipt')));
    set constraints all immediate;
    insert into t.results (name, want, got) values ('attack · a receipt that subtracts', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('attack · a receipt that subtracts', 'refused', 'refused');
  end;
  set constraints all deferred;

  -- Consumption that adds.
  begin
    perform app.record_event(v_org, 'consume', now(),
      jsonb_build_array(jsonb_build_object('material_id','22222222-0000-0000-0000-000000000003','quantity',50,'unit','ea','basis','measured','reason','consumption')));
    set constraints all immediate;
    insert into t.results (name, want, got) values ('attack · consumption that creates stock', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('attack · consumption that creates stock', 'refused', 'refused');
  end;
  set constraints all deferred;

  -- An observation that quietly moves stock.
  begin
    perform app.record_event(v_org, 'observation', now(),
      jsonb_build_array(jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',-1,'unit','btl','basis','measured','reason','incident_loss')));
    set constraints all immediate;
    insert into t.results (name, want, got) values ('attack · an observation that changes quantity', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('attack · an observation that changes quantity', 'refused', 'refused');
  end;
  set constraints all deferred;

  -- A split that forgets where the wine came from.
  begin
    perform app.record_event(v_org, 'split', now(),
      jsonb_build_array(
        jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',-10,'unit','btl','basis','measured','reason','movement'),
        jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',10,'unit','btl','basis','measured','reason','movement')));
    set constraints all immediate;
    insert into t.results (name, want, got) values ('attack · a split without lineage', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('attack · a split without lineage', 'refused', 'refused');
  end;
  set constraints all deferred;

  -- A correction with no explanation.
  begin
    perform app.record_event(v_org, 'adjustment', now(),
      jsonb_build_array(jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',500,'unit','btl','basis','stated','reason','adjustment')));
    set constraints all immediate;
    insert into t.results (name, want, got) values ('attack · an unexplained adjustment', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('attack · an unexplained adjustment', 'refused', 'refused');
  end;
  set constraints all deferred;

  -- A transformation with inputs but no outputs.
  begin
    perform app.record_event(v_org, 'transform', now(),
      jsonb_build_array(jsonb_build_object('lot_id','33333333-0000-0000-0000-000000000006','quantity',-10,'unit','btl','basis','measured','reason','transformation')));
    set constraints all immediate;
    insert into t.results (name, want, got) values ('attack · a transformation producing nothing', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('attack · a transformation producing nothing', 'refused', 'refused');
  end;
  set constraints all deferred;
end $$;

-- A well-formed adjustment, by contrast, is accepted — corrections are the
-- supported way to fix a mistake.
select app.record_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adjustment', '2026-12-02 09:00+00',
  jsonb_build_array(jsonb_build_object(
    'lot_id','33333333-0000-0000-0000-000000000006','quantity',6,'unit','btl',
    'basis','measured','reason','resolution')),
  'correccion', 'The six were found in the office sample rack; the count was right, the search was not'
);

insert into t.results (name, want, got)
select 'attack · an explained correction is accepted', '8076.000000', quantity::text
from public.lot_balances where lot_id = '33333333-0000-0000-0000-000000000006' and unit = 'btl';


-- -----------------------------------------------------------------------------
-- Immutability and tenancy
-- -----------------------------------------------------------------------------
do $$
begin
  begin
    update public.events set note = 'rewritten' where type_key = 'trasiego';
    insert into t.results (name, want, got) values ('attack · rewriting a recorded event', 'refused', 'ACCEPTED');
  exception when restrict_violation or insufficient_privilege then
    insert into t.results (name, want, got) values ('attack · rewriting a recorded event', 'refused', 'refused');
  end;

  begin
    delete from public.ledger_lines where reason = 'expected_loss';
    insert into t.results (name, want, got) values ('attack · deleting a ledger line', 'refused', 'ACCEPTED');
  exception when restrict_violation or insufficient_privilege then
    insert into t.results (name, want, got) values ('attack · deleting a ledger line', 'refused', 'refused');
  end;

  -- The tenant boundary, attacked from inside a legitimate event: a line in
  -- Viñas del Tigre's event that points at the other winery's lot. The
  -- composite foreign key makes this structurally impossible.
  begin
    perform app.record_event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'receipt', now(),
      jsonb_build_array(jsonb_build_object('lot_id','33333333-0000-0000-0000-0000000000ff','quantity',10,'unit','btl','basis','stated','reason','receipt')));
    set constraints all immediate;
    insert into t.results (name, want, got) values ('attack · a ledger line reaching into another tenant', 'refused', 'ACCEPTED');
  exception when foreign_key_violation or check_violation then
    insert into t.results (name, want, got) values ('attack · a ledger line reaching into another tenant', 'refused', 'refused');
  end;
  set constraints all deferred;
end $$;

-- Carlos is a real member of a real organization — just not this one.
reset role;
set role authenticated;
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
begin
  begin
    perform app.record_event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'observation', now(), '[]'::jsonb, 'probe');
    insert into t.results (name, want, got) values ('attack · recording into an organization you are not in', 'refused', 'ACCEPTED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('attack · recording into an organization you are not in', 'refused', 'refused');
  end;
end $$;

-- Derived state must respect the boundary too. A view without security_invoker
-- runs as its owner and quietly bypasses every policy beneath it.
insert into t.results (name, want, got)
select 'attack · lot balances leak through a view', '0', count(*)::text from public.lot_balances;

insert into t.results (name, want, got)
select 'attack · vessel occupancy leaks through a view', '0', count(*)::text from public.vessel_occupancy;

insert into t.results (name, want, got)
select 'attack · the lot timeline leaks through a view', '0', count(*)::text from public.lot_timeline;

insert into t.results (name, want, got)
select 'attack · lineage leaks through a view', '0', count(*)::text from public.lot_ancestry;

-- Aldo, by contrast, sees his own winery.
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into t.results (name, want, got)
select 'a member reads his own ledger', 'true', (count(*) > 0)::text from public.lot_balances;

insert into t.results (name, want, got)
select 'a member cannot write the ledger directly', '0', count(*)::text
from information_schema.role_table_grants
where grantee = 'authenticated' and table_schema = 'public'
  and table_name in ('events', 'ledger_lines', 'lot_lineage')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE');


-- -----------------------------------------------------------------------------
-- Protocol: the plan is never rewritten to match the outcome
-- -----------------------------------------------------------------------------
reset role;
set role service_role;
set request.jwt.claims = '{"role":"service_role"}';

insert into public.protocols (id, organization_id, key, name, version)
values ('44444444-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tinto-reserva', 'Tinto Reserva', 1);

insert into public.protocol_steps (id, protocol_id, seq, key, name, expected_kind, planned)
values ('44444444-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 1, 'maceracion', 'Maceration', 'stage',
        jsonb_build_object('days', 21, 'temp_c', 26));

insert into public.protocol_runs (id, organization_id, protocol_id, lot_id)
values ('44444444-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002');

insert into public.protocol_run_steps (id, organization_id, run_id, step_id, planned, actual_started_at, actual_completed_at)
values ('44444444-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '44444444-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000002',
        jsonb_build_object('days', 21, 'temp_c', 26), '2026-08-12', '2026-09-04');

insert into t.results (name, want, got)
select 'protocol · the plan said 21 days', '21', (planned ->> 'days')
from public.protocol_run_steps where id = '44444444-0000-0000-0000-000000000004';

insert into t.results (name, want, got)
select 'protocol · reality took 23, and both survive', '23',
       (extract(day from (actual_completed_at - actual_started_at)))::integer::text
from public.protocol_run_steps where id = '44444444-0000-0000-0000-000000000004';

do $$
begin
  begin
    update public.protocol_steps set planned = jsonb_build_object('days', 23)
    where id = '44444444-0000-0000-0000-000000000002';
    insert into t.results (name, want, got) values ('protocol · rewriting a plan a run already followed', 'refused', 'ACCEPTED');
  exception when restrict_violation or insufficient_privilege then
    insert into t.results (name, want, got) values ('protocol · rewriting a plan a run already followed', 'refused', 'refused');
  end;
end $$;


-- -----------------------------------------------------------------------------
-- Structural
-- -----------------------------------------------------------------------------
reset role;
reset request.jwt.claims;

insert into t.results (name, want, got)
select 'structural · every view runs as the caller, not its owner', '0', count(*)::text
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
  and not coalesce((
    select option_value::boolean
    from pg_options_to_table(c.reloptions)
    where option_name = 'security_invoker'
  ), false);

insert into t.results (name, want, got)
select 'structural · no lot stores a volume, location or stage column', '0', count(*)::text
from information_schema.columns
where table_schema = 'public' and table_name = 'lots'
  and column_name in ('volume', 'current_volume', 'quantity', 'vessel_id', 'stage', 'current_stage');

insert into t.results (name, want, got)
select 'structural · history tables refuse update and delete', '3', count(distinct c.relname)::text
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = tg.tgfoid
where n.nspname = 'public' and p.proname = 'forbid_mutation'
  and c.relname in ('events', 'ledger_lines', 'lot_lineage');
