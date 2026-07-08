-- Seed tanda 2 · blend → etiqueta → cajas (demostración para enólogos)
-- Requiere: seed.sql base + seed_tanda1.sql + migraciones lot_relationships + labels_cases
-- Org: Viñas del Tigre (slug vinas-del-tigre)

-- -----------------------------------------------------------------------------
-- UUIDs fijos (reproducibles) — bloque a0000013+
-- -----------------------------------------------------------------------------
-- merlot:            a0000001-0001-4000-8000-000000000005
-- lots:              a0000013-0001-4000-8000-000000000001 (LOT-2026-010) … 0003 (LOT-2026-012)
-- lot_grape_inputs:  a0000014-0001-4000-8000-000000000001 … 0002
-- lot_relationships: a0000015-0001-4000-8000-000000000001 … 0002
-- labels:            a0000016-0001-4000-8000-000000000001 (Reserva Tinto)
-- label_cases:       a0000017-0001-4000-8000-000000000001
-- events:            a0000018-0001-4000-8000-000000000001 … 0003
--
-- Referencias del seed base (no recrear):
-- org:      a0000000-0000-4000-8000-000000000001
-- vintage:  a0000002-0001-4000-8000-000000000003 (2026)
-- cabernet: a0000001-0001-4000-8000-000000000002
-- viñedo:   a0000003-0001-4000-8000-000000000001 (Viñedo El Tigre)

begin;

-- -----------------------------------------------------------------------------
-- 1. Merlot (si no existe)
-- -----------------------------------------------------------------------------
insert into public.varietals (id, organization_id, name, color, category)
select
  'a0000001-0001-4000-8000-000000000005'::uuid,
  o.id,
  'Merlot',
  'red',
  'grape'
from public.organizations o
where o.slug = 'vinas-del-tigre'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Lotes origen (tintos, crianza) + lote blend
-- -----------------------------------------------------------------------------
insert into public.lots (
  id,
  organization_id,
  vintage_id,
  code,
  product_type,
  current_stage,
  etapa,
  status,
  notes
)
select
  l.id,
  o.id,
  'a0000002-0001-4000-8000-000000000003'::uuid,
  l.code,
  'wine',
  'aging',
  'crianza'::public.lot_etapa,
  'active',
  l.notes
from public.organizations o
cross join (
  values
    (
      'a0000013-0001-4000-8000-000000000001'::uuid,
      'LOT-2026-010',
      null::text
    ),
    (
      'a0000013-0001-4000-8000-000000000002'::uuid,
      'LOT-2026-011',
      null::text
    ),
    (
      'a0000013-0001-4000-8000-000000000003'::uuid,
      'LOT-2026-012',
      'Blend Reserva Tinto 2026 — 60% Cabernet / 40% Merlot'
    )
) as l(id, code, notes)
where o.slug = 'vinas-del-tigre'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- lot_grape_inputs — uva origen (rendimientos plausibles para el blend)
-- -----------------------------------------------------------------------------
insert into public.lot_grape_inputs (
  id,
  organization_id,
  lot_id,
  vineyard_id,
  varietal_id,
  weight_kg,
  received_at,
  intended_style,
  notes
)
select
  g.id,
  o.id,
  g.lot_id,
  'a0000003-0001-4000-8000-000000000001'::uuid,
  g.varietal_id,
  g.weight_kg,
  g.received_at,
  'red',
  g.notes
from public.organizations o
cross join (
  values
    (
      'a0000014-0001-4000-8000-000000000001'::uuid,
      'a0000013-0001-4000-8000-000000000001'::uuid,
      'a0000001-0001-4000-8000-000000000002'::uuid,
      4000::numeric,
      '2026-09-20T08:00:00-07:00'::timestamptz,
      'Cabernet Sauvignon — Bloque Centro, vendimia 2026'
    ),
    (
      'a0000014-0001-4000-8000-000000000002'::uuid,
      'a0000013-0001-4000-8000-000000000002'::uuid,
      'a0000001-0001-4000-8000-000000000005'::uuid,
      2600::numeric,
      '2026-09-28T08:00:00-07:00'::timestamptz,
      'Merlot — parcela sur, vendimia 2026'
    )
) as g(id, lot_id, varietal_id, weight_kg, received_at, notes)
where o.slug = 'vinas-del-tigre'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. lot_relationships — blend 60/40 por volumen (1800 L + 1200 L = 3000 L)
-- -----------------------------------------------------------------------------
insert into public.lot_relationships (
  id,
  organization_id,
  parent_lot_id,
  child_lot_id,
  relationship_type,
  volume_liters_contributed,
  occurred_at,
  notes
)
select
  r.id,
  o.id,
  r.parent_lot_id,
  r.child_lot_id,
  'blend',
  r.volume_liters_contributed,
  r.occurred_at,
  r.notes
from public.organizations o
cross join (
  values
    (
      'a0000015-0001-4000-8000-000000000001'::uuid,
      'a0000013-0001-4000-8000-000000000001'::uuid,
      'a0000013-0001-4000-8000-000000000003'::uuid,
      1800::numeric,
      '2026-11-15T10:00:00-08:00'::timestamptz,
      'Aporte Cabernet Sauvignon — 60% del blend'
    ),
    (
      'a0000015-0001-4000-8000-000000000002'::uuid,
      'a0000013-0001-4000-8000-000000000002'::uuid,
      'a0000013-0001-4000-8000-000000000003'::uuid,
      1200::numeric,
      '2026-11-15T10:00:00-08:00'::timestamptz,
      'Aporte Merlot — 40% del blend'
    )
) as r(id, parent_lot_id, child_lot_id, volume_liters_contributed, occurred_at, notes)
where o.slug = 'vinas-del-tigre'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. labels — Reserva Tinto 2026
-- -----------------------------------------------------------------------------
insert into public.labels (
  id,
  organization_id,
  lot_id,
  name,
  vintage_year,
  bottle_volume_ml
)
select
  'a0000016-0001-4000-8000-000000000001'::uuid,
  o.id,
  'a0000013-0001-4000-8000-000000000003'::uuid,
  'Reserva Tinto',
  2026,
  750
from public.organizations o
where o.slug = 'vinas-del-tigre'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 6. label_cases — 3000 L ≈ 4000 botellas × 750 ml (~333 cajas de 12)
-- -----------------------------------------------------------------------------
insert into public.label_cases (
  id,
  organization_id,
  label_id,
  case_count,
  bottles_per_case,
  total_bottles,
  bottled_at,
  notes
)
select
  'a0000017-0001-4000-8000-000000000001'::uuid,
  o.id,
  'a0000016-0001-4000-8000-000000000001'::uuid,
  333,
  12,
  4000,
  '2026-11-20'::date,
  'Embotellado completo del blend Reserva Tinto 2026'
from public.organizations o
where o.slug = 'vinas-del-tigre'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 7. events — historia del ciclo (append-only)
-- -----------------------------------------------------------------------------
insert into public.events (
  id,
  organization_id,
  lot_id,
  vintage_id,
  event_type,
  payload,
  occurred_at
)
values
  (
    'a0000018-0001-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'a0000013-0001-4000-8000-000000000003',
    'a0000002-0001-4000-8000-000000000003',
    'BLEND_COMPLETED',
    jsonb_build_object(
      'child_lot_id', 'a0000013-0001-4000-8000-000000000003',
      'source', jsonb_build_array(
        jsonb_build_object(
          'lot_id', 'a0000013-0001-4000-8000-000000000001',
          'volume_liters', 1800
        ),
        jsonb_build_object(
          'lot_id', 'a0000013-0001-4000-8000-000000000002',
          'volume_liters', 1200
        )
      )
    ),
    '2026-11-15T10:00:00-08:00'
  ),
  (
    'a0000018-0001-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'a0000013-0001-4000-8000-000000000003',
    'a0000002-0001-4000-8000-000000000003',
    'WINEMAKER_NOTE',
    jsonb_build_object(
      'text',
      'Coupage final Reserva Tinto: 60% Cabernet, 40% Merlot. Decidido tras cata comparativa.'
    ),
    '2026-11-15T11:30:00-08:00'
  ),
  (
    'a0000018-0001-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'a0000013-0001-4000-8000-000000000003',
    'a0000002-0001-4000-8000-000000000003',
    'BOTTLED',
    jsonb_build_object(
      'label_id', 'a0000016-0001-4000-8000-000000000001',
      'case_count', 333,
      'total_bottles', 4000
    ),
    '2026-11-20T09:00:00-08:00'
  )
on conflict (id) do nothing;

commit;

-- -----------------------------------------------------------------------------
-- Verificación esperada (no ejecutar aquí — referencia para demo):
-- SELECT * FROM public.blend_proportions
-- WHERE child_lot_id = 'a0000013-0001-4000-8000-000000000003'
-- ORDER BY proportion_pct DESC;
--
-- | parent_lot_id (lote)   | volume_liters_contributed | total_volume_liters | proportion_pct |
-- | LOT-2026-010 (Cabernet)| 1800                      | 3000                | 60.00          |
-- | LOT-2026-011 (Merlot)  | 1200                      | 3000                | 40.00          |
