-- =============================================================================
-- PROOF · Distribuidor Fase 1 — integridad de stock
-- 1) Recepción OC: cantidad_recibida acumulativa + delta en stock
-- 2) CxP proporcional a mercancía recibida
-- 3) confirmar_pedido: validar líneas y stock disponible
-- =============================================================================

-- cantidad_recibida en p_lineas = total acumulado recibido por ítem (no incremento)
create or replace function proof.confirmar_llegada_orden_compra_distribuidor(
  p_orden_id uuid,
  p_lineas jsonb
)
returns public.ordenes_compra_distribuidor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden public.ordenes_compra_distribuidor%rowtype;
  v_elem jsonb;
  v_item public.items_orden_compra_distribuidor%rowtype;
  v_item_id uuid;
  v_cant_rec integer;
  v_prev_rec integer;
  v_delta integer;
  v_nueva_total integer;
  v_sku_id uuid;
  v_codigo text;
  v_todos_completos boolean := true;
  v_alguno_recibido boolean := false;
  v_monto_recibido numeric(12, 2);
begin
  select * into v_orden
  from public.ordenes_compra_distribuidor
  where id = p_orden_id
  for update;

  if not found then
    raise exception 'Orden de compra no encontrada: %', p_orden_id;
  end if;

  if not proof.row_belongs_to_requester(v_orden.clerk_id, v_orden.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_orden.estado in ('recibida', 'cancelada') then
    raise exception 'La orden % ya está %', v_orden.numero_orden, v_orden.estado;
  end if;

  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'p_lineas debe ser un arreglo no vacío';
  end if;

  for v_elem in select * from jsonb_array_elements(p_lineas) loop
    v_item_id := (v_elem ->> 'item_id')::uuid;
    v_cant_rec := (v_elem ->> 'cantidad_recibida')::integer;

    if v_item_id is null or v_cant_rec is null then
      raise exception 'cada línea requiere item_id y cantidad_recibida';
    end if;

    if v_cant_rec < 0 then
      raise exception 'cantidad_recibida no puede ser negativa';
    end if;

    select * into v_item
    from public.items_orden_compra_distribuidor
    where id = v_item_id and orden_id = p_orden_id;

    if not found then
      raise exception 'Ítem % no pertenece a la orden', v_item_id;
    end if;

    v_nueva_total := v_cant_rec;

    if v_nueva_total > v_item.cantidad_ordenada then
      raise exception 'cantidad recibida (%) supera lo ordenado (%) para %',
        v_nueva_total, v_item.cantidad_ordenada, v_item.producto_nombre;
    end if;

    v_prev_rec := coalesce(v_item.cantidad_recibida, 0);
    v_delta := v_nueva_total - v_prev_rec;

    if v_delta < 0 then
      raise exception 'cantidad recibida no puede ser menor a lo ya registrado (%) para %',
        v_prev_rec, v_item.producto_nombre;
    end if;

    update public.items_orden_compra_distribuidor
    set cantidad_recibida = v_nueva_total
    where id = v_item_id;

    if v_nueva_total > 0 then
      v_alguno_recibido := true;
    end if;

    if v_delta > 0 then
      v_sku_id := v_item.sku_id;

      if v_sku_id is null then
        select s.id into v_sku_id
        from public.skus s
        where s.clerk_id = v_orden.clerk_id
          and s.profile_type_v2 = v_orden.profile_type_v2
          and lower(trim(s.nombre)) = lower(trim(v_item.producto_nombre))
        order by s.created_at desc
        limit 1;

        if v_sku_id is null then
          v_codigo := proof.next_codigo(v_orden.clerk_id, v_orden.profile_type_v2, 'sku');
          insert into public.skus (
            codigo, nombre, productor, costo_unitario, stock_total,
            clerk_id, profile_type_v2, ultimo_movimiento
          )
          values (
            v_codigo,
            v_item.producto_nombre,
            v_orden.proveedor_nombre,
            v_item.costo_unitario,
            v_delta,
            v_orden.clerk_id,
            v_orden.profile_type_v2,
            now()
          )
          returning id into v_sku_id;
        else
          update public.skus s
          set
            stock_total = s.stock_total + v_delta,
            costo_unitario = v_item.costo_unitario,
            productor = case
              when coalesce(s.productor, '') = '' then v_orden.proveedor_nombre
              else s.productor
            end,
            ultimo_movimiento = now(),
            en_transito = false
          where s.id = v_sku_id;
        end if;

        update public.items_orden_compra_distribuidor
        set sku_id = v_sku_id
        where id = v_item_id;
      else
        update public.skus s
        set
          stock_total = s.stock_total + v_delta,
          costo_unitario = v_item.costo_unitario,
          ultimo_movimiento = now(),
          en_transito = false
        where s.id = v_sku_id;
      end if;
    end if;
  end loop;

  select bool_and(coalesce(i.cantidad_recibida, 0) >= i.cantidad_ordenada)
  into v_todos_completos
  from public.items_orden_compra_distribuidor i
  where i.orden_id = p_orden_id;

  update public.ordenes_compra_distribuidor
  set
    estado = case
      when v_todos_completos then 'recibida'::public.estado_orden_compra_distribuidor
      when v_alguno_recibido then 'parcial'::public.estado_orden_compra_distribuidor
      else estado
    end,
    fecha_recepcion = coalesce(fecha_recepcion, current_date),
    updated_at = now()
  where id = p_orden_id
  returning * into v_orden;

  select coalesce(
    sum(
      least(coalesce(i.cantidad_recibida, 0), i.cantidad_ordenada)::numeric
      * i.costo_unitario
    ),
    0
  )
  into v_monto_recibido
  from public.items_orden_compra_distribuidor i
  where i.orden_id = p_orden_id;

  if v_alguno_recibido then
    if exists (
      select 1 from public.cuentas_por_pagar where orden_compra_id = p_orden_id
    ) then
      update public.cuentas_por_pagar
      set
        monto_total = greatest(v_monto_recibido, monto_pagado),
        proveedor_nombre = v_orden.proveedor_nombre
      where orden_compra_id = p_orden_id;
    else
      insert into public.cuentas_por_pagar (
        clerk_id,
        profile_type_v2,
        orden_compra_id,
        proveedor_nombre,
        monto_total
      )
      values (
        v_orden.clerk_id,
        v_orden.profile_type_v2,
        p_orden_id,
        v_orden.proveedor_nombre,
        v_monto_recibido
      );
    end if;
  end if;

  return v_orden;
end;
$$;

create or replace function proof.confirmar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_item record;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_pedido.estado <> 'borrador' then
    raise exception 'Solo borrador puede confirmarse (actual: %)', v_pedido.estado;
  end if;

  if not exists (
    select 1 from public.items_pedido where pedido_id = p_pedido_id
  ) then
    raise exception 'El pedido no tiene productos. Agrega al menos una línea antes de confirmar.';
  end if;

  perform set_config('proof.allow_stock_reservado_mutation', '1', true);

  for v_item in
    select
      ip.sku_id,
      ip.cantidad,
      ip.nombre,
      s.stock_disponible
    from public.items_pedido ip
    join public.skus s on s.id = ip.sku_id
    where ip.pedido_id = p_pedido_id
    for update of s
  loop
    if v_item.cantidad <= 0 then
      raise exception 'Cantidad inválida en línea de pedido';
    end if;

    if v_item.stock_disponible < v_item.cantidad then
      raise exception 'Stock insuficiente para %: disponibles %, pedidas %',
        v_item.nombre, v_item.stock_disponible, v_item.cantidad;
    end if;

    update public.skus s
    set stock_reservado = s.stock_reservado + v_item.cantidad
    where s.id = v_item.sku_id;

    if not found then
      raise exception 'SKU no encontrado';
    end if;
  end loop;

  update public.pedidos
  set estado = 'confirmado', updated_at = now()
  where id = p_pedido_id
  returning * into v_pedido;

  perform proof.recalc_pedido_total(p_pedido_id);
  return v_pedido;
end;
$$;

notify pgrst, 'reload schema';
