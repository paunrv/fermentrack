-- Triggers bodega · salida y entrega de cajas
-- Depende: cajas_distribuidor, eventos_caja, movimientos_stock, pedidos, clientes, pagos, pagos_pedidos

-- -----------------------------------------------------------------------------
-- Helper · cantidad negativa de salida por SKU
-- -----------------------------------------------------------------------------
create or replace function proof.sku_salida_cantidad(p_sku_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_unidades integer;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'skus'
      and column_name = 'unidades_por_caja'
  ) then
    execute
      'select unidades_por_caja from public.skus where id = $1'
      into v_unidades
      using p_sku_id;
    return -coalesce(v_unidades, 1);
  end if;

  return -1;
end;
$$;

-- -----------------------------------------------------------------------------
-- TRIGGER 1 · salida_bodega → caja en_camino + movimiento venta
-- -----------------------------------------------------------------------------
create or replace function proof.trg_evento_caja_salida_bodega()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caja public.cajas_distribuidor%rowtype;
  v_cantidad integer;
begin
  select * into v_caja
  from public.cajas_distribuidor
  where id = new.caja_id;

  if not found then
    raise exception 'Caja no encontrada: %', new.caja_id;
  end if;

  update public.cajas_distribuidor
  set estado = 'en_camino'
  where id = new.caja_id;

  v_cantidad := proof.sku_salida_cantidad(v_caja.sku_id);

  insert into public.movimientos_stock (
    sku_id,
    tipo,
    cantidad,
    pedido_id,
    trabajador_id,
    clerk_id,
    profile_type_v2
  )
  values (
    v_caja.sku_id,
    'venta',
    v_cantidad,
    new.pedido_id,
    new.trabajador_id,
    v_caja.clerk_id,
    v_caja.profile_type_v2
  );

  return new;
end;
$$;

drop trigger if exists on_evento_caja_salida_bodega on public.eventos_caja;
create trigger on_evento_caja_salida_bodega
  after insert on public.eventos_caja
  for each row
  when (new.tipo = 'salida_bodega')
  execute function proof.trg_evento_caja_salida_bodega();

-- -----------------------------------------------------------------------------
-- TRIGGER 2 · entrega → caja entregado · pedido · pago crédito
-- -----------------------------------------------------------------------------
create or replace function proof.trg_evento_caja_entrega()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_dias_credito integer;
  v_pago_id uuid;
  v_todas_entregadas boolean;
begin
  update public.cajas_distribuidor
  set estado = 'entregado'
  where id = new.caja_id;

  if new.pedido_id is null then
    return new;
  end if;

  select not exists (
    select 1
    from (
      select distinct ec.caja_id
      from public.eventos_caja ec
      where ec.pedido_id = new.pedido_id
        and ec.tipo in ('salida_bodega', 'entrega')
    ) pc
    join public.cajas_distribuidor c on c.id = pc.caja_id
    where c.estado <> 'entregado'
  ) into v_todas_entregadas;

  if not coalesce(v_todas_entregadas, false) then
    return new;
  end if;

  select * into v_pedido
  from public.pedidos
  where id = new.pedido_id;

  if not found then
    return new;
  end if;

  update public.pedidos
  set
    estado = 'entregado',
    updated_at = now()
  where id = new.pedido_id
    and estado in ('confirmado', 'preparando', 'en_ruta', 'parcial');

  if v_pedido.cliente_id is null then
    return new;
  end if;

  select c.dias_credito into v_dias_credito
  from public.clientes c
  where c.id = v_pedido.cliente_id;

  if exists (
    select 1
    from public.pagos_pedidos pp
    where pp.pedido_id = new.pedido_id
  ) then
    return new;
  end if;

  insert into public.pagos (
    cliente_id,
    monto,
    fecha_pago,
    fecha_vencimiento,
    estado,
    clerk_id,
    profile_type_v2
  )
  values (
    v_pedido.cliente_id,
    v_pedido.total,
    current_date,
    case
      when coalesce(v_dias_credito, 0) > 0 then current_date + v_dias_credito
      else null
    end,
    case
      when coalesce(v_dias_credito, 0) > 0 then 'pendiente'
      else 'pagado'
    end,
    v_pedido.clerk_id,
    v_pedido.profile_type_v2
  )
  returning id into v_pago_id;

  insert into public.pagos_pedidos (
    pago_id,
    pedido_id,
    monto_aplicado
  )
  values (
    v_pago_id,
    new.pedido_id,
    v_pedido.total
  );

  return new;
end;
$$;

drop trigger if exists on_evento_caja_entrega on public.eventos_caja;
create trigger on_evento_caja_entrega
  after insert on public.eventos_caja
  for each row
  when (new.tipo = 'entrega')
  execute function proof.trg_evento_caja_entrega();

grant execute on function proof.sku_salida_cantidad(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
