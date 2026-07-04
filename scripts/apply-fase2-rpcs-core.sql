-- FASE 2 · Bundle 1 — RPCs core distribuidor (Clerk auth → Supabase Auth)
-- Project: stjnoacbdcjhhucaoqrw · Run ONCE in Supabase SQL Editor
-- Prereqs: user_id populated on pedidos/recepciones/skus/ordenes_compra_distribuidor;
--          proof.auth_has_staff_access_to_scope(text, text) exists (Clerk→Auth fase 1)
-- Verify after: npm run check:fase2-rpcs

begin;

-- -----------------------------------------------------------------------------
-- Staff helper · overload (uuid, text) — prod has (text, text) from fase 1
-- -----------------------------------------------------------------------------
create or replace function proof.auth_has_staff_access_to_scope(
  p_scope_user_id uuid,
  p_profile_type_v2 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trabajadores t
    where t.user_id = auth.uid()
      and t.profile_type_v2 = p_profile_type_v2
      and t.activo = true
      and (
        (t.rol = 'patron' and t.user_id = p_scope_user_id)
        or (
          t.rol <> 'patron'
          and exists (
            select 1
            from public.trabajadores p
            where p.rol = 'patron'
              and p.user_id = p_scope_user_id
              and p.clerk_id = t.clerk_id
              and p.profile_type_v2 = t.profile_type_v2
          )
        )
      )
  );
$$;

grant execute on function proof.auth_has_staff_access_to_scope(uuid, text)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Helper: owner or staff on scope
-- -----------------------------------------------------------------------------
create or replace function proof.auth_can_access_scope(
  p_scope_user_id uuid,
  p_profile_type_v2 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_scope_user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(p_scope_user_id, p_profile_type_v2);
$$;

grant execute on function proof.auth_can_access_scope(uuid, text)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Pedidos · confirmar / avanzar / entregar / remisión / CxC anticipo
-- -----------------------------------------------------------------------------

create or replace function proof.aplicar_anticipo_cxc_pedido(p_pedido_id uuid)
returns public.cuentas_por_cobrar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_cliente text;
  v_cuenta public.cuentas_por_cobrar%rowtype;
  v_monto numeric(12, 2);
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id;
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.auth_can_access_scope(v_pedido.user_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if not coalesce(v_pedido.anticipo, false) or coalesce(v_pedido.anticipo_monto, 0) <= 0 then
    return null;
  end if;

  if coalesce(v_pedido.total, 0) <= 0 then
    return null;
  end if;

  select * into v_cuenta
  from public.cuentas_por_cobrar
  where pedido_id = p_pedido_id;

  if found then
    return v_cuenta;
  end if;

  select c.name into v_cliente
  from public.clients c
  where c.id = v_pedido.clients_id;

  v_monto := least(v_pedido.anticipo_monto, v_pedido.total);

  insert into public.cuentas_por_cobrar (
    user_id,
    clerk_id,
    profile_type_v2,
    pedido_id,
    cliente_nombre,
    monto_total,
    monto_pagado,
    fecha_vencimiento
  )
  values (
    v_pedido.user_id,
    coalesce(v_pedido.clerk_id, v_pedido.user_id::text),
    v_pedido.profile_type_v2,
    p_pedido_id,
    coalesce(v_cliente, 'Cliente'),
    v_pedido.total,
    v_monto,
    v_pedido.fecha_entrega + proof.dias_credito_condicion(v_pedido.condicion_pago)
  )
  returning * into v_cuenta;

  insert into public.pagos_cliente (
    user_id,
    clerk_id,
    profile_type_v2,
    cuenta_por_cobrar_id,
    monto,
    metodo,
    nota,
    fecha_pago
  )
  values (
    v_cuenta.user_id,
    coalesce(v_cuenta.clerk_id, v_cuenta.user_id::text),
    v_cuenta.profile_type_v2,
    v_cuenta.id,
    v_monto,
    'efectivo'::public.metodo_pago_cliente,
    'Anticipo al confirmar pedido ' || v_pedido.numero,
    current_date
  );

  return v_cuenta;
end;
$$;

create or replace function proof.crear_cuenta_por_cobrar_pedido(p_pedido_id uuid)
returns public.cuentas_por_cobrar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_cliente text;
  v_dias integer;
  v_cuenta public.cuentas_por_cobrar%rowtype;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id;
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.auth_can_access_scope(v_pedido.user_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_pedido.estado not in ('entregado', 'parcial') then
    raise exception 'Pedido % no está entregado', v_pedido.numero;
  end if;

  select c.name into v_cliente
  from public.clients c
  where c.id = v_pedido.clients_id;

  select * into v_cuenta
  from public.cuentas_por_cobrar
  where pedido_id = p_pedido_id;

  if found then
    if v_cuenta.monto_total is distinct from v_pedido.total and coalesce(v_pedido.total, 0) > 0 then
      update public.cuentas_por_cobrar
      set monto_total = v_pedido.total, updated_at = now()
      where id = v_cuenta.id
      returning * into v_cuenta;
    end if;
    return v_cuenta;
  end if;

  if coalesce(v_pedido.total, 0) <= 0 then
    raise exception 'Pedido % sin monto a cobrar', v_pedido.numero;
  end if;

  v_dias := proof.dias_credito_condicion(v_pedido.condicion_pago);

  insert into public.cuentas_por_cobrar (
    user_id,
    clerk_id,
    profile_type_v2,
    pedido_id,
    cliente_nombre,
    monto_total,
    fecha_vencimiento
  )
  values (
    v_pedido.user_id,
    coalesce(v_pedido.clerk_id, v_pedido.user_id::text),
    v_pedido.profile_type_v2,
    p_pedido_id,
    coalesce(v_cliente, 'Cliente'),
    v_pedido.total,
    v_pedido.fecha_entrega + v_dias
  )
  returning * into v_cuenta;

  return v_cuenta;
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

  if not proof.auth_can_access_scope(v_pedido.user_id, v_pedido.profile_type_v2) then
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

  select * into v_pedido from public.pedidos where id = p_pedido_id;

  if coalesce(v_pedido.anticipo, false) and coalesce(v_pedido.anticipo_monto, 0) > 0 then
    perform proof.aplicar_anticipo_cxc_pedido(p_pedido_id);
  end if;

  return v_pedido;
end;
$$;

create or replace function proof.actualizar_estado_pedido(
  p_pedido_id uuid,
  p_estado public.estado_pedido
)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
begin
  if p_estado not in ('preparando', 'en_ruta') then
    raise exception 'Solo se puede avanzar a preparando o en_ruta (recibido: %)', p_estado;
  end if;

  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id
  for update;

  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.auth_can_access_scope(v_pedido.user_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if p_estado = 'preparando' and v_pedido.estado not in ('confirmado', 'parcial') then
    raise exception 'Solo confirmado o parcial puede pasar a preparando (actual: %)', v_pedido.estado;
  end if;

  if p_estado = 'en_ruta' and v_pedido.estado not in ('confirmado', 'preparando', 'parcial') then
    raise exception 'Solo confirmado, preparando o parcial puede pasar a en_ruta (actual: %)', v_pedido.estado;
  end if;

  update public.pedidos
  set estado = p_estado, updated_at = now()
  where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

create or replace function proof.crear_remision_distribuidor(p_pedido_id uuid)
returns public.remisiones_distribuidor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_existing public.remisiones_distribuidor%rowtype;
  v_numero text;
  v_row public.remisiones_distribuidor%rowtype;
begin
  select * into v_existing
  from public.remisiones_distribuidor
  where pedido_id = p_pedido_id;

  if found then
    return v_existing;
  end if;

  select * into v_pedido from public.pedidos where id = p_pedido_id;
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.auth_can_access_scope(v_pedido.user_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_pedido.estado not in ('entregado', 'parcial') then
    raise exception 'Solo pedidos entregados generan remisión (actual: %)', v_pedido.estado;
  end if;

  v_numero := proof.next_codigo(
    coalesce(v_pedido.clerk_id, v_pedido.user_id::text),
    v_pedido.profile_type_v2,
    'rem'
  );

  insert into public.remisiones_distribuidor (
    user_id,
    clerk_id,
    profile_type_v2,
    pedido_id,
    numero_remision,
    fecha_entrega
  )
  values (
    v_pedido.user_id,
    coalesce(v_pedido.clerk_id, v_pedido.user_id::text),
    v_pedido.profile_type_v2,
    v_pedido.id,
    v_numero,
    v_pedido.fecha_entrega
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function proof.entregar_pedido(p_pedido_id uuid, p_parcial boolean default false)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_item record;
  v_nuevo_estado public.estado_pedido;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido no encontrado: %', p_pedido_id; end if;

  if not proof.auth_can_access_scope(v_pedido.user_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_pedido.estado not in ('confirmado', 'preparando', 'en_ruta', 'parcial') then
    raise exception 'Estado inválido para entrega: %', v_pedido.estado;
  end if;

  v_nuevo_estado := case when p_parcial then 'parcial'::public.estado_pedido else 'entregado'::public.estado_pedido end;
  perform set_config('proof.allow_stock_reservado_mutation', '1', true);

  for v_item in select ip.sku_id, ip.cantidad from public.items_pedido ip where ip.pedido_id = p_pedido_id loop
    update public.skus s
    set
      stock_total = greatest(0, s.stock_total - v_item.cantidad),
      stock_reservado = greatest(0, s.stock_reservado - v_item.cantidad)
    where s.id = v_item.sku_id;
  end loop;

  update public.pedidos set estado = v_nuevo_estado, updated_at = now() where id = p_pedido_id returning * into v_pedido;

  if v_nuevo_estado = 'entregado' then
    perform proof.crear_remision_distribuidor(p_pedido_id);
  end if;

  return v_pedido;
end;
$$;

-- -----------------------------------------------------------------------------
-- Recepciones · OC distribuidor + confirmar_recepcion
-- -----------------------------------------------------------------------------

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

  if not proof.auth_can_access_scope(v_orden.user_id, v_orden.profile_type_v2) then
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
        where s.profile_type_v2 = v_orden.profile_type_v2
          and (
            s.user_id = v_orden.user_id
            or s.clerk_id = coalesce(v_orden.clerk_id, v_orden.user_id::text)
          )
          and lower(trim(s.nombre)) = lower(trim(v_item.producto_nombre))
        order by s.created_at desc
        limit 1;

        if v_sku_id is null then
          v_codigo := proof.next_codigo(
            coalesce(v_orden.clerk_id, v_orden.user_id::text),
            v_orden.profile_type_v2,
            'sku'
          );
          insert into public.skus (
            codigo, nombre, productor, costo_unitario, stock_total,
            user_id, clerk_id, profile_type_v2, ultimo_movimiento
          )
          values (
            v_codigo,
            v_item.producto_nombre,
            v_orden.proveedor_nombre,
            v_item.costo_unitario,
            v_delta,
            v_orden.user_id,
            coalesce(v_orden.clerk_id, v_orden.user_id::text),
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
        user_id,
        clerk_id,
        profile_type_v2,
        orden_compra_id,
        proveedor_nombre,
        monto_total
      )
      values (
        v_orden.user_id,
        coalesce(v_orden.clerk_id, v_orden.user_id::text),
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

create or replace function proof.confirmar_recepcion(
  p_recepcion_id uuid,
  p_registrar_deuda boolean default true
)
returns public.recepciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.recepciones%rowtype;
  v_item record;
  v_deuda_id uuid;
  v_oc_tiene_discrep boolean;
  v_oc_item record;
  v_recibido integer;
  v_lineas jsonb := '[]'::jsonb;
  v_nueva integer;
begin
  select * into v_rec from public.recepciones where id = p_recepcion_id for update;
  if not found then
    raise exception 'Recepción no encontrada: %', p_recepcion_id;
  end if;

  if not proof.auth_can_access_scope(v_rec.user_id, v_rec.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_rec.estado = 'confirmada' then
    return v_rec;
  end if;

  if v_rec.orden_compra_distribuidor_id is not null then
    for v_oc_item in
      select
        i.id,
        i.sku_id,
        i.producto_nombre,
        coalesce(i.cantidad_recibida, 0) as prev_rec
      from public.items_orden_compra_distribuidor i
      where i.orden_id = v_rec.orden_compra_distribuidor_id
    loop
      select coalesce(sum(ir.cantidad_recibida), 0) into v_recibido
      from public.items_recepcion ir
      left join public.skus s on s.id = ir.sku_id
      where ir.recepcion_id = p_recepcion_id
        and ir.cantidad_recibida > 0
        and (
          (v_oc_item.sku_id is not null and ir.sku_id = v_oc_item.sku_id)
          or lower(trim(coalesce(s.nombre, ''))) = lower(trim(v_oc_item.producto_nombre))
        );

      if v_recibido > 0 then
        v_nueva := v_oc_item.prev_rec + v_recibido;
        v_lineas := v_lineas || jsonb_build_array(
          jsonb_build_object(
            'item_id', v_oc_item.id,
            'cantidad_recibida', v_nueva
          )
        );
      end if;
    end loop;

    if jsonb_array_length(v_lineas) > 0 then
      perform proof.confirmar_llegada_orden_compra_distribuidor(
        v_rec.orden_compra_distribuidor_id,
        v_lineas
      );
    end if;
  else
    for v_item in
      select ir.sku_id, ir.cantidad_recibida, ir.lote, ir.condicion
      from public.items_recepcion ir
      where ir.recepcion_id = p_recepcion_id
        and ir.sku_id is not null
        and ir.cantidad_recibida > 0
    loop
      update public.skus s
      set
        stock_total = s.stock_total + v_item.cantidad_recibida,
        lote = case when v_item.lote <> '' then v_item.lote else s.lote end,
        ultimo_movimiento = now(),
        en_transito = false
      where s.id = v_item.sku_id;
    end loop;
  end if;

  if
    p_registrar_deuda
    and v_rec.deuda_registrada > 0
    and v_rec.orden_compra_distribuidor_id is null
  then
    insert into public.deudas_productores (
      productor, monto, tipo, fecha_vencimiento, estado,
      skus_asociados, user_id, clerk_id, profile_type_v2
    )
    values (
      v_rec.productor,
      v_rec.deuda_registrada,
      'credito',
      current_date + 30,
      'al_corriente',
      coalesce((
        select array_agg(distinct ir.sku_id) filter (where ir.sku_id is not null)
        from public.items_recepcion ir
        where ir.recepcion_id = p_recepcion_id
      ), '{}'),
      v_rec.user_id,
      coalesce(v_rec.clerk_id, v_rec.user_id::text),
      v_rec.profile_type_v2
    )
    returning id into v_deuda_id;
  end if;

  update public.recepciones
  set
    estado = case
      when exists (
        select 1 from public.discrepancias d where d.recepcion_id = p_recepcion_id
      ) then 'con_discrepancias'::public.estado_recepcion
      else 'confirmada'::public.estado_recepcion
    end,
    updated_at = now()
  where id = p_recepcion_id
  returning * into v_rec;

  if v_rec.orden_compra_id is not null then
    select exists (
      select 1
      from public.items_orden_compra ioc
      left join public.items_recepcion ir
        on ir.recepcion_id = p_recepcion_id and ir.sku_id = ioc.sku_id
      where ioc.orden_compra_id = v_rec.orden_compra_id
        and coalesce(ir.cantidad_recibida, 0) <> ioc.cantidad_esperada
    ) into v_oc_tiene_discrep;

    update public.ordenes_compra
    set
      estado = case
        when v_oc_tiene_discrep then 'parcial'::public.estado_orden_compra
        else 'recibida'::public.estado_orden_compra
      end,
      updated_at = now()
    where id = v_rec.orden_compra_id
      and estado in ('borrador', 'enviada', 'parcial');
  end if;

  return v_rec;
end;
$$;

-- -----------------------------------------------------------------------------
-- registrar_movimiento_sku · auth fix (M3)
-- -----------------------------------------------------------------------------

create or replace function public.registrar_movimiento_sku(
  p_sku_id uuid,
  p_tipo text,
  p_cantidad integer,
  p_fecha date default current_date,
  p_notas text default null,
  p_client_id uuid default null,
  p_recipient text default null,
  p_reason text default null,
  p_event text default null,
  p_precio_unitario numeric default null,
  p_total numeric default null,
  p_moneda text default null,
  p_dist_movement_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, proof
as $func$
declare
  v_sku public.skus%rowtype;
  v_disponible integer;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'cantidad debe ser > 0';
  end if;

  if p_tipo not in ('entrada', 'venta', 'donacion', 'merma', 'muestra') then
    raise exception 'tipo inválido: %', p_tipo;
  end if;

  select * into v_sku from public.skus where id = p_sku_id for update;
  if not found then
    raise exception 'SKU no encontrado: %', p_sku_id;
  end if;

  if not proof.auth_can_access_scope(v_sku.user_id, v_sku.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  v_disponible := v_sku.stock_total - v_sku.stock_reservado;

  if p_tipo <> 'entrada' and p_cantidad > v_disponible then
    raise exception 'Stock insuficiente: disponible %, solicitado %', v_disponible, p_cantidad;
  end if;

  if p_dist_movement_id is not null then
    if exists (
      select 1 from public.movimientos_sku m where m.dist_movement_id = p_dist_movement_id
    ) then
      raise exception 'dist_movement_id ya registrado: %', p_dist_movement_id;
    end if;
  end if;

  insert into public.movimientos_sku (
    sku_id,
    tipo,
    cantidad,
    fecha,
    notas,
    client_id,
    recipient,
    reason,
    event,
    precio_unitario,
    total,
    moneda,
    dist_movement_id,
    user_id,
    clerk_id,
    profile_type_v2
  )
  values (
    p_sku_id,
    p_tipo,
    p_cantidad,
    coalesce(p_fecha, current_date),
    p_notas,
    p_client_id,
    p_recipient,
    p_reason,
    p_event,
    p_precio_unitario,
    p_total,
    p_moneda,
    p_dist_movement_id,
    v_sku.user_id,
    coalesce(v_sku.clerk_id, v_sku.user_id::text),
    v_sku.profile_type_v2
  );

  if p_tipo = 'entrada' then
    update public.skus s
    set
      stock_total = s.stock_total + p_cantidad,
      ultimo_movimiento = now(),
      updated_at = now()
    where s.id = p_sku_id;
  else
    update public.skus s
    set
      stock_total = greatest(0, s.stock_total - p_cantidad),
      ultimo_movimiento = now(),
      updated_at = now()
    where s.id = p_sku_id;
  end if;

  perform proof.refresh_sku_estado(p_sku_id);
end;
$func$;

-- -----------------------------------------------------------------------------
-- public wrappers
-- -----------------------------------------------------------------------------

create or replace function public.confirmar_pedido(p_pedido_id uuid)
returns public.pedidos
language sql security definer set search_path = public, proof
as $$ select proof.confirmar_pedido(p_pedido_id); $$;

create or replace function public.actualizar_estado_pedido(
  p_pedido_id uuid,
  p_estado public.estado_pedido
)
returns public.pedidos
language sql security definer set search_path = public, proof
as $$ select proof.actualizar_estado_pedido(p_pedido_id, p_estado); $$;

create or replace function public.entregar_pedido(p_pedido_id uuid, p_parcial boolean default false)
returns public.pedidos
language sql security definer set search_path = public, proof
as $$ select proof.entregar_pedido(p_pedido_id, p_parcial); $$;

create or replace function public.crear_remision_distribuidor(p_pedido_id uuid)
returns public.remisiones_distribuidor
language sql security definer set search_path = public, proof
as $$ select proof.crear_remision_distribuidor(p_pedido_id); $$;

create or replace function public.crear_cuenta_por_cobrar_pedido(p_pedido_id uuid)
returns public.cuentas_por_cobrar
language sql security definer set search_path = public, proof
as $$ select proof.crear_cuenta_por_cobrar_pedido(p_pedido_id); $$;

create or replace function public.confirmar_recepcion(
  p_recepcion_id uuid,
  p_registrar_deuda boolean default true
)
returns public.recepciones
language sql security definer set search_path = public, proof
as $$ select proof.confirmar_recepcion(p_recepcion_id, p_registrar_deuda); $$;

create or replace function public.confirmar_llegada_orden_compra_distribuidor(
  p_orden_id uuid,
  p_lineas jsonb
)
returns public.ordenes_compra_distribuidor
language sql security definer set search_path = public, proof
as $$ select proof.confirmar_llegada_orden_compra_distribuidor(p_orden_id, p_lineas); $$;

grant execute on function proof.auth_can_access_scope(uuid, text) to authenticated, service_role;
grant execute on function proof.confirmar_pedido(uuid) to authenticated, service_role;
grant execute on function proof.actualizar_estado_pedido(uuid, public.estado_pedido) to authenticated, service_role;
grant execute on function proof.entregar_pedido(uuid, boolean) to authenticated, service_role;
grant execute on function proof.crear_remision_distribuidor(uuid) to authenticated, service_role;
grant execute on function proof.aplicar_anticipo_cxc_pedido(uuid) to authenticated, service_role;
grant execute on function proof.crear_cuenta_por_cobrar_pedido(uuid) to authenticated, service_role;
grant execute on function proof.confirmar_recepcion(uuid, boolean) to authenticated, service_role;
grant execute on function proof.confirmar_llegada_orden_compra_distribuidor(uuid, jsonb) to authenticated, service_role;

grant execute on function public.confirmar_pedido(uuid) to authenticated, service_role;
grant execute on function public.actualizar_estado_pedido(uuid, public.estado_pedido) to authenticated, service_role;
grant execute on function public.entregar_pedido(uuid, boolean) to authenticated, service_role;
grant execute on function public.crear_remision_distribuidor(uuid) to authenticated, service_role;
grant execute on function public.crear_cuenta_por_cobrar_pedido(uuid) to authenticated, service_role;
grant execute on function public.confirmar_recepcion(uuid, boolean) to authenticated, service_role;
grant execute on function public.confirmar_llegada_orden_compra_distribuidor(uuid, jsonb) to authenticated, service_role;
grant execute on function public.registrar_movimiento_sku(
  uuid, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
