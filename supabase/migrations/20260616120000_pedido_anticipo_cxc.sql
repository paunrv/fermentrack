-- PROOF · Anticipo en pedido → CxC al confirmar (aditivo)

alter table public.pedidos
  add column if not exists anticipo_monto numeric(12, 2) check (anticipo_monto is null or anticipo_monto >= 0);

-- anticipo / "anticipo $500" → vence al entregar (0 días crédito extra)
create or replace function proof.dias_credito_condicion(p_condicion text)
returns integer
language plpgsql
immutable
as $$
declare
  v_norm text;
  v_match text[];
begin
  v_norm := lower(trim(coalesce(p_condicion, 'contado')));
  if v_norm like 'anticipo%' then
    return 0;
  end if;
  if v_norm in ('contado', 'anticipo', 'contra_entrega') then
    return 0;
  end if;
  v_match := regexp_match(v_norm, '^(\d+)_dias$');
  if v_match is not null then
    return v_match[1]::integer;
  end if;
  v_match := regexp_match(v_norm, '(\d+)\s*d[ií]as?');
  if v_match is not null then
    return v_match[1]::integer;
  end if;
  return 0;
end;
$$;

-- CxC con anticipo cobrado al confirmar pedido (idempotente)
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

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
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
    clerk_id,
    profile_type_v2,
    pedido_id,
    cliente_nombre,
    monto_total,
    monto_pagado,
    fecha_vencimiento
  )
  values (
    v_pedido.clerk_id,
    v_pedido.profile_type_v2,
    p_pedido_id,
    coalesce(v_cliente, 'Cliente'),
    v_pedido.total,
    v_monto,
    v_pedido.fecha_entrega + proof.dias_credito_condicion(v_pedido.condicion_pago)
  )
  returning * into v_cuenta;

  insert into public.pagos_cliente (
    clerk_id,
    profile_type_v2,
    cuenta_por_cobrar_id,
    monto,
    metodo,
    nota,
    fecha_pago
  )
  values (
    v_cuenta.clerk_id,
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

create or replace function public.aplicar_anticipo_cxc_pedido(p_pedido_id uuid)
returns public.cuentas_por_cobrar
language sql
security definer
set search_path = public, proof
as $$
  select proof.aplicar_anticipo_cxc_pedido(p_pedido_id);
$$;

grant execute on function public.aplicar_anticipo_cxc_pedido(uuid)
  to authenticated, service_role;

-- Al entregar: si ya existe CxC por anticipo, sincronizar monto_total
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

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
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
    clerk_id,
    profile_type_v2,
    pedido_id,
    cliente_nombre,
    monto_total,
    fecha_vencimiento
  )
  values (
    v_pedido.clerk_id,
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

  select * into v_pedido from public.pedidos where id = p_pedido_id;

  if coalesce(v_pedido.anticipo, false) and coalesce(v_pedido.anticipo_monto, 0) > 0 then
    perform proof.aplicar_anticipo_cxc_pedido(p_pedido_id);
  end if;

  return v_pedido;
end;
$$;

notify pgrst, 'reload schema';
