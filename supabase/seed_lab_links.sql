-- Vincula muestras CETyS (seed_tanda1) a lotes blend origen (seed_tanda2)
-- Requiere: seed.sql + seed_tanda1.sql + seed_tanda2.sql
-- Org: Viñas del Tigre (slug vinas-del-tigre)
--
-- UUIDs verificados en remoto (MCP execute_sql, 2026-07-07):
--   lab_samples CR 25  → a0000011-0001-4000-8000-000000000002
--   lab_samples CAR 25 → a0000011-0001-4000-8000-000000000003
--   lots LOT-2026-010  → a0000013-0001-4000-8000-000000000001 (Cabernet)
--   lots LOT-2026-011  → a0000013-0001-4000-8000-000000000002 (Merlot)

begin;

-- CR 25 → LOT-2026-010 (Cabernet Sauvignon)
update public.lab_samples ls
set
  lot_id = l.id,
  production_stage = 'malolactic'
from public.lots l
inner join public.organizations o on o.id = l.organization_id
where ls.id = 'a0000011-0001-4000-8000-000000000002'::uuid
  and o.slug = 'vinas-del-tigre'
  and l.code = 'LOT-2026-010'
  and (
    ls.lot_id is distinct from l.id
    or ls.production_stage is distinct from 'malolactic'
  );

-- CAR 25 → LOT-2026-011 (Merlot)
update public.lab_samples ls
set
  lot_id = l.id,
  production_stage = 'malolactic'
from public.lots l
inner join public.organizations o on o.id = l.organization_id
where ls.id = 'a0000011-0001-4000-8000-000000000003'::uuid
  and o.slug = 'vinas-del-tigre'
  and l.code = 'LOT-2026-011'
  and (
    ls.lot_id is distinct from l.id
    or ls.production_stage is distinct from 'malolactic'
  );

commit;
