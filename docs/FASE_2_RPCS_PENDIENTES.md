# RPCs pendientes de migración Clerk → Supabase Auth

Estas 31 funciones fallarán en runtime hasta ser migradas.
No tocar hasta completar las migraciones 001-003 de PROOF.

## proof.* (19)
confirmar_pedido, entregar_pedido, actualizar_estado_pedido,
crear_remision_distribuidor, crear_cuenta_por_cobrar_pedido,
aplicar_anticipo_cxc_pedido, registrar_pago_cliente,
registrar_pago_proveedor, confirmar_llegada_orden_compra_distribuidor,
confirmar_recepcion, sku_image_path_owned,
storage_distribuidor_path_select, storage_distribuidor_path_insert_patron,
storage_distribuidor_path_insert_bodega, confirmar_llegada_destilador,
cerrar_corrida_destilador, dest_next_numero_lote, dest_ensure_bodega_principal

## public.* wrappers (12)
confirmar_pedido, entregar_pedido, actualizar_estado_pedido,
crear_remision_distribuidor, crear_cuenta_por_cobrar_pedido,
aplicar_anticipo_cxc_pedido, registrar_pago_cliente,
registrar_pago_proveedor, confirmar_llegada_orden_compra_distribuidor,
confirmar_recepcion, confirmar_llegada_destilador, cerrar_corrida_destilador

## Patrón de migración para cada función:
Reemplazar: proof.row_belongs_to_requester() → user_id = auth.uid()
Reemplazar: proof.current_clerk_id() → auth.uid()
Reemplazar: proof.is_super_user() → (consulta a profiles donde id = auth.uid())

## public.registrar_movimiento_sku
Llama directo a row_belongs_to_requester — migrar junto con el módulo de SKUs.
