-- =============================================================================
-- PROOF · Destilador — confirmar llegada + secuencia LOTE-NNN
-- Requiere: 20250602000000_destilador_mezcal_core.sql
-- =============================================================================

create or replace function proof.dest_next_numero_lote(p_clerk_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if not proof.destilador_row_owned(p_clerk_id) then
    raise exception 'forbidden';
  end if;

  insert into public.destilador_sequences (clerk_id)
  values (p_clerk_id)
  on conflict (clerk_id) do nothing;

  update public.destilador_sequences
  set lote_seq = lote_seq + 1, updated_at = now()
  where clerk_id = p_clerk_id
  returning lote_seq into v_next;

  return 'LOTE-' || lpad(v_next::text, 3, '0');
end;
$$;

create or replace function proof.dest_ensure_bodega_principal(p_clerk_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not proof.destilador_row_owned(p_clerk_id) then
    raise exception 'forbidden';
  end if;

  select id into v_id
  from public.bodegas
  where clerk_id = p_clerk_id
    and tipo = 'principal'
    and es_embotellado = false
  order by created_at
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.bodegas (clerk_id, nombre, ciudad, tipo, es_embotellado)
  values (p_clerk_id, 'Bodega principal', '', 'principal', false)
  returning id into v_id;

  return v_id;
end;
$$;

-- p_lineas: [{ "producto_viaje_id": "uuid", "litros_salida": n, "litros_recibidos": n, "abv": n|null }]
create or replace function proof.confirmar_llegada_destilador(
  p_viaje_id uuid,
  p_lineas jsonb
)
returns table (
  lote_id uuid,
  numero_lote text,
  producto_viaje_id uuid,
  tipo_agave text,
  litros_recibidos numeric,
  flete_proporcional numeric,
  merma_litros numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viaje public.viajes%rowtype;
  v_clerk text;
  v_bodega_id uuid;
  v_total_litros numeric;
  v_elem jsonb;
  v_pv_id uuid;
  v_salida numeric;
  v_recibidos numeric;
  v_abv numeric;
  v_pv public.productos_viaje%rowtype;
  v_flete_prop numeric;
  v_numero text;
  v_lote_id uuid;
  v_merma numeric;
begin
  v_clerk := proof.current_clerk_id();
  if v_clerk is null or v_clerk = '' then
    raise exception 'clerk_id requerido en JWT';
  end if;

  select * into v_viaje
  from public.viajes
  where id = p_viaje_id;

  if not found then
    raise exception 'viaje no encontrado';
  end if;

  if not proof.destilador_row_owned(v_viaje.clerk_id) then
    raise exception 'forbidden';
  end if;

  if v_viaje.estado = 'recibido' then
    raise exception 'el viaje ya fue recibido';
  end if;

  if v_viaje.estado not in ('confirmado', 'en_transito') then
    raise exception 'el viaje debe estar confirmado o en tránsito para recibir';
  end if;

  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'p_lineas debe ser un arreglo no vacío';
  end if;

  select coalesce(sum(litros_acordados), 0) into v_total_litros
  from public.productos_viaje
  where viaje_id = p_viaje_id
    and clerk_id = v_viaje.clerk_id;

  if v_total_litros <= 0 then
    raise exception 'el viaje no tiene litros acordados';
  end if;

  v_bodega_id := proof.dest_ensure_bodega_principal(v_viaje.clerk_id);

  for v_elem in select * from jsonb_array_elements(p_lineas) loop
    v_pv_id := (v_elem ->> 'producto_viaje_id')::uuid;
    v_salida := (v_elem ->> 'litros_salida')::numeric;
    v_recibidos := (v_elem ->> 'litros_recibidos')::numeric;
    v_abv := nullif(v_elem ->> 'abv', '')::numeric;

    if v_pv_id is null or v_salida is null or v_recibidos is null then
      raise exception 'cada línea requiere producto_viaje_id, litros_salida y litros_recibidos';
    end if;

    if v_salida < 0 or v_recibidos < 0 then
      raise exception 'litros no pueden ser negativos';
    end if;

    select * into v_pv
    from public.productos_viaje
    where id = v_pv_id
      and viaje_id = p_viaje_id
      and clerk_id = v_viaje.clerk_id;

    if not found then
      raise exception 'producto_viaje % no pertenece al viaje', v_pv_id;
    end if;

    v_flete_prop := round(
      v_viaje.costo_flete * v_pv.litros_acordados / v_total_litros,
      2
    );

    update public.productos_viaje
    set
      litros_salida = v_salida,
      litros_recibidos = v_recibidos,
      flete_proporcional = v_flete_prop,
      updated_at = now()
    where id = v_pv_id;

    v_merma := v_salida - v_recibidos;
    v_numero := proof.dest_next_numero_lote(v_viaje.clerk_id);

    insert into public.lotes (
      clerk_id,
      numero_lote,
      viaje_id,
      producto_viaje_id,
      tipo_agave,
      maestro,
      comunidad,
      fecha_recepcion,
      abv,
      litros_recibidos,
      litros_disponibles_granel,
      estado,
      bodega_id
    )
    values (
      v_viaje.clerk_id,
      v_numero,
      p_viaje_id,
      v_pv_id,
      v_pv.tipo_agave,
      v_viaje.palenquero_nombre,
      v_viaje.comunidad,
      current_date,
      v_abv,
      v_recibidos,
      v_recibidos,
      'en_bodega_crudo',
      v_bodega_id
    )
    returning id into v_lote_id;

    lote_id := v_lote_id;
    numero_lote := v_numero;
    producto_viaje_id := v_pv_id;
    tipo_agave := v_pv.tipo_agave;
    litros_recibidos := v_recibidos;
    flete_proporcional := v_flete_prop;
    merma_litros := v_merma;
    return next;
  end loop;

  update public.viajes
  set estado = 'recibido', updated_at = now()
  where id = p_viaje_id;
end;
$$;

create or replace function public.confirmar_llegada_destilador(
  p_viaje_id uuid,
  p_lineas jsonb
)
returns table (
  lote_id uuid,
  numero_lote text,
  producto_viaje_id uuid,
  tipo_agave text,
  litros_recibidos numeric,
  flete_proporcional numeric,
  merma_litros numeric
)
language sql
security definer
set search_path = public
as $$
  select *
  from proof.confirmar_llegada_destilador(p_viaje_id, p_lineas);
$$;

grant execute on function public.confirmar_llegada_destilador(uuid, jsonb) to authenticated, service_role;
