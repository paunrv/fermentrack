-- FASE 2 · Bundle 3 — destilador RPCs (Clerk JWT → Supabase Auth)
-- Project: stjnoacbdcjhhucaoqrw · Run ONCE in Supabase SQL Editor
-- Prereq: B1 + B2 applied · proof_profiles con user_id para perfil distiller
-- Verify after: npm run check:fase2-rpcs

begin;

-- -----------------------------------------------------------------------------
-- Helper RLS · owner distilador vía proof_profiles (sin JWT Clerk)
-- -----------------------------------------------------------------------------
create or replace function proof.destilador_row_owned(p_clerk_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.proof_profiles p
      where p.user_id = auth.uid()
        and coalesce(p.is_super_user, false) = true
    )
    or p_clerk_id = auth.uid()::text
    or exists (
      select 1
      from public.proof_profiles p
      where p.user_id = auth.uid()
        and p.profile_type_v2 = 'distiller'
        and (
          p.clerk_id = p_clerk_id
          or p.user_id::text = p_clerk_id
        )
    );
$$;

grant execute on function proof.destilador_row_owned(text)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS destilador · recrear políticas (idempotente si CASCADE las eliminó)
-- -----------------------------------------------------------------------------
do $dest_pol$
declare
  t text;
  tables text[] := array[
    'destilador_sequences',
    'bodegas',
    'viajes',
    'productos_viaje',
    'lotes',
    'corridas_embotellado',
    'stock_botellas_vacias',
    'expresiones_producto',
    'stock_etiquetas',
    'cajas',
    'botellas',
    'pedidos_destilador',
    'items_pedido_destilador'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select using (proof.destilador_row_owned(clerk_id))',
      t, t
    );
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format(
      'create policy %I_insert on public.%I for insert with check (proof.destilador_row_owned(clerk_id))',
      t, t
    );
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format(
      'create policy %I_update on public.%I for update using (proof.destilador_row_owned(clerk_id)) with check (proof.destilador_row_owned(clerk_id))',
      t, t
    );
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format(
      'create policy %I_delete on public.%I for delete using (proof.destilador_row_owned(clerk_id))',
      t, t
    );
  end loop;
end;
$dest_pol$;

drop policy if exists movimientos_inventario_select on public.movimientos_inventario;
create policy movimientos_inventario_select on public.movimientos_inventario
  for select using (proof.destilador_row_owned(clerk_id));

drop policy if exists movimientos_inventario_insert on public.movimientos_inventario;
create policy movimientos_inventario_insert on public.movimientos_inventario
  for insert with check (proof.destilador_row_owned(clerk_id));

drop policy if exists lotes_produccion_select on storage.objects;
create policy lotes_produccion_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  );

drop policy if exists lotes_produccion_insert on storage.objects;
create policy lotes_produccion_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  );

drop policy if exists lotes_produccion_update on storage.objects;
create policy lotes_produccion_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  );

drop policy if exists lotes_produccion_delete on storage.objects;
create policy lotes_produccion_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  );

-- -----------------------------------------------------------------------------
-- dest_next_numero_lote · LOTE-NNN
-- -----------------------------------------------------------------------------

create or replace function proof.dest_next_numero_lote(p_clerk_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_scope_key text;
begin
  if not proof.destilador_row_owned(p_clerk_id) then
    raise exception 'forbidden';
  end if;

  select coalesce(
    (
      select ds.clerk_id
      from public.destilador_sequences ds
      where ds.clerk_id = p_clerk_id
    ),
    (
      select p.clerk_id
      from public.proof_profiles p
      where p.profile_type_v2 = 'distiller'
        and (p.clerk_id = p_clerk_id or p.user_id::text = p_clerk_id)
      limit 1
    ),
    p_clerk_id
  ) into v_scope_key;

  insert into public.destilador_sequences (clerk_id)
  values (v_scope_key)
  on conflict (clerk_id) do nothing;

  update public.destilador_sequences
  set lote_seq = lote_seq + 1, updated_at = now()
  where clerk_id = v_scope_key
  returning lote_seq into v_next;

  return 'LOTE-' || lpad(v_next::text, 3, '0');
end;
$$;

-- -----------------------------------------------------------------------------
-- dest_ensure_bodega_principal
-- -----------------------------------------------------------------------------

create or replace function proof.dest_ensure_bodega_principal(p_clerk_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_scope_key text;
begin
  if not proof.destilador_row_owned(p_clerk_id) then
    raise exception 'forbidden';
  end if;

  select coalesce(
    (
      select p.clerk_id
      from public.proof_profiles p
      where p.profile_type_v2 = 'distiller'
        and (p.clerk_id = p_clerk_id or p.user_id::text = p_clerk_id)
      limit 1
    ),
    p_clerk_id
  ) into v_scope_key;

  select id into v_id
  from public.bodegas
  where clerk_id = v_scope_key
    and tipo = 'principal'
    and es_embotellado = false
  order by created_at
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.bodegas (clerk_id, nombre, ciudad, tipo, es_embotellado)
  values (v_scope_key, 'Bodega principal', '', 'principal', false)
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- confirmar_llegada_destilador
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- cerrar_corrida_destilador
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- public wrappers
-- -----------------------------------------------------------------------------

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
set search_path = public, proof
as $$
  select * from proof.confirmar_llegada_destilador(p_viaje_id, p_lineas);
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
set search_path = public, proof
as $$
  select * from proof.cerrar_corrida_destilador(
    p_corrida_id, p_botellas_producidas, p_botellas_defectuosas
  );
$$;

grant execute on function proof.dest_next_numero_lote(text) to authenticated, service_role;
grant execute on function proof.dest_ensure_bodega_principal(text) to authenticated, service_role;
grant execute on function proof.confirmar_llegada_destilador(uuid, jsonb) to authenticated, service_role;
grant execute on function proof.cerrar_corrida_destilador(uuid, integer, integer) to authenticated, service_role;
grant execute on function public.confirmar_llegada_destilador(uuid, jsonb) to authenticated, service_role;
grant execute on function public.cerrar_corrida_destilador(uuid, integer, integer) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
