-- Sincroniza catálogo legacy (dist_products + dist_inventory) → skus

create or replace function proof.sync_sku_from_dist_product(p_dist_product_id uuid)
returns public.skus
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dp public.dist_products%rowtype;
  v_inv public.dist_inventory%rowtype;
  v_stock integer;
  v_categoria public.categoria_sku;
  v_sku public.skus%rowtype;
  v_codigo text;
begin
  select * into v_dp from public.dist_products where id = p_dist_product_id;
  if not found then
    raise exception 'dist_product no encontrado: %', p_dist_product_id;
  end if;

  if v_dp.clerk_id is null or v_dp.profile_type_v2 is null then
    raise exception 'dist_product sin scope clerk_id/profile_type_v2';
  end if;

  select * into v_inv from public.dist_inventory where product_id = p_dist_product_id;

  v_stock := coalesce(v_inv.cases, 0) * v_dp.bottles_per_case + coalesce(v_inv.loose_units, 0);

  v_categoria := case v_dp.category
    when 'cerveza' then 'cerveza'::public.categoria_sku
    when 'vino' then 'vino'::public.categoria_sku
    when 'destilado' then 'destilado'::public.categoria_sku
    else 'otro'::public.categoria_sku
  end;

  select * into v_sku from public.skus where dist_product_id = p_dist_product_id;

  if found then
    update public.skus
    set
      nombre = v_dp.name,
      productor = coalesce(v_dp.producer, ''),
      categoria = v_categoria,
      botellas_por_caja = v_dp.bottles_per_case,
      stock_total = v_stock,
      stock_minimo = greatest(24, round(coalesce(v_inv.max_units, 0) * 0.2)::integer),
      costo_unitario = v_dp.cost_per_unit,
      precio_venta = v_dp.price_regular,
      updated_at = now()
    where id = v_sku.id
    returning * into v_sku;
    return v_sku;
  end if;

  v_codigo := proof.next_codigo(v_dp.clerk_id, v_dp.profile_type_v2, 'sku');

  insert into public.skus (
    codigo, nombre, productor, categoria, bodega, botellas_por_caja,
    stock_total, stock_minimo, costo_unitario, precio_venta,
    dist_product_id, clerk_id, profile_type_v2,
    ultimo_movimiento
  )
  values (
    v_codigo,
    v_dp.name,
    coalesce(v_dp.producer, ''),
    v_categoria,
    'Principal',
    v_dp.bottles_per_case,
    v_stock,
    greatest(24, round(coalesce(v_inv.max_units, 0) * 0.2)::integer),
    v_dp.cost_per_unit,
    v_dp.price_regular,
    p_dist_product_id,
    v_dp.clerk_id,
    v_dp.profile_type_v2,
    now()
  )
  returning * into v_sku;

  return v_sku;
end;
$$;

create or replace function proof.sync_all_skus_for_scope(
  p_clerk_id text,
  p_profile_type_v2 text default 'distributor'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select id from public.dist_products
    where clerk_id = p_clerk_id
      and profile_type_v2 = p_profile_type_v2
  loop
    perform proof.sync_sku_from_dist_product(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function proof.sync_sku_from_dist_product(uuid) to authenticated, service_role;
grant execute on function proof.sync_all_skus_for_scope(text, text) to authenticated, service_role;
