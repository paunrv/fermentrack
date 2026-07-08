-- Seed tanda 1 · vessels + lab (descubrimiento)
-- Requiere: seed.sql base + migraciones 20260707120000_vessels + 20260707130000_lab
-- Org: Viñas del Tigre (slug vinas-del-tigre) — no crea org nueva.

-- -----------------------------------------------------------------------------
-- UUIDs fijos (reproducibles)
-- -----------------------------------------------------------------------------
-- vessels:     a0000009-0001-4000-8000-000000000001 … 0004
-- lab_reports: a0000010-0001-4000-8000-000000000001 (ARDOA) … 0002 (CEVIT)
-- lab_samples: a0000011-0001-4000-8000-000000000001 (AF25) … 0003 (CAR 25)
-- lab_results: a0000012-0001-4000-8000-000000000001 … 0024

begin;

-- -----------------------------------------------------------------------------
-- vessels
-- -----------------------------------------------------------------------------
insert into public.vessels (
  id,
  organization_id,
  name,
  vessel_type,
  capacity_liters,
  is_active
)
select
  v.id,
  o.id,
  v.name,
  v.vessel_type,
  v.capacity_liters,
  true
from public.organizations o
cross join (
  values
    ('a0000009-0001-4000-8000-000000000001'::uuid, 'Tanque 1', 'steel_tank', 5000::numeric),
    ('a0000009-0001-4000-8000-000000000002'::uuid, 'Tanque 2', 'steel_tank', 3000::numeric),
    ('a0000009-0001-4000-8000-000000000003'::uuid, 'Tanque Rosado', 'steel_tank', 2000::numeric),
    ('a0000009-0001-4000-8000-000000000004'::uuid, 'Barrica Fr-12', 'barrel', 225::numeric)
) as v(id, name, vessel_type, capacity_liters)
where o.slug = 'vinas-del-tigre'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- lab_reports
-- -----------------------------------------------------------------------------
insert into public.lab_reports (
  id,
  organization_id,
  folio,
  laboratory_name,
  lab_origin,
  sampled_at,
  received_at,
  analyzed_at,
  reported_at
)
select
  r.id,
  o.id,
  r.folio,
  r.laboratory_name,
  r.lab_origin,
  r.sampled_at,
  r.received_at,
  r.analyzed_at,
  r.reported_at
from public.organizations o
cross join (
  values
    (
      'a0000010-0001-4000-8000-000000000001'::uuid,
      'ARDOA-AF25',
      'Laboratorio Enológico Ardoa',
      'external',
      '2026-03-05'::date,
      null::date,
      null::date,
      null::date
    ),
    (
      'a0000010-0001-4000-8000-000000000002'::uuid,
      '26V0309_070',
      'Laboratorio CEVIT - CETyS',
      'external',
      '2026-03-09'::date,
      '2026-03-09'::date,
      '2026-03-10'::date,
      '2026-03-11'::date
    )
) as r(id, folio, laboratory_name, lab_origin, sampled_at, received_at, analyzed_at, reported_at)
where o.slug = 'vinas-del-tigre'
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- lab_samples
-- -----------------------------------------------------------------------------
insert into public.lab_samples (
  id,
  lab_report_id,
  sample_code
)
values
  (
    'a0000011-0001-4000-8000-000000000001',
    'a0000010-0001-4000-8000-000000000001',
    'AF25'
  ),
  (
    'a0000011-0001-4000-8000-000000000002',
    'a0000010-0001-4000-8000-000000000002',
    'CR 25'
  ),
  (
    'a0000011-0001-4000-8000-000000000003',
    'a0000010-0001-4000-8000-000000000002',
    'CAR 25'
  )
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- lab_results — Informe A (AF25)
-- -----------------------------------------------------------------------------
insert into public.lab_results (
  id,
  lab_sample_id,
  parameter,
  value_numeric,
  value_qualifier,
  unit,
  method
)
values
  (
    'a0000012-0001-4000-8000-000000000001',
    'a0000011-0001-4000-8000-000000000001',
    'glucose_fructose',
    5.11,
    null,
    'g/L',
    null
  ),
  (
    'a0000012-0001-4000-8000-000000000002',
    'a0000011-0001-4000-8000-000000000001',
    'so2_free',
    1,
    '<',
    'mg/L',
    null
  )
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- lab_results — Informe B · muestra "CR 25"
-- -----------------------------------------------------------------------------
insert into public.lab_results (
  id,
  lab_sample_id,
  parameter,
  value_numeric,
  value_qualifier,
  unit,
  method
)
values
  ('a0000012-0001-4000-8000-000000000003', 'a0000011-0001-4000-8000-000000000002', 'titratable_acidity_ph7', 6.07, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000004', 'a0000011-0001-4000-8000-000000000002', 'titratable_acidity_ph82', 6.40, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000005', 'a0000011-0001-4000-8000-000000000002', 'gluconic_acid', 0.00, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000006', 'a0000011-0001-4000-8000-000000000002', 'volatile_acidity', 0.60, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000007', 'a0000011-0001-4000-8000-000000000002', 'total_sugars', 2.50, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000008', 'a0000011-0001-4000-8000-000000000002', 'ethanol', 13.43, null, '%V/V', null),
  ('a0000012-0001-4000-8000-000000000009', 'a0000011-0001-4000-8000-000000000002', 'glucose_fructose', 2.50, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000010', 'a0000011-0001-4000-8000-000000000002', 'ph', 3.28, null, 'pH', 'FTIR'),
  ('a0000012-0001-4000-8000-000000000011', 'a0000011-0001-4000-8000-000000000002', 'ph', 3.19, null, 'pH', 'potentiometry'),
  ('a0000012-0001-4000-8000-000000000012', 'a0000011-0001-4000-8000-000000000002', 'so2_free', 1.00, null, 'mg/L', null),
  ('a0000012-0001-4000-8000-000000000013', 'a0000011-0001-4000-8000-000000000002', 'so2_total', 2.00, null, 'mg/L', null)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- lab_results — Informe B · muestra "CAR 25"
-- -----------------------------------------------------------------------------
insert into public.lab_results (
  id,
  lab_sample_id,
  parameter,
  value_numeric,
  value_qualifier,
  unit,
  method
)
values
  ('a0000012-0001-4000-8000-000000000014', 'a0000011-0001-4000-8000-000000000003', 'titratable_acidity_ph7', 6.75, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000015', 'a0000011-0001-4000-8000-000000000003', 'titratable_acidity_ph82', 7.35, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000016', 'a0000011-0001-4000-8000-000000000003', 'gluconic_acid', 0.00, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000017', 'a0000011-0001-4000-8000-000000000003', 'volatile_acidity', 0.50, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000018', 'a0000011-0001-4000-8000-000000000003', 'total_sugars', 2.00, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000019', 'a0000011-0001-4000-8000-000000000003', 'ethanol', 13.50, null, '%V/V', null),
  ('a0000012-0001-4000-8000-000000000020', 'a0000011-0001-4000-8000-000000000003', 'glucose_fructose', 2.00, null, 'g/L', null),
  ('a0000012-0001-4000-8000-000000000021', 'a0000011-0001-4000-8000-000000000003', 'ph', 3.23, null, 'pH', 'FTIR'),
  ('a0000012-0001-4000-8000-000000000022', 'a0000011-0001-4000-8000-000000000003', 'ph', 3.14, null, 'pH', 'potentiometry'),
  ('a0000012-0001-4000-8000-000000000023', 'a0000011-0001-4000-8000-000000000003', 'so2_free', 1.00, null, 'mg/L', null),
  ('a0000012-0001-4000-8000-000000000024', 'a0000011-0001-4000-8000-000000000003', 'so2_total', 2.00, null, 'mg/L', null)
on conflict (id) do nothing;

commit;
