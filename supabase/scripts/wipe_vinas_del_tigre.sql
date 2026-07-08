-- =============================================================================
-- PROOF · Vaciar org demo "Viñas del Tigre" (re-onboarding desde cero)
-- =============================================================================
-- Objetivo: borrar TODOS los datos de la org demo y la org misma; dejar al
-- usuario cd459e32-… huérfano (sin organization_members) para caer en /onboarding.
--
-- NO BORRA:
--   • auth.users (cd459e32-718d-46da-9003-5b002c483cfd)
--   • public.profiles (misma id que auth.users)
--   • public.proof_profiles (legacy; revisar nota al final)
--   • Datos de cualquier otra organización
--
-- Ejecutar en Supabase SQL Editor (rol postgres / service_role — bypass RLS).
-- Idempotente: segunda ejecución termina con aviso si la org ya no existe.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Constantes
-- -----------------------------------------------------------------------------
do $config$
begin
  if current_setting('app.wipe_org_id', true) is null then
    perform set_config('app.wipe_org_id', 'a0000000-0000-4000-8000-000000000001', true);
    perform set_config('app.wipe_org_slug', 'vinas-del-tigre', true);
    perform set_config('app.wipe_user_id', 'cd459e32-718d-46da-9003-5b002c483cfd', true);
  end if;
end;
$config$;

-- -----------------------------------------------------------------------------
-- Pre-flight: confirmar org objetivo (aborta si slug/id no coinciden)
-- -----------------------------------------------------------------------------
do $preflight$
declare
  v_org_id uuid := current_setting('app.wipe_org_id')::uuid;
  v_slug text := current_setting('app.wipe_org_slug');
  v_name text;
begin
  select o.name into v_name
  from public.organizations o
  where o.id = v_org_id
    and o.slug = v_slug;

  if v_name is null then
    raise notice 'SKIP: organización % (slug %) no existe — ya está vacía o fue borrada.', v_org_id, v_slug;
    perform set_config('app.wipe_skip', 'true', true);
    return;
  end if;

  raise notice 'TARGET: % (slug %, id %)', v_name, v_slug, v_org_id;
end;
$preflight$;

-- Si la org ya no existe, salir sin error
do $maybe_exit$
begin
  if coalesce(current_setting('app.wipe_skip', true), 'false') = 'true' then
    raise notice 'Nada que borrar. COMMIT.';
  end if;
end;
$maybe_exit$;

-- Solo continuar si no marcamos skip
do $wipe$
declare
  v_org_id uuid := current_setting('app.wipe_org_id')::uuid;
  v_user_id uuid := current_setting('app.wipe_user_id')::uuid;
  v_org_text text := current_setting('app.wipe_org_id');
  v_skip boolean := coalesce(current_setting('app.wipe_skip', true), 'false') = 'true';
  v_n bigint;
begin
  if v_skip then
    return;
  end if;

  -- -------------------------------------------------------------------------
  -- Inventario PRE-delete (tablas descubiertas vía schema remoto MCP)
  -- -------------------------------------------------------------------------
  raise notice '=== Conteos PRE-delete (org %) ===', v_org_id;

  raise notice 'organization_members: %', (select count(*) from public.organization_members where organization_id = v_org_id);
  raise notice 'varietals: %', (select count(*) from public.varietals where organization_id = v_org_id);
  raise notice 'vintages: %', (select count(*) from public.vintages where organization_id = v_org_id);
  raise notice 'vineyards: %', (select count(*) from public.vineyards where organization_id = v_org_id);
  raise notice 'blocks: %', (select count(*) from public.blocks where organization_id = v_org_id);
  raise notice 'harvest_cuts: %', (select count(*) from public.harvest_cuts where organization_id = v_org_id);
  raise notice 'lots: %', (select count(*) from public.lots where organization_id = v_org_id);
  raise notice 'lot_grape_inputs: %', (select count(*) from public.lot_grape_inputs where organization_id = v_org_id);
  raise notice 'lot_relationships: %', (select count(*) from public.lot_relationships where organization_id = v_org_id);
  raise notice 'events: %', (select count(*) from public.events where organization_id = v_org_id);
  raise notice 'tasks: %', (select count(*) from public.tasks where organization_id = v_org_id);
  raise notice 'vessels: %', (select count(*) from public.vessels where organization_id = v_org_id);
  raise notice 'labels: %', (select count(*) from public.labels where organization_id = v_org_id);
  raise notice 'label_cases: %', (select count(*) from public.label_cases where organization_id = v_org_id);
  raise notice 'lab_reports: %', (select count(*) from public.lab_reports where organization_id = v_org_id);
  raise notice 'lab_samples: %', (select count(*) from public.lab_samples s where s.lab_report_id in (select id from public.lab_reports where organization_id = v_org_id));
  raise notice 'lab_results: %', (select count(*) from public.lab_results r where r.lab_sample_id in (select s.id from public.lab_samples s join public.lab_reports lr on lr.id = s.lab_report_id where lr.organization_id = v_org_id));
  raise notice 'wm_etiquetas: %', (select count(*) from public.wm_etiquetas where organization_id = v_org_id);
  raise notice 'wm_existencias: %', (select count(*) from public.wm_existencias where organization_id = v_org_id);
  raise notice 'wm_salidas: %', (select count(*) from public.wm_salidas where organization_id = v_org_id);
  raise notice 'wm_wine_lots: %', (select count(*) from public.wm_wine_lots where organization_id = v_org_id);
  raise notice 'wm_documents: %', (select count(*) from public.wm_documents where organization_id = v_org_id);
  raise notice 'wm_document_lines: %', (select count(*) from public.wm_document_lines where organization_id = v_org_id);
  raise notice 'wm_production_costs: %', (select count(*) from public.wm_production_costs where organization_id = v_org_id);
  raise notice 'wm_events: %', (select count(*) from public.wm_events where organization_id = v_org_id);
  raise notice 'wm_suppliers: %', (select count(*) from public.wm_suppliers where organization_id = v_org_id);
  raise notice 'wm_mensajes: %', (select count(*) from public.wm_mensajes where organization_id = v_org_id);
  raise notice 'wm_mensajes_lectura: %', (select count(*) from public.wm_mensajes_lectura where organization_id = v_org_id);
  raise notice 'mcp_tool_calls: %', (select count(*) from public.mcp_tool_calls where organization_id = v_org_id);
  raise notice 'audit_logs (text): %', (select count(*) from public.audit_logs where organization_id = v_org_text);
  raise notice 'domain_events (text): %', (select count(*) from public.domain_events where organization_id = v_org_text);
  raise notice 'raw_materials (text): %', (select count(*) from public.raw_materials where organization_id = v_org_text);
  raise notice 'recipes (text): %', (select count(*) from public.recipes where organization_id = v_org_text);
  raise notice 'warehouses (text): %', (select count(*) from public.warehouses where organization_id = v_org_text);
  raise notice 'users legacy (text): %', (select count(*) from public.users where organization_id = v_org_text);
  raise notice 'skus_legacy_prisma (text): %', (select count(*) from public.skus_legacy_prisma where organization_id = v_org_text);

  raise notice '=== Iniciando DELETE en orden de dependencias ===';

  -- -------------------------------------------------------------------------
  -- 1. Lab (hijos → padres) — sin organization_id en samples/results
  -- -------------------------------------------------------------------------
  delete from public.lab_results r
  where r.lab_sample_id in (
    select s.id
    from public.lab_samples s
    join public.lab_reports lr on lr.id = s.lab_report_id
    where lr.organization_id = v_org_id
  );
  get diagnostics v_n = row_count;
  raise notice 'deleted lab_results: %', v_n;

  delete from public.lab_samples s
  where s.lab_report_id in (
    select id from public.lab_reports where organization_id = v_org_id
  );
  get diagnostics v_n = row_count;
  raise notice 'deleted lab_samples: %', v_n;

  -- -------------------------------------------------------------------------
  -- 2. Epic D finished goods (RESTRICT: salidas → existencias → lots/etiquetas)
  -- -------------------------------------------------------------------------
  delete from public.wm_salidas where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_salidas: %', v_n;

  delete from public.wm_existencias where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_existencias: %', v_n;

  -- -------------------------------------------------------------------------
  -- 3. Team chat
  -- -------------------------------------------------------------------------
  delete from public.wm_mensajes_lectura where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_mensajes_lectura: %', v_n;

  delete from public.wm_mensajes where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_mensajes: %', v_n;

  -- -------------------------------------------------------------------------
  -- 4. WM ledger / documentos (líneas antes que documentos)
  -- -------------------------------------------------------------------------
  delete from public.wm_production_costs where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_production_costs: %', v_n;

  delete from public.wm_events where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_events: %', v_n;

  delete from public.wm_document_lines where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_document_lines: %', v_n;

  -- -------------------------------------------------------------------------
  -- 5. Labels / lotes / pipeline
  -- -------------------------------------------------------------------------
  delete from public.label_cases where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted label_cases: %', v_n;

  delete from public.lot_relationships where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted lot_relationships: %', v_n;

  delete from public.lot_grape_inputs where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted lot_grape_inputs: %', v_n;

  delete from public.events where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted events: %', v_n;

  delete from public.labels where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted labels: %', v_n;

  delete from public.lots where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted lots: %', v_n;

  delete from public.lab_reports where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted lab_reports: %', v_n;

  -- -------------------------------------------------------------------------
  -- 6. WM legacy lots + catálogos operativos
  -- -------------------------------------------------------------------------
  delete from public.wm_wine_lots where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_wine_lots: %', v_n;

  delete from public.harvest_cuts where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted harvest_cuts: %', v_n;

  delete from public.blocks where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted blocks: %', v_n;

  delete from public.vineyards where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted vineyards: %', v_n;

  delete from public.vessels where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted vessels: %', v_n;

  delete from public.tasks where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted tasks: %', v_n;

  delete from public.wm_documents where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_documents: %', v_n;

  delete from public.wm_etiquetas where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_etiquetas: %', v_n;

  delete from public.wm_suppliers where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted wm_suppliers: %', v_n;

  delete from public.vintages where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted vintages: %', v_n;

  delete from public.varietals where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted varietals: %', v_n;

  -- -------------------------------------------------------------------------
  -- 7. Legacy Prisma / observabilidad (organization_id TEXT)
  -- -------------------------------------------------------------------------
  delete from public.audit_logs where organization_id = v_org_text;
  get diagnostics v_n = row_count;
  raise notice 'deleted audit_logs: %', v_n;

  delete from public.domain_events where organization_id = v_org_text;
  get diagnostics v_n = row_count;
  raise notice 'deleted domain_events: %', v_n;

  delete from public.raw_materials where organization_id = v_org_text;
  get diagnostics v_n = row_count;
  raise notice 'deleted raw_materials: %', v_n;

  delete from public.recipes where organization_id = v_org_text;
  get diagnostics v_n = row_count;
  raise notice 'deleted recipes: %', v_n;

  delete from public.warehouses where organization_id = v_org_text;
  get diagnostics v_n = row_count;
  raise notice 'deleted warehouses: %', v_n;

  delete from public.users where organization_id = v_org_text;
  get diagnostics v_n = row_count;
  raise notice 'deleted users (legacy): %', v_n;

  delete from public.skus_legacy_prisma where organization_id = v_org_text;
  get diagnostics v_n = row_count;
  raise notice 'deleted skus_legacy_prisma: %', v_n;

  -- -------------------------------------------------------------------------
  -- 8. MCP audit (uuid; ON DELETE SET NULL en org — borramos explícito)
  -- -------------------------------------------------------------------------
  delete from public.mcp_tool_calls where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted mcp_tool_calls: %', v_n;

  -- -------------------------------------------------------------------------
  -- 9. Membresía — tu usuario queda huérfano (y cualquier otro miembro demo)
  -- -------------------------------------------------------------------------
  delete from public.organization_members
  where organization_id = v_org_id
    and user_id = v_user_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted organization_members (tu user): %', v_n;

  delete from public.organization_members
  where organization_id = v_org_id;
  get diagnostics v_n = row_count;
  raise notice 'deleted organization_members (restantes): %', v_n;

  -- -------------------------------------------------------------------------
  -- 10. Organización (último)
  -- -------------------------------------------------------------------------
  delete from public.organizations
  where id = v_org_id
    and slug = current_setting('app.wipe_org_slug');
  get diagnostics v_n = row_count;
  raise notice 'deleted organizations: %', v_n;

  if v_n <> 1 then
    raise exception 'organizations delete inesperado (rows=%)', v_n;
  end if;

  raise notice '=== OK: Viñas del Tigre eliminada. Usuario % sin org. ===', v_user_id;
end;
$wipe$;

commit;

-- =============================================================================
-- POST-EJECUCIÓN (manual, en el browser):
--   localStorage.removeItem('proof_active_organization')
--   localStorage.removeItem('proof_active_profile')
--
-- Si NO caes en /onboarding, revisa si tienes filas en proof_profiles:
--   SELECT * FROM proof_profiles WHERE user_id = 'cd459e32-718d-46da-9003-5b002c483cfd';
-- El script NO las borra. Opcional:
--   DELETE FROM proof_profiles WHERE user_id = 'cd459e32-718d-46da-9003-5b002c483cfd';
-- =============================================================================
