-- =============================================================================
-- PROOF · Cycle 1 · Step 4 — The lot story
--
-- The timeline is a projection. These assertions prove it is computed from the
-- ledger rather than stored beside it, that it speaks in words rather than
-- identifiers, and that it respects the same boundary everything else does.
-- =============================================================================

set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- -----------------------------------------------------------------------------
-- The story follows the wine, not the row
-- -----------------------------------------------------------------------------
insert into t.results (name, want, got)
select 'story · a lot born in the press still shows the fruit arriving', 'Received', s.headline
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.seq = 1;

insert into t.results (name, want, got)
select 'story · and marks it as belonging to the fruit, not this wine', 'CS-26-H|true',
       s.source_lot_code || '|' || s.is_inherited::text
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.seq = 1;

insert into t.results (name, want, got)
select 'story · a grandchild reaches all the way back to the fruit', 'Received', s.headline
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'CS-26-H1' and s.seq = 1;

-- -----------------------------------------------------------------------------
-- Human language, not database language
-- -----------------------------------------------------------------------------
insert into t.results (name, want, got)
select 'story · a stage keeps the winemaker''s own words', 'inicio de fermentación', s.headline
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.kind = 'stage'
order by s.seq limit 1;

insert into t.results (name, want, got)
select 'story · a racking is called Moved, not transfer_completed', 'Moved', s.headline
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.kind = 'transfer';

insert into t.results (name, want, got)
select 'story · a loss reads as a loss, in words', 'expected loss',
       s.changes -> 0 ->> 'label'
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.kind = 'transfer';

insert into t.results (name, want, got)
select 'story · the reason the wine went missing is carried with it', 'Lees',
       s.changes -> 0 ->> 'note'
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.kind = 'transfer';

-- -----------------------------------------------------------------------------
-- The numbers a screen shows are the ledger's numbers
-- -----------------------------------------------------------------------------
insert into t.results (name, want, got)
select 'story · what moved is 1700, not the 30 that went missing', '1700.000000|1700.000000',
       s.moved_out::text || '|' || s.moved_in::text
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.kind = 'transfer';

insert into t.results (name, want, got)
select 'story · the running balance is carried through events that moved nothing',
       '1730.000000', s.balance_after::text
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.kind = 'observation';

insert into t.results (name, want, got)
select 'story · the last balance equals what the lot actually holds', 'true',
       (max(s.balance_after) filter (where s.seq = (select max(seq) from public.lot_story s2 where s2.subject_lot_id = s.subject_lot_id))
        = max(c.quantity))::text
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
join public.lot_card c on c.lot_id = s.subject_lot_id
where l.code = 'MST-26-H';

insert into t.results (name, want, got)
select 'story · a pressing says the source quantity was a guess', 'estimated',
       s.event_confidence::text
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.kind = 'transform';

insert into t.results (name, want, got)
select 'story · pomace appears once, as a material', '1', jsonb_array_length(s.materials)::text
from public.lot_story s
join public.lots l on l.id = s.subject_lot_id
where l.code = 'MST-26-H' and s.kind = 'transform' and not s.is_inherited;

-- -----------------------------------------------------------------------------
-- The header answers the five questions
-- -----------------------------------------------------------------------------
insert into t.results (name, want, got)
select 'card · what it is, where it came from', 'Cabernet Sauvignon|La Cañada',
       variety || '|' || source
from public.lot_card where code = 'MST-26-H';

insert into t.results (name, want, got)
select 'card · where it is now', 'TK-C', vessel_code from public.lot_card where code = 'CS-26-H2';

insert into t.results (name, want, got)
select 'card · where it came from', 'MST-26-H', came_from -> 0 ->> 'lot_code'
from public.lot_card where code = 'CS-26-H1';

insert into t.results (name, want, got)
select 'card · what it became', 'CS-26-H1|CS-26-H2',
       (became -> 0 ->> 'lot_code') || '|' || (became -> 1 ->> 'lot_code')
from public.lot_card where code = 'MST-26-H';

insert into t.results (name, want, got)
select 'card · how sure we are, inherited from the guess upstream', 'estimated', confidence
from public.lot_card where code = 'CS-26-H1';

-- -----------------------------------------------------------------------------
-- Nothing was stored to make the screen easier
-- -----------------------------------------------------------------------------
reset role;

insert into t.results (name, want, got)
select 'story · the timeline is a view, never a table', '0', count(*)::text
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in ('lot_story', 'lot_card', 'lot_timeline', 'lot_primary_unit');

insert into t.results (name, want, got)
select 'story · no table anywhere caches a lot''s current position', '0', count(*)::text
from information_schema.columns
where table_schema = 'public'
  and column_name in ('current_volume', 'current_stage', 'current_location', 'current_vessel_id');

-- -----------------------------------------------------------------------------
-- And it respects the boundary
-- -----------------------------------------------------------------------------
set role authenticated;
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

-- Carlos is a real member of a real winery, so he sees his own lot. What he
-- must never see is a single row belonging to somebody else's.
insert into t.results (name, want, got)
select 'story · an outsider reads none of another winery''s story', '0', count(*)::text
from public.lot_story where organization_id <> 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

insert into t.results (name, want, got)
select 'story · nor any of its lot cards', '0', count(*)::text
from public.lot_card where organization_id <> 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

reset role;
reset request.jwt.claims;
