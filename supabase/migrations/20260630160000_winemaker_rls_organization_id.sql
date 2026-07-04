-- =============================================================================
-- PROOF · Winemaker — RLS cutover a organization_id (epic #3, issue #8)
-- Dual-read temporal: org membership OR legacy clerk_id (retirar en F6 #12).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Restore legacy helper (dropped in 20260624120000) — required for dual-read #8
-- -----------------------------------------------------------------------------
create or replace function proof.winemaker_row_owned(p_clerk_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_clerk_id is not null
    and btrim(p_clerk_id) <> ''
    and (
      p_clerk_id = auth.uid()::text
      or (
        p_clerk_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and p_clerk_id::uuid = auth.uid()
      )
      or exists (
        select 1
        from public.proof_profiles pp
        where pp.user_id = auth.uid()
          and pp.profile_type_v2 = 'winemaker'
          and (pp.clerk_id = p_clerk_id or pp.user_id::text = p_clerk_id)
      )
    );
$$;

grant execute on function proof.winemaker_row_owned(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Helpers visibilidad / escritura (dual-read)
-- -----------------------------------------------------------------------------
create or replace function public.wm_row_select_allowed(
  p_organization_id uuid,
  p_clerk_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_organization_id = any(public.organization_ids())
    or proof.winemaker_row_owned(p_clerk_id);
$$;

create or replace function public.wm_row_write_allowed(
  p_organization_id uuid,
  p_clerk_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_write_org(p_organization_id)
    or proof.winemaker_row_owned(p_clerk_id);
$$;

create or replace function public.wm_row_delete_allowed(
  p_organization_id uuid,
  p_clerk_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.organization_role(p_organization_id) in ('owner', 'admin')
    or proof.winemaker_row_owned(p_clerk_id);
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
    if v_folder::uuid = any(public.organization_ids()) then
      return true;
    end if;
  end if;

  return proof.winemaker_row_owned(v_folder);
end;
$$;

grant execute on function public.wm_row_select_allowed(uuid, text) to authenticated;
grant execute on function public.wm_row_write_allowed(uuid, text) to authenticated;
grant execute on function public.wm_row_delete_allowed(uuid, text) to authenticated;
grant execute on function public.winemaker_storage_object_allowed(text) to authenticated;

comment on function proof.winemaker_row_owned(text) is
  'DEPRECATED — usar organization_id + wm_row_*_allowed. Eliminar en F6 (#12).';

-- -----------------------------------------------------------------------------
-- wm_wine_lots
-- -----------------------------------------------------------------------------
drop policy if exists wm_wine_lots_select on public.wm_wine_lots;
create policy wm_wine_lots_select on public.wm_wine_lots
  for select using (public.wm_row_select_allowed(organization_id, clerk_id));

drop policy if exists wm_wine_lots_insert on public.wm_wine_lots;
create policy wm_wine_lots_insert on public.wm_wine_lots
  for insert with check (public.wm_row_write_allowed(organization_id, clerk_id));

drop policy if exists wm_wine_lots_update on public.wm_wine_lots;
create policy wm_wine_lots_update on public.wm_wine_lots
  for update
  using (public.wm_row_write_allowed(organization_id, clerk_id))
  with check (public.wm_row_write_allowed(organization_id, clerk_id));

drop policy if exists wm_wine_lots_delete on public.wm_wine_lots;
create policy wm_wine_lots_delete on public.wm_wine_lots
  for delete using (public.wm_row_delete_allowed(organization_id, clerk_id));

-- -----------------------------------------------------------------------------
-- wm_production_costs
-- -----------------------------------------------------------------------------
drop policy if exists wm_production_costs_select on public.wm_production_costs;
create policy wm_production_costs_select on public.wm_production_costs
  for select using (public.wm_row_select_allowed(organization_id, clerk_id));

drop policy if exists wm_production_costs_insert on public.wm_production_costs;
create policy wm_production_costs_insert on public.wm_production_costs
  for insert with check (public.wm_row_write_allowed(organization_id, clerk_id));

drop policy if exists wm_production_costs_update on public.wm_production_costs;
create policy wm_production_costs_update on public.wm_production_costs
  for update
  using (public.wm_row_write_allowed(organization_id, clerk_id))
  with check (public.wm_row_write_allowed(organization_id, clerk_id));

drop policy if exists wm_production_costs_delete on public.wm_production_costs;
create policy wm_production_costs_delete on public.wm_production_costs
  for delete using (public.wm_row_delete_allowed(organization_id, clerk_id));

-- -----------------------------------------------------------------------------
-- wm_suppliers
-- -----------------------------------------------------------------------------
drop policy if exists wm_suppliers_select on public.wm_suppliers;
create policy wm_suppliers_select on public.wm_suppliers
  for select using (public.wm_row_select_allowed(organization_id, clerk_id));

drop policy if exists wm_suppliers_insert on public.wm_suppliers;
create policy wm_suppliers_insert on public.wm_suppliers
  for insert with check (public.wm_row_write_allowed(organization_id, clerk_id));

drop policy if exists wm_suppliers_update on public.wm_suppliers;
create policy wm_suppliers_update on public.wm_suppliers
  for update
  using (public.wm_row_write_allowed(organization_id, clerk_id))
  with check (public.wm_row_write_allowed(organization_id, clerk_id));

drop policy if exists wm_suppliers_delete on public.wm_suppliers;
create policy wm_suppliers_delete on public.wm_suppliers
  for delete using (public.wm_row_delete_allowed(organization_id, clerk_id));

-- -----------------------------------------------------------------------------
-- wm_documents (select + insert; delete dev)
-- -----------------------------------------------------------------------------
drop policy if exists wm_documents_select on public.wm_documents;
create policy wm_documents_select on public.wm_documents
  for select using (public.wm_row_select_allowed(organization_id, clerk_id));

drop policy if exists wm_documents_insert on public.wm_documents;
create policy wm_documents_insert on public.wm_documents
  for insert with check (public.wm_row_write_allowed(organization_id, clerk_id));

drop policy if exists wm_documents_delete on public.wm_documents;
create policy wm_documents_delete on public.wm_documents
  for delete to authenticated
  using (public.wm_row_delete_allowed(organization_id, clerk_id));

-- -----------------------------------------------------------------------------
-- wm_events (select + insert)
-- -----------------------------------------------------------------------------
drop policy if exists wm_events_select on public.wm_events;
create policy wm_events_select on public.wm_events
  for select using (public.wm_row_select_allowed(organization_id, clerk_id));

drop policy if exists wm_events_insert on public.wm_events;
create policy wm_events_insert on public.wm_events
  for insert with check (public.wm_row_write_allowed(organization_id, clerk_id));

-- -----------------------------------------------------------------------------
-- wm_document_lines (select + insert)
-- -----------------------------------------------------------------------------
drop policy if exists wm_document_lines_select on public.wm_document_lines;
create policy wm_document_lines_select on public.wm_document_lines
  for select using (public.wm_row_select_allowed(organization_id, clerk_id));

drop policy if exists wm_document_lines_insert on public.wm_document_lines;
create policy wm_document_lines_insert on public.wm_document_lines
  for insert with check (public.wm_row_write_allowed(organization_id, clerk_id));

-- -----------------------------------------------------------------------------
-- Storage · winemaker-documents (org folder + legacy clerk_id folder)
-- -----------------------------------------------------------------------------
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

commit;
