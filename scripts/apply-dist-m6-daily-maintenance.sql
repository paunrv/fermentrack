-- M6 · run_daily_maintenance: rotación 30d desde movimientos_sku (no dist_movements)
-- Project: stjnoacbdcjhhucaoqrw · Run ONCE in SQL Editor after M2+M3
-- Requiere tabla movimientos_sku. Safe to re-run (create or replace).

begin;

create or replace function proof.run_daily_maintenance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SKUs: días sin movimiento
  update public.skus s
  set
    dias_sin_movimiento = case
      when s.ultimo_movimiento is null then 999
      else greatest(0, (current_date - (s.ultimo_movimiento at time zone 'UTC')::date))
    end,
    updated_at = now();

  -- SKUs: rotación 30d desde ledger movimientos_sku (botellas)
  update public.skus s
  set rotacion_30d = sub.rotacion
  from (
    select
      sk.id,
      case
        when coalesce(m.out_30d, 0) = 0 then 'ninguna'::public.rotacion_30d
        when m.out_30d >= sk.stock_total * 2 then 'muy_alta'::public.rotacion_30d
        when m.out_30d >= sk.stock_total then 'alta'::public.rotacion_30d
        when m.out_30d >= sk.stock_total * 0.3 then 'media'::public.rotacion_30d
        when m.out_30d >= sk.stock_total * 0.1 then 'baja'::public.rotacion_30d
        else 'ninguna'::public.rotacion_30d
      end as rotacion
    from public.skus sk
    left join lateral (
      select sum(ms.cantidad)::integer as out_30d
      from public.movimientos_sku ms
      where ms.sku_id = sk.id
        and ms.tipo in ('venta', 'merma', 'donacion')
        and ms.created_at >= (current_timestamp - interval '30 days')
    ) m on true
  ) sub
  where s.id = sub.id;

  -- SKUs: recalcular estado tras días/rotación
  perform proof.refresh_sku_estado(s.id) from public.skus s;

  -- Deudas productores: estados por vencimiento
  update public.deudas_productores d
  set
    estado = case
      when d.fecha_vencimiento < current_date then 'vencido'::public.estado_deuda_productor
      when d.fecha_vencimiento <= current_date + 7 then 'proximo'::public.estado_deuda_productor
      else 'al_corriente'::public.estado_deuda_productor
    end,
    updated_at = now();

  -- Cuentas clientes
  perform proof.refresh_cuenta_cliente(c.id) from public.cuentas_clientes c;
end;
$$;

commit;
