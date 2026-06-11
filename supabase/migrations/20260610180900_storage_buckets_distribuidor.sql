-- Storage privado · comprobantes, pedidos-origen, eventos-bodega
-- Path dentro del bucket: {distribuidor_id}/...  (distribuidor_id = clerk_id del patrón)
-- Patrón: helpers proof.* + políticas storage.objects (como product-images / remisiones)

-- -----------------------------------------------------------------------------
-- Buckets (privados)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('comprobantes', 'comprobantes', false),
  ('pedidos-origen', 'pedidos-origen', false),
  ('eventos-bodega', 'eventos-bodega', false)
on conflict (id) do update set public = excluded.public;

-- -----------------------------------------------------------------------------
-- Helpers · ownership por carpeta raíz = clerk_id distribuidor
-- -----------------------------------------------------------------------------
create or replace function proof.storage_distribuidor_folder(object_name text)
returns text
language sql
stable
security definer
set search_path = public, storage
as $$
  select (storage.foldername(object_name))[1];
$$;

create or replace function proof.storage_distribuidor_path_select(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    coalesce(proof.storage_distribuidor_folder(object_name), '') <> ''
    and (
      proof.row_belongs_to_requester(
        proof.storage_distribuidor_folder(object_name),
        'distributor'
      )
      or proof.requester_es_trabajador_activo_scope(
        proof.storage_distribuidor_folder(object_name),
        'distributor'
      )
    );
$$;

create or replace function proof.storage_distribuidor_path_insert_patron(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    coalesce(proof.storage_distribuidor_folder(object_name), '') <> ''
    and proof.row_belongs_to_requester(
      proof.storage_distribuidor_folder(object_name),
      'distributor'
    );
$$;

create or replace function proof.storage_distribuidor_path_insert_bodega(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    coalesce(proof.storage_distribuidor_folder(object_name), '') <> ''
    and (
      proof.row_belongs_to_requester(
        proof.storage_distribuidor_folder(object_name),
        'distributor'
      )
      or exists (
        select 1
        from public.trabajadores t
        where t.clerk_user_id = proof.current_clerk_id()
          and t.clerk_id = proof.storage_distribuidor_folder(object_name)
          and t.profile_type_v2 = 'distributor'
          and t.rol = 'bodega'
          and t.activo = true
      )
    );
$$;

grant execute on function proof.storage_distribuidor_folder(text) to authenticated, service_role;
grant execute on function proof.storage_distribuidor_path_select(text) to authenticated, service_role;
grant execute on function proof.storage_distribuidor_path_insert_patron(text) to authenticated, service_role;
grant execute on function proof.storage_distribuidor_path_insert_bodega(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- comprobantes · SELECT (scope) · INSERT (patrón)
-- -----------------------------------------------------------------------------
drop policy if exists comprobantes_owner_select on storage.objects;
create policy comprobantes_owner_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'comprobantes'
    and proof.storage_distribuidor_path_select(name)
  );

drop policy if exists comprobantes_owner_insert on storage.objects;
create policy comprobantes_owner_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'comprobantes'
    and proof.storage_distribuidor_path_insert_patron(name)
  );

-- -----------------------------------------------------------------------------
-- pedidos-origen · SELECT (scope) · INSERT (patrón)
-- -----------------------------------------------------------------------------
drop policy if exists pedidos_origen_owner_select on storage.objects;
create policy pedidos_origen_owner_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pedidos-origen'
    and proof.storage_distribuidor_path_select(name)
  );

drop policy if exists pedidos_origen_owner_insert on storage.objects;
create policy pedidos_origen_owner_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pedidos-origen'
    and proof.storage_distribuidor_path_insert_patron(name)
  );

-- -----------------------------------------------------------------------------
-- eventos-bodega · SELECT (scope) · INSERT (patrón + bodega)
-- -----------------------------------------------------------------------------
drop policy if exists eventos_bodega_owner_select on storage.objects;
create policy eventos_bodega_owner_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'eventos-bodega'
    and proof.storage_distribuidor_path_select(name)
  );

drop policy if exists eventos_bodega_owner_insert on storage.objects;
create policy eventos_bodega_owner_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'eventos-bodega'
    and proof.storage_distribuidor_path_insert_bodega(name)
  );

notify pgrst, 'reload schema';
