# Deploy — FASE 2 RPC auth (Clerk → Supabase Auth)

Proyecto: `stjnoacbdcjhhucaoqrw` · Reglas: [PROOF_CONTEXT.md](../PROOF_CONTEXT.md)

## Estado

| Bundle | RPCs | Prod |
|--------|------|------|
| **B1 core** | pedidos + recepciones + `registrar_movimiento_sku` | ✅ |
| **B2 pagos** | `registrar_pago_*`, storage, `next_codigo` | ✅ |
| **B3 destilador** | `destilador_row_owned`, llegada, corrida | ✅ |

**FASE 2 RPC auth — completo** · `npm run check:fase2-rpcs` → 7/7 ✓

## Prerequisitos (B1)

1. `user_id` poblado en `pedidos`, `recepciones`, `skus`, `ordenes_compra_distribuidor`, `cuentas_*`
2. `proof.auth_has_staff_access_to_scope(text, text)` existe (migración Clerk→Auth fase 1)
3. B1 crea el overload `(uuid, text)` y escribe **ambas** columnas `user_id` + `clerk_id` donde aplique

## Aplicar B1 (SQL Editor)

1. Abre [SQL Editor](https://supabase.com/dashboard/project/stjnoacbdcjhhucaoqrw/sql/new)
2. Pega **`scripts/apply-fase2-rpcs-core.sql`** completo
3. **Run** una sola vez
4. Verifica:

```bash
npm run check:fase2-rpcs
```

Esperado: 3/3 ✓ (probes con UUID fake → «Pedido no encontrado», «Recepción no encontrada», «SKU no encontrado»).

## Qué incluye B1

| Función | Flujo |
|---------|-------|
| `proof.auth_can_access_scope` | Helper owner + staff |
| `confirmar_pedido` | Reserva stock + anticipo CxC |
| `actualizar_estado_pedido` | preparando / en_ruta |
| `entregar_pedido` | Descuenta stock + remisión |
| `crear_remision_distribuidor` | REM-xxx |
| `aplicar_anticipo_cxc_pedido` | Anticipo al confirmar |
| `crear_cuenta_por_cobrar_pedido` | CxC al entregar |
| `confirmar_recepcion` | Stock + deuda productor |
| `confirmar_llegada_orden_compra_distribuidor` | OC → stock |
| `registrar_movimiento_sku` | Auth fix (M3) |

## Aplicar B2 (SQL Editor)

Tras B1:

1. Pega **`scripts/apply-fase2-rpcs-pagos.sql`** en SQL Editor
2. **Run** una sola vez
3. `npm run check:fase2-rpcs` → 5/5 ✓

## Qué incluye B2

| Función | Flujo |
|---------|-------|
| `scope_user_id_from_clerk_folder` | Storage paths `{clerk_id}/...` → auth |
| `registrar_pago_cliente` | Abono CxC |
| `registrar_pago_proveedor` | Abono CxP |
| `sku_image_path_owned` | RLS `product-images` |
| `storage_distribuidor_path_*` | comprobantes, pedidos-origen, eventos-bodega |
| `next_codigo` | Resuelve clave legacy en `proof_sequences` |

## Nota sobre `next_codigo`

B1 pasa `user_id::text` a `proof.next_codigo`. Si `proof_sequences` aún usa columna `clerk_id` con UUIDs legacy, sigue funcionando. Bundle 2 migrará `next_codigo` + sequences a `user_id` puro.

## Aplicar B3 (SQL Editor)

Tras B2:

1. Pega **`scripts/apply-fase2-rpcs-destilador.sql`** en SQL Editor
2. **Run** una sola vez
3. `npm run check:fase2-rpcs` → 7/7 ✓

## Qué incluye B3

| Función | Flujo |
|---------|-------|
| `destilador_row_owned` | Auth vía `proof_profiles` + super user |
| RLS + storage `lotes-produccion` | Recrea políticas idempotentes |
| `dest_next_numero_lote` | Secuencia LOTE-NNN |
| `dest_ensure_bodega_principal` | Bodega default |
| `confirmar_llegada_destilador` | Viaje → lotes (sin `current_clerk_id`) |
| `cerrar_corrida_destilador` | Embotellado → cajas |

## Pendiente (B2+)

Ver [FASE_2_RPCS_PENDIENTES.md](./FASE_2_RPCS_PENDIENTES.md).
