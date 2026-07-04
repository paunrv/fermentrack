-- M8 · Post-cutover legacy revoke (dist_products → skus completo)
-- Project: stjnoacbdcjhhucaoqrw · Run ONCE in SQL Editor after M5 app + M6 + M7
-- Idempotente. En prod sin dist_*: elimina RPC sync, columna dist_product_id, paths storage legacy.
-- Verify after: npm run check:dist-schema

begin;

-- -----------------------------------------------------------------------------
-- 1) RPC sync legacy (ya no escribe catálogo)
-- -----------------------------------------------------------------------------

drop function if exists public.sync_all_skus_for_scope(text, text);
drop function if exists proof.sync_all_skus_for_scope(text, text);
drop function if exists proof.sync_sku_from_dist_product(uuid);

-- -----------------------------------------------------------------------------
-- 2) skus.dist_product_id (enlace legacy)
-- -----------------------------------------------------------------------------

alter table public.skus drop constraint if exists skus_dist_product_id_fkey;
drop index if exists public.skus_dist_product_id_idx;
alter table public.skus drop column if exists dist_product_id;

-- -----------------------------------------------------------------------------
-- 3) movimientos_sku.dist_movement_id (trazabilidad backfill M5; N/A en prod)
-- -----------------------------------------------------------------------------

alter table public.movimientos_sku drop constraint if exists movimientos_sku_dist_movement_id_key;
drop index if exists public.movimientos_sku_dist_movement_id_idx;
alter table public.movimientos_sku drop column if exists dist_movement_id;

-- -----------------------------------------------------------------------------
-- 4) Tablas dist_* (solo si existen — dev/local). Revoca escrituras; lectura histórica.
-- -----------------------------------------------------------------------------

do $dist_legacy$
declare
  pol record;
begin
  if to_regclass('public.dist_products') is not null then
    revoke insert, update, delete, truncate on public.dist_products from authenticated, anon;
    revoke insert, update, delete, truncate on public.dist_inventory from authenticated, anon;
    revoke insert, update, delete, truncate on public.dist_movements from authenticated, anon;

    for pol in
      select schemaname, tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and tablename in ('dist_products', 'dist_inventory', 'dist_movements')
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        pol.policyname,
        pol.tablename
      );
    end loop;

    execute $view$
      create or replace view public.dist_products_legacy as
      select * from public.dist_products
    $view$;

    execute $view$
      create or replace view public.dist_inventory_legacy as
      select * from public.dist_inventory
    $view$;

    execute $view$
      create or replace view public.dist_movements_legacy as
      select * from public.dist_movements
    $view$;

    grant select on public.dist_products_legacy to authenticated, service_role;
    grant select on public.dist_inventory_legacy to authenticated, service_role;
    grant select on public.dist_movements_legacy to authenticated, service_role;
  else
    raise notice 'M8: sin tablas dist_* — skip revoke/views';
  end if;
end;
$dist_legacy$;

-- -----------------------------------------------------------------------------
-- 5) Storage product-images: solo path canónico skus/{sku_id}/...
-- -----------------------------------------------------------------------------

create or replace function proof.sku_image_path_owned(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, proof
as $$
  select exists (
    select 1
    from public.skus s
    where (storage.foldername(object_name))[1] = 'skus'
      and s.id::text = (storage.foldername(object_name))[2]
      and (
        s.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(s.clerk_id, s.profile_type_v2)
      )
  );
$$;

grant execute on function proof.sku_image_path_owned(text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
