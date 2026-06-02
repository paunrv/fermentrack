-- M3 · RPC registrar movimiento SKU (stock + ledger atómico)
-- Entradas suman stock_total; salidas restan. Respeta stock_reservado vía stock_disponible.
-- p_sku_id text: paridad con skus.id en producción (text, no uuid).
-- Función en public (PostgREST / supabase-js .rpc); helpers proof con schema calificado.
-- Retorno void: éxito silencioso; errores vía exception.

drop function if exists proof.registrar_movimiento_sku(uuid, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid);
drop function if exists proof.registrar_movimiento_sku(text, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid);
drop function if exists public.registrar_movimiento_sku(uuid, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid);
drop function if exists public.registrar_movimiento_sku(text, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid);

create or replace function public.registrar_movimiento_sku(
  p_sku_id text,
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

  if not proof.row_belongs_to_requester(v_sku.clerk_id, v_sku.profile_type_v2) then
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
    v_sku.clerk_id,
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

grant execute on function public.registrar_movimiento_sku(
  text, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid
) to authenticated, service_role;
