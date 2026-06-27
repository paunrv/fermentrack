-- Seed · Viñas del Tigre (desarrollo)
-- Requiere migraciones identity + catalogs + event_core.

-- -----------------------------------------------------------------------------
-- UUIDs fijos (reproducibles)
-- -----------------------------------------------------------------------------
-- org:        a0000000-0000-4000-8000-000000000001
-- varietals:  a0000001-0001-4000-8000-000000000001 … 0004
-- vintages:   a0000002-0001-4000-8000-000000000001 (2024) … 0003 (2026)
-- vineyards:  a0000003-0001-4000-8000-000000000001 (El Tigre) … 0002 (García)
-- blocks:     a0000004-0001-4000-8000-000000000001 … 0003
-- harvest:    a0000005-0001-4000-8000-000000000001 … 0003
-- lots:       a0000006-0001-4000-8000-000000000001 (LOT-2026-001) … 0002
-- lgi:        a0000007-0001-4000-8000-000000000001
-- events:     a0000008-0001-4000-8000-000000000001 … 0004

begin;

alter table public.organizations disable trigger on_organization_created;

insert into public.organizations (id, name, slug, plan, settings)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Viñas del Tigre',
  'vinas-del-tigre',
  'free',
  '{}'::jsonb
);

alter table public.organizations enable trigger on_organization_created;

insert into public.varietals (id, organization_id, name, color, category)
values
  (
    'a0000001-0001-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Tempranillo',
    'red',
    'grape'
  ),
  (
    'a0000001-0001-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Cabernet Sauvignon',
    'red',
    'grape'
  ),
  (
    'a0000001-0001-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'Chardonnay',
    'white',
    'grape'
  ),
  (
    'a0000001-0001-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000001',
    'Nebbiolo',
    'red',
    'grape'
  );

insert into public.vintages (id, organization_id, year, status, notes)
values
  (
    'a0000002-0001-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    2024,
    'completed',
    null
  ),
  (
    'a0000002-0001-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    2025,
    'completed',
    null
  ),
  (
    'a0000002-0001-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    2026,
    'active',
    null
  );

insert into public.vineyards (id, organization_id, name, location, area_ha, ownership_type, notes)
values
  (
    'a0000003-0001-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Viñedo El Tigre',
    'Valle de Guadalupe, BC',
    8,
    'own',
    null
  ),
  (
    'a0000003-0001-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Proveedor García',
    null,
    null,
    'purchased',
    null
  );

insert into public.blocks (id, organization_id, vineyard_id, varietal_id, name, area_ha, planted_year, notes)
values
  (
    'a0000004-0001-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'a0000003-0001-4000-8000-000000000001',
    'a0000001-0001-4000-8000-000000000001',
    'Bloque Norte',
    3,
    2005,
    null
  ),
  (
    'a0000004-0001-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'a0000003-0001-4000-8000-000000000001',
    'a0000001-0001-4000-8000-000000000003',
    'Bloque Sur',
    2,
    2010,
    null
  ),
  (
    'a0000004-0001-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'a0000003-0001-4000-8000-000000000001',
    'a0000001-0001-4000-8000-000000000002',
    'Bloque Centro',
    3,
    2008,
    null
  );

insert into public.harvest_cuts (
  id,
  organization_id,
  vintage_id,
  block_id,
  vineyard_id,
  varietal_id,
  cut_number,
  intended_style,
  cut_date,
  weight_kg,
  notes
)
values
  (
    'a0000005-0001-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'a0000002-0001-4000-8000-000000000003',
    'a0000004-0001-4000-8000-000000000002',
    'a0000003-0001-4000-8000-000000000001',
    'a0000001-0001-4000-8000-000000000003',
    1,
    'sparkling',
    '2026-08-02',
    1200,
    null
  ),
  (
    'a0000005-0001-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'a0000002-0001-4000-8000-000000000003',
    'a0000004-0001-4000-8000-000000000002',
    'a0000003-0001-4000-8000-000000000001',
    'a0000001-0001-4000-8000-000000000003',
    2,
    'white',
    '2026-08-24',
    3800,
    null
  ),
  (
    'a0000005-0001-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'a0000002-0001-4000-8000-000000000003',
    'a0000004-0001-4000-8000-000000000001',
    'a0000003-0001-4000-8000-000000000001',
    'a0000001-0001-4000-8000-000000000001',
    1,
    'red',
    '2026-09-15',
    6000,
    null
  );

insert into public.lots (
  id,
  organization_id,
  vintage_id,
  code,
  product_type,
  current_stage,
  status,
  notes
)
values
  (
    'a0000006-0001-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'a0000002-0001-4000-8000-000000000003',
    'LOT-2026-001',
    'wine',
    'fermentation',
    'active',
    null
  ),
  (
    'a0000006-0001-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'a0000002-0001-4000-8000-000000000003',
    'LOT-2026-002',
    'wine',
    'harvest',
    'active',
    null
  );

insert into public.lot_grape_inputs (
  id,
  organization_id,
  lot_id,
  harvest_cut_id,
  vineyard_id,
  varietal_id,
  weight_kg,
  received_at,
  intended_style,
  notes
)
values (
  'a0000007-0001-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'a0000006-0001-4000-8000-000000000001',
  'a0000005-0001-4000-8000-000000000002',
  'a0000003-0001-4000-8000-000000000001',
  'a0000001-0001-4000-8000-000000000003',
  3800,
  '2026-08-24T00:00:00-07:00',
  'white',
  null
);

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
    'a0000008-0001-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'a0000006-0001-4000-8000-000000000001',
    'a0000002-0001-4000-8000-000000000003',
    'GRAPE_RECEIVED',
    '{"weight_kg": 3800, "varietal": "Chardonnay"}'::jsonb,
    '2026-08-24T00:00:00-07:00'
  ),
  (
    'a0000008-0001-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'a0000006-0001-4000-8000-000000000001',
    'a0000002-0001-4000-8000-000000000003',
    'FERMENTATION_STARTED',
    '{"temp_c": 16, "brix": 22.5, "vessel_note": "Tanque 3"}'::jsonb,
    '2026-08-26T00:00:00-07:00'
  ),
  (
    'a0000008-0001-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'a0000006-0001-4000-8000-000000000001',
    'a0000002-0001-4000-8000-000000000003',
    'FERMENTATION_MONITORING',
    '{"temp_c": 17, "brix": 20.1, "activity": "active", "notes": "Burbujeo normal"}'::jsonb,
    '2026-08-27T00:00:00-07:00'
  ),
  (
    'a0000008-0001-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000001',
    'a0000006-0001-4000-8000-000000000001',
    'a0000002-0001-4000-8000-000000000003',
    'WINEMAKER_NOTE',
    '{"text": "Fermentación arrancó muy bien. Sin correcciones por ahora."}'::jsonb,
    '2026-08-28T00:00:00-07:00'
  );

-- Vincular usuario autenticado a Viñas del Tigre
-- Reemplazar el UUID con el del usuario real después de correr el seed
insert into public.organization_members (
  id,
  organization_id,
  user_id,
  role,
  status,
  created_at
) values (
  'a0000009-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000001',  -- Viñas del Tigre
  'cd459e32-718d-46da-9003-5b002c483cfd',
  'owner',
  'active',
  now()
) on conflict do nothing;

-- INSTRUCCIÓN: antes de correr este seed, obtener el UUID real del usuario con:
-- SELECT id FROM auth.users WHERE email = 'phsho007@gmail.com';
-- y reemplazar el placeholder '00000000-0000-0000-0000-000000000000'

commit;
