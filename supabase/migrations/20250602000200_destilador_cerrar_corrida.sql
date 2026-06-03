-- =============================================================================
-- PROOF · Destilador — cerrar corrida de embotellado
-- =============================================================================

create or replace function proof.cerrar_corrida_destilador(
  p_corrida_id uuid,
  p_botellas_producidas integer,
  p_botellas_defectuosas integer default 0
)
returns table (
  corrida_id uuid,
  lote_id uuid,
  numero_lote text,
  costo_real_por_botella numeric,
  cajas_generadas integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_corrida public.corridas_embotellado%rowtype;
  v_lote public.lotes%rowtype;
  v_pv public.productos_viaje%rowtype;
  v_clerk text;
  v_costo_mezcal numeric;
  v_costo_op numeric;
  v_costo_total numeric;
  v_costo_real numeric;
  v_cajas int;
  v_resto int;
  v_por_caja int := 12;
  v_i int;
  v_qr text;
  v_bodega_emb uuid;
begin
  v_clerk := proof.current_clerk_id();
  if v_clerk is null or v_clerk = '' then
    raise exception 'clerk_id requerido en JWT';
  end if;

  select * into v_corrida from public.corridas_embotellado where id = p_corrida_id;
  if not found then raise exception 'corrida no encontrada'; end if;
  if not proof.destilador_row_owned(v_corrida.clerk_id) then raise exception 'forbidden'; end if;
  if v_corrida.estado <> 'activa' then raise exception 'la corrida no está activa'; end if;
  if p_botellas_producidas < 0 or p_botellas_defectuosas < 0 then
    raise exception 'botellas inválidas';
  end if;

  select * into v_lote from public.lotes where id = v_corrida.lote_id;
  select * into v_pv from public.productos_viaje where id = v_lote.producto_viaje_id;

  v_costo_mezcal := 0;
  if v_pv.litros_recibidos > 0 then
    v_costo_mezcal := (
      v_pv.precio_por_litro
      + coalesce(v_pv.flete_proporcional, 0) / v_pv.litros_recibidos
    ) * (p_botellas_producidas * public.dest_formato_litros(v_corrida.formato_botella));
  end if;

  if v_corrida.modo = 'equipo' then
    v_costo_op := coalesce(v_corrida.costo_corrida, 0);
  else
    v_costo_op := coalesce(v_corrida.personas, 1)
      * coalesce(v_corrida.horas_reales, v_corrida.horas_estimadas, 0)
      * coalesce(v_corrida.tarifa_hora, 0);
  end if;

  v_costo_total := v_costo_mezcal + v_costo_op;
  v_costo_real := case
    when p_botellas_producidas > 0 then round(v_costo_total / p_botellas_producidas, 4)
    else null
  end;

  update public.corridas_embotellado
  set
    botellas_producidas = p_botellas_producidas,
    botellas_defectuosas = p_botellas_defectuosas,
    costo_real_por_botella = v_costo_real,
    estado = 'completada',
    updated_at = now()
  where id = p_corrida_id;

  update public.stock_botellas_vacias
  set
    cantidad_disponible = greatest(cantidad_disponible - p_botellas_producidas - p_botellas_defectuosas, 0),
    updated_at = now()
  where clerk_id = v_corrida.clerk_id
    and bodega_id = v_corrida.bodega_id
    and formato = v_corrida.formato_botella;

  select id into v_bodega_emb
  from public.bodegas
  where clerk_id = v_corrida.clerk_id and es_embotellado = true
  limit 1;
  if v_bodega_emb is null then
    v_bodega_emb := v_corrida.bodega_id;
  end if;

  v_cajas := ceil(p_botellas_producidas::numeric / v_por_caja);
  v_resto := p_botellas_producidas;

  for v_i in 1..greatest(v_cajas, 0) loop
    v_qr := 'CAJA-' || replace(gen_random_uuid()::text, '-', '');
    insert into public.cajas (
      clerk_id, codigo_qr, lote_id, corrida_id, formato_botella,
      cantidad_botellas, bodega_id, estado
    )
    values (
      v_corrida.clerk_id,
      v_qr,
      v_corrida.lote_id,
      p_corrida_id,
      v_corrida.formato_botella,
      least(v_por_caja, v_resto),
      v_bodega_emb,
      'en_bodega'
    );
    v_resto := v_resto - v_por_caja;
  end loop;

  update public.lotes
  set
    estado = case
      when litros_disponibles_granel <= 0 then 'terminado'::public.dest_lote_estado
      else 'vendido_parcial'::public.dest_lote_estado
    end,
    updated_at = now()
  where id = v_corrida.lote_id;

  corrida_id := p_corrida_id;
  lote_id := v_corrida.lote_id;
  numero_lote := v_lote.numero_lote;
  costo_real_por_botella := v_costo_real;
  cajas_generadas := greatest(v_cajas, 0);
  return next;
end;
$$;

create or replace function public.cerrar_corrida_destilador(
  p_corrida_id uuid,
  p_botellas_producidas integer,
  p_botellas_defectuosas integer default 0
)
returns table (
  corrida_id uuid,
  lote_id uuid,
  numero_lote text,
  costo_real_por_botella numeric,
  cajas_generadas integer
)
language sql
security definer
set search_path = public
as $$
  select * from proof.cerrar_corrida_destilador(
    p_corrida_id, p_botellas_producidas, p_botellas_defectuosas
  );
$$;

grant execute on function public.cerrar_corrida_destilador(uuid, integer, integer) to authenticated, service_role;
