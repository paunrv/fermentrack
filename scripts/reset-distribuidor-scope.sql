-- =============================================================================
-- PROOF · Reset datos operativos del distribuidor (un clerk_id)
-- Ejecutar en Supabase → SQL Editor
--
-- ⚠️ IRREVERSIBLE. No borra: profiles, trabajadores, auth.
-- =============================================================================

create or replace function pg_temp.proof_tbl_exists(p_name text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = p_name
  );
$$;

do $$
declare
  v_clerk text := 'user_3Duc3blb3Bm87dMkJiUFPb5XZII';
  v_profile text := 'distributor';
begin
  if pg_temp.proof_tbl_exists('pagos_pedidos') and pg_temp.proof_tbl_exists('pagos') then
    delete from public.pagos_pedidos pp
    where exists (
      select 1 from public.pagos p
      where p.id = pp.pago_id and p.clerk_id = v_clerk and p.profile_type_v2 = v_profile
    ) or exists (
      select 1 from public.pedidos ped
      where ped.id = pp.pedido_id and ped.clerk_id = v_clerk and ped.profile_type_v2 = v_profile
    );
  end if;

  if pg_temp.proof_tbl_exists('pagos_cliente') then
    delete from public.pagos_cliente where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('cuentas_por_cobrar') then
    delete from public.cuentas_por_cobrar where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('pagos_proveedor') then
    delete from public.pagos_proveedor where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('cuentas_por_pagar') then
    delete from public.cuentas_por_pagar where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('eventos_caja') and pg_temp.proof_tbl_exists('cajas_distribuidor') then
    delete from public.eventos_caja ec
    where exists (
      select 1 from public.cajas_distribuidor c
      where c.id = ec.caja_id and c.clerk_id = v_clerk and c.profile_type_v2 = v_profile
    );
    delete from public.cajas_distribuidor where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('remisiones_distribuidor') then
    delete from public.remisiones_distribuidor where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('movimientos_stock') then
    delete from public.movimientos_stock where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('movimientos_sku') then
    delete from public.movimientos_sku where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('recepciones') then
    if pg_temp.proof_tbl_exists('discrepancias') then
      delete from public.discrepancias d
      where exists (
        select 1 from public.recepciones r
        where r.id = d.recepcion_id and r.clerk_id = v_clerk and r.profile_type_v2 = v_profile
      );
    end if;
    if pg_temp.proof_tbl_exists('items_recepcion') then
      delete from public.items_recepcion ir
      where exists (
        select 1 from public.recepciones r
        where r.id = ir.recepcion_id and r.clerk_id = v_clerk and r.profile_type_v2 = v_profile
      );
    end if;
    delete from public.recepciones where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('ordenes_compra_distribuidor') then
    if pg_temp.proof_tbl_exists('items_orden_compra_distribuidor') then
      delete from public.items_orden_compra_distribuidor i
      where exists (
        select 1 from public.ordenes_compra_distribuidor o
        where o.id = i.orden_id and o.clerk_id = v_clerk and o.profile_type_v2 = v_profile
      );
    end if;
    delete from public.ordenes_compra_distribuidor where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('ordenes_compra') then
    if pg_temp.proof_tbl_exists('items_orden_compra') then
      delete from public.items_orden_compra i
      where exists (
        select 1 from public.ordenes_compra o
        where o.id = i.orden_compra_id and o.clerk_id = v_clerk and o.profile_type_v2 = v_profile
      );
    end if;
    delete from public.ordenes_compra where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('pedidos') then
    if pg_temp.proof_tbl_exists('items_pedido') then
      delete from public.items_pedido ip
      where exists (
        select 1 from public.pedidos p
        where p.id = ip.pedido_id and p.clerk_id = v_clerk and p.profile_type_v2 = v_profile
      );
    end if;
    delete from public.pedidos where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('pagos') then
    delete from public.pagos where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('cuentas_clientes') then
    delete from public.cuentas_clientes where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('client_etiquetas') then
    delete from public.client_etiquetas where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('deudas_productores') then
    delete from public.deudas_productores where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('skus') then
    update public.skus set dist_product_id = null
    where clerk_id = v_clerk and profile_type_v2 = v_profile and dist_product_id is not null;
    delete from public.skus where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('clientes') then
    delete from public.clientes where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('clients') then
    delete from public.clients where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  if pg_temp.proof_tbl_exists('dist_movements') then
    delete from public.dist_movements
    where clerk_id = v_clerk and (profile_type_v2 = v_profile or profile_type_v2 is null);
  end if;

  if pg_temp.proof_tbl_exists('dist_inventory') and pg_temp.proof_tbl_exists('dist_products') then
    delete from public.dist_inventory di
    where exists (
      select 1 from public.dist_products dp
      where dp.id = di.product_id and dp.clerk_id = v_clerk
    );
    delete from public.dist_products where clerk_id = v_clerk;
  elsif pg_temp.proof_tbl_exists('dist_products') then
    delete from public.dist_products where clerk_id = v_clerk;
  end if;

  if pg_temp.proof_tbl_exists('proof_sequences') then
    update public.proof_sequences
    set sku_seq = 0, pedido_seq = 0, recepcion_seq = 0, oc_seq = 0, rem_seq = 0
    where clerk_id = v_clerk and profile_type_v2 = v_profile;
  end if;

  -- Storage: Supabase bloquea DELETE directo en storage.objects (usar UI o API)
  begin
    delete from storage.objects
    where bucket_id in ('recepciones', 'skus', 'product-images')
      and (storage.foldername(name))[1] = v_clerk;
    raise notice 'Storage: objetos borrados para %', v_clerk;
  exception
    when others then
      raise notice 'Storage omitido (%). Borra fotos manualmente en Storage si quieres.', sqlerrm;
  end;

  raise notice 'Reset distribuidor OK → %', v_clerk;
end $$;

-- Verificación (debe dar 0 en todo)
select 'skus' as tabla, count(*)::bigint as n from public.skus where clerk_id = 'user_3Duc3blb3Bm87dMkJiUFPb5XZII'
union all select 'clients', count(*)::bigint from public.clients where clerk_id = 'user_3Duc3blb3Bm87dMkJiUFPb5XZII'
union all select 'pedidos', count(*)::bigint from public.pedidos where clerk_id = 'user_3Duc3blb3Bm87dMkJiUFPb5XZII';
