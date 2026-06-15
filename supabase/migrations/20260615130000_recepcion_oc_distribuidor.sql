-- PROOF · Recepción foto ↔ OC distribuidor (unificación aditiva)

alter table public.recepciones
  add column if not exists orden_compra_distribuidor_id uuid
    references public.ordenes_compra_distribuidor(id) on delete set null;

create index if not exists recepciones_orden_compra_distribuidor_id_idx
  on public.recepciones (orden_compra_distribuidor_id);

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

  if not proof.row_belongs_to_requester(v_rec.clerk_id, v_rec.profile_type_v2) then
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
      skus_asociados, clerk_id, profile_type_v2
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
      v_rec.clerk_id,
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

notify pgrst, 'reload schema';
