-- =============================================================================
-- PROOF · Winemaker F6 — drop clerk_id legacy (epic #3, issue #12)
--
-- Pre-drop validation (run in prod before applying):
--   select count(*) from wm_wine_lots where organization_id is null;
--   select count(*) from wm_documents where organization_id is null;
--   select count(*) from wm_production_costs where organization_id is null;
--   select count(*) from wm_events where organization_id is null;
--   select count(*) from wm_suppliers where organization_id is null;
--   select count(*) from wm_document_lines where organization_id is null;
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. RLS helpers — org-only (sin dual-read clerk_id)
-- -----------------------------------------------------------------------------
create or replace function public.wm_row_select_allowed(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_organization_id = any(public.organization_ids());
$$;

create or replace function public.wm_row_write_allowed(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_write_org(p_organization_id);
$$;

create or replace function public.wm_row_delete_allowed(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organization_role(p_organization_id) in ('owner', 'admin');
$$;

create or replace function public.winemaker_storage_object_allowed(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_folder text;
begin
  v_folder := (storage.foldername(p_name))[1];
  if v_folder is null or btrim(v_folder) = '' then
    return false;
  end if;

  if v_folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_folder::uuid = any(public.organization_ids());
  end if;

  return false;
end;
$$;

grant execute on function public.wm_row_select_allowed(uuid) to authenticated;
grant execute on function public.wm_row_write_allowed(uuid) to authenticated;
grant execute on function public.wm_row_delete_allowed(uuid) to authenticated;
grant execute on function public.winemaker_storage_object_allowed(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Policies — organization_id only
-- -----------------------------------------------------------------------------
drop policy if exists wm_wine_lots_select on public.wm_wine_lots;
create policy wm_wine_lots_select on public.wm_wine_lots
  for select using (public.wm_row_select_allowed(organization_id));

drop policy if exists wm_wine_lots_insert on public.wm_wine_lots;
create policy wm_wine_lots_insert on public.wm_wine_lots
  for insert with check (public.wm_row_write_allowed(organization_id));

drop policy if exists wm_wine_lots_update on public.wm_wine_lots;
create policy wm_wine_lots_update on public.wm_wine_lots
  for update
  using (public.wm_row_write_allowed(organization_id))
  with check (public.wm_row_write_allowed(organization_id));

drop policy if exists wm_wine_lots_delete on public.wm_wine_lots;
create policy wm_wine_lots_delete on public.wm_wine_lots
  for delete using (public.wm_row_delete_allowed(organization_id));

drop policy if exists wm_production_costs_select on public.wm_production_costs;
create policy wm_production_costs_select on public.wm_production_costs
  for select using (public.wm_row_select_allowed(organization_id));

drop policy if exists wm_production_costs_insert on public.wm_production_costs;
create policy wm_production_costs_insert on public.wm_production_costs
  for insert with check (public.wm_row_write_allowed(organization_id));

drop policy if exists wm_production_costs_update on public.wm_production_costs;
create policy wm_production_costs_update on public.wm_production_costs
  for update
  using (public.wm_row_write_allowed(organization_id))
  with check (public.wm_row_write_allowed(organization_id));

drop policy if exists wm_production_costs_delete on public.wm_production_costs;
create policy wm_production_costs_delete on public.wm_production_costs
  for delete using (public.wm_row_delete_allowed(organization_id));

drop policy if exists wm_suppliers_select on public.wm_suppliers;
create policy wm_suppliers_select on public.wm_suppliers
  for select using (public.wm_row_select_allowed(organization_id));

drop policy if exists wm_suppliers_insert on public.wm_suppliers;
create policy wm_suppliers_insert on public.wm_suppliers
  for insert with check (public.wm_row_write_allowed(organization_id));

drop policy if exists wm_suppliers_update on public.wm_suppliers;
create policy wm_suppliers_update on public.wm_suppliers
  for update
  using (public.wm_row_write_allowed(organization_id))
  with check (public.wm_row_write_allowed(organization_id));

drop policy if exists wm_suppliers_delete on public.wm_suppliers;
create policy wm_suppliers_delete on public.wm_suppliers
  for delete using (public.wm_row_delete_allowed(organization_id));

drop policy if exists wm_documents_select on public.wm_documents;
create policy wm_documents_select on public.wm_documents
  for select using (public.wm_row_select_allowed(organization_id));

drop policy if exists wm_documents_insert on public.wm_documents;
create policy wm_documents_insert on public.wm_documents
  for insert with check (public.wm_row_write_allowed(organization_id));

drop policy if exists wm_documents_delete on public.wm_documents;
create policy wm_documents_delete on public.wm_documents
  for delete to authenticated
  using (public.wm_row_delete_allowed(organization_id));

drop policy if exists wm_events_select on public.wm_events;
create policy wm_events_select on public.wm_events
  for select using (public.wm_row_select_allowed(organization_id));

drop policy if exists wm_events_insert on public.wm_events;
create policy wm_events_insert on public.wm_events
  for insert with check (public.wm_row_write_allowed(organization_id));

drop policy if exists wm_document_lines_select on public.wm_document_lines;
create policy wm_document_lines_select on public.wm_document_lines
  for select using (public.wm_row_select_allowed(organization_id));

drop policy if exists wm_document_lines_insert on public.wm_document_lines;
create policy wm_document_lines_insert on public.wm_document_lines
  for insert with check (public.wm_row_write_allowed(organization_id));

drop policy if exists winemaker_documents_owner_select on storage.objects;
create policy winemaker_documents_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'winemaker-documents'
    and public.winemaker_storage_object_allowed(name)
  );

drop policy if exists winemaker_documents_owner_insert on storage.objects;
create policy winemaker_documents_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'winemaker-documents'
    and public.winemaker_storage_object_allowed(name)
  );

drop policy if exists winemaker_documents_owner_delete on storage.objects;
create policy winemaker_documents_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'winemaker-documents'
    and public.winemaker_storage_object_allowed(name)
  );

-- Drop dual-read overloads (uuid, text)
drop function if exists public.wm_row_select_allowed(uuid, text);
drop function if exists public.wm_row_write_allowed(uuid, text);
drop function if exists public.wm_row_delete_allowed(uuid, text);

-- -----------------------------------------------------------------------------
-- 3. Drop legacy indexes on clerk_id
-- -----------------------------------------------------------------------------
drop index if exists public.wm_wine_lots_clerk_status_idx;
drop index if exists public.wm_documents_clerk_date_idx;
drop index if exists public.wm_documents_folio_idx;
drop index if exists public.wm_production_costs_clerk_date_idx;
drop index if exists public.wm_events_clerk_occurred_idx;
drop index if exists public.wm_suppliers_clerk_name_idx;
drop index if exists public.wm_document_lines_kind_idx;

-- -----------------------------------------------------------------------------
-- 4. Drop clerk_id columns
-- -----------------------------------------------------------------------------
alter table public.wm_wine_lots drop column if exists clerk_id;
alter table public.wm_documents drop column if exists clerk_id;
alter table public.wm_production_costs drop column if exists clerk_id;
alter table public.wm_events drop column if exists clerk_id;
alter table public.wm_suppliers drop column if exists clerk_id;
alter table public.wm_document_lines drop column if exists clerk_id;

-- -----------------------------------------------------------------------------
-- 5. Drop legacy RLS helper
-- -----------------------------------------------------------------------------
drop function if exists proof.winemaker_row_owned(text);

commit;
