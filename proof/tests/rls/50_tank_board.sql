-- =============================================================================
-- PROOF · Cycle 1 · Step 6 — The tank board
--
-- "What is in my tanks, and how much room have I actually got?"
--
-- The board is a projection like the timeline, so these assertions prove it is
-- computed rather than stored, that it refuses to invent capacity it was never
-- told, and that it never adds a kilogram to a litre.
-- =============================================================================

set role service_role;
set request.jwt.claims = '{"role":"service_role"}';

-- The harvest-pilot winery from Step 3 was onboarded entirely through capture,
-- so every vessel in it was created by somebody typing a name. That is the real
-- starting state, and the board has to cope with it.
insert into t.results (name, want, got)
select 'board · a winery onboarded by capture alone knows no sizes', '4', count(*)::text
from public.vessel_board
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe' and status = 'unknown_size';

insert into t.results (name, want, got)
select 'board · and therefore reports no room, rather than zero room', '0', count(*)::text
from public.vessel_board
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe' and available is not null;

-- Now somebody answers the question the board asked.
select public.set_vessel_size('aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', 'TK-B', 2000, 'L');
select public.set_vessel_size('aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', 'TK-C', 1500, 'L');
select public.set_vessel_size('aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', 'BIN-A', 3000, 'kg');

insert into t.results (name, want, got)
select 'board · a tank holding wine says what is in it', 'CS-26-H1',
       contents -> 0 ->> 'lot_code'
from public.vessel_board where code = 'TK-B';

insert into t.results (name, want, got)
select 'board · and how much, and how sure', '985.000000|estimated',
       (contents -> 0 ->> 'quantity') || '|' || (contents -> 0 ->> 'confidence')
from public.vessel_board where code = 'TK-B';

insert into t.results (name, want, got)
select 'board · free space is capacity less what is in it', '1015.000000', available::text
from public.vessel_board where code = 'TK-B';

insert into t.results (name, want, got)
select 'board · a tank in use says so', 'in_use', status
from public.vessel_board where code = 'TK-B';

insert into t.results (name, want, got)
select 'board · an emptied tank is ready again, at full size', 'empty|3000.000000',
       status || '|' || available::text
from public.vessel_board where code = 'BIN-A';

-- -----------------------------------------------------------------------------
-- The board must agree with the lot
-- -----------------------------------------------------------------------------
insert into t.results (name, want, got)
select 'board · what the tank holds is what the lot says it holds', '0', count(*)::text
from public.vessel_board b
cross join lateral jsonb_array_elements(b.contents) as item
join public.lot_card c on c.code = item ->> 'lot_code'
where b.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe'
  and round((item ->> 'quantity')::numeric, 6) is distinct from round(c.quantity, 6);

-- -----------------------------------------------------------------------------
-- A kilogram is not a litre
-- -----------------------------------------------------------------------------
insert into t.results (name, want, got)
select 'board · the bin is measured in kilograms, not litres', 'kg', unit
from public.vessel_board where code = 'BIN-A';

insert into t.results (name, want, got)
select 'board · litres and kilograms are reported apart', '2', count(distinct unit)::text
from public.vessel_board
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe' and unit is not null;

-- -----------------------------------------------------------------------------
-- Over-full is its own state, not a negative number
--
-- Real captured data cannot easily produce this, but it is exactly the case
-- worth catching: either the volume is wrong or the tank is smaller than
-- somebody thought, and both deserve attention.
-- -----------------------------------------------------------------------------
select public.set_vessel_size('aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', 'TK-B', 500, 'L');

insert into t.results (name, want, got)
select 'board · more wine than the tank holds is flagged, not hidden', 'over', status
from public.vessel_board where code = 'TK-B';

insert into t.results (name, want, got)
select 'board · and the overflow is quantified', '-485.000000', available::text
from public.vessel_board where code = 'TK-B';

select public.set_vessel_size('aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', 'TK-B', 2000, 'L');

-- -----------------------------------------------------------------------------
-- Refusals
-- -----------------------------------------------------------------------------
do $$
declare v_org uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe';
begin
  begin
    perform public.set_vessel_size(v_org, 'TK-B', 0, 'L');
    insert into t.results (name, want, got) values ('board · a vessel of no size', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('board · a vessel of no size', 'refused', 'refused');
  end;

  begin
    perform public.set_vessel_size(v_org, 'TK-B', 100, 'barrels');
    insert into t.results (name, want, got) values ('board · a size in a unit PROOF does not know', 'refused', 'ACCEPTED');
  exception when check_violation then
    insert into t.results (name, want, got) values ('board · a size in a unit PROOF does not know', 'refused', 'refused');
  end;

  begin
    perform public.set_vessel_size(v_org, 'NOPE', 100, 'L');
    insert into t.results (name, want, got) values ('board · sizing a vessel that does not exist', 'refused', 'ACCEPTED');
  exception when no_data_found then
    insert into t.results (name, want, got) values ('board · sizing a vessel that does not exist', 'refused', 'refused');
  end;
end $$;

-- -----------------------------------------------------------------------------
-- The boundary
-- -----------------------------------------------------------------------------
reset role;
set role authenticated;
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

insert into t.results (name, want, got)
select 'board · an outsider sees none of another winery''s tanks', '0', count(*)::text
from public.vessel_board where organization_id <> 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

do $$
begin
  begin
    perform public.set_vessel_size('aaaaaaaa-aaaa-aaaa-aaaa-00000000cafe', 'TK-B', 9999, 'L');
    insert into t.results (name, want, got) values ('board · nor resizes them', 'refused', 'ACCEPTED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('board · nor resizes them', 'refused', 'refused');
  end;
end $$;

-- -----------------------------------------------------------------------------
-- Still a projection
-- -----------------------------------------------------------------------------
reset role;
reset request.jwt.claims;

insert into t.results (name, want, got)
select 'board · the tank board is a view, never a table', '0', count(*)::text
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relname = 'vessel_board';

insert into t.results (name, want, got)
select 'board · no vessel caches what is inside it', '0', count(*)::text
from information_schema.columns
where table_schema = 'public' and table_name = 'vessels'
  and column_name in ('current_lot_id', 'occupied', 'contents', 'current_volume', 'available');
