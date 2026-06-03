-- PROOF · Destilador — grants Data API (authenticated / anon)
-- Corrige: permission denied for table viajes [42501]
-- Aditivo · idempotente

grant usage on schema public to authenticated, anon, service_role;
grant usage on schema proof to authenticated, anon, service_role;
grant execute on all functions in schema proof to authenticated, service_role;

-- Tablas destilador con RLS por clerk_id (CRUD completo)
grant select, insert, update, delete on public.destilador_sequences to authenticated, service_role;
grant select, insert, update, delete on public.bodegas to authenticated, service_role;
grant select, insert, update, delete on public.viajes to authenticated, service_role;
grant select, insert, update, delete on public.productos_viaje to authenticated, service_role;
grant select, insert, update, delete on public.lotes to authenticated, service_role;
grant select, insert, update, delete on public.corridas_embotellado to authenticated, service_role;
grant select, insert, update, delete on public.stock_botellas_vacias to authenticated, service_role;
grant select, insert, update, delete on public.expresiones_producto to authenticated, service_role;
grant select, insert, update, delete on public.stock_etiquetas to authenticated, service_role;
grant select, insert, update, delete on public.cajas to authenticated, service_role;
grant select, insert, update, delete on public.botellas to authenticated, service_role;
grant select, insert, update, delete on public.pedidos_destilador to authenticated, service_role;
grant select, insert, update, delete on public.items_pedido_destilador to authenticated, service_role;

-- movimientos_inventario: inmutable (solo SELECT + INSERT; sin UPDATE/DELETE)
grant select, insert on public.movimientos_inventario to authenticated, service_role;

-- Canvas KPI (destilador + distribuidor)
grant select, insert, update, delete on public.kpi_config to authenticated, service_role;

-- RPCs públicas destilador
grant execute on function public.confirmar_llegada_destilador(uuid, jsonb) to authenticated, service_role;
grant execute on function public.cerrar_corrida_destilador(uuid, integer, integer) to authenticated, service_role;

-- Enums destilador (INSERT/UPDATE con columnas enum)
grant usage on type public.dest_bodega_tipo to authenticated, service_role;
grant usage on type public.dest_viaje_estado to authenticated, service_role;
grant usage on type public.dest_lote_estado to authenticated, service_role;
grant usage on type public.dest_formato_botella to authenticated, service_role;
grant usage on type public.dest_corrida_modo to authenticated, service_role;
grant usage on type public.dest_corrida_estado to authenticated, service_role;
grant usage on type public.dest_etiqueta_tipo to authenticated, service_role;
grant usage on type public.dest_caja_estado to authenticated, service_role;
grant usage on type public.dest_botella_estado to authenticated, service_role;
grant usage on type public.dest_movimiento_tipo to authenticated, service_role;
grant usage on type public.dest_movimiento_metodo to authenticated, service_role;
grant usage on type public.dest_cliente_tipo to authenticated, service_role;
grant usage on type public.dest_condicion_pago to authenticated, service_role;
grant usage on type public.dest_pedido_estado to authenticated, service_role;
grant usage on type public.dest_item_tipo to authenticated, service_role;
grant usage on type public.dest_membresia to authenticated, service_role;
