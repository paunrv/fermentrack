# RPCs pendientes de migración Clerk → Supabase Auth

Deploy: **[DEPLOY-FASE2-RPCS.md](./DEPLOY-FASE2-RPCS.md)** · Verifica: `npm run check:fase2-rpcs`

## Bundle 1 — core distribuidor ✅ prod (2026-07-03)

`scripts/apply-fase2-rpcs-core.sql`:

- `proof.auth_can_access_scope`
- `confirmar_pedido`, `actualizar_estado_pedido`, `entregar_pedido`
- `crear_remision_distribuidor`, `aplicar_anticipo_cxc_pedido`, `crear_cuenta_por_cobrar_pedido`
- `confirmar_recepcion`, `confirmar_llegada_orden_compra_distribuidor`
- `public.registrar_movimiento_sku` (auth fix)

## Bundle 2 — pagos + storage ✅ prod (2026-07-03)

`scripts/apply-fase2-rpcs-pagos.sql`:

- `scope_user_id_from_clerk_folder`
- `registrar_pago_cliente`, `registrar_pago_proveedor`
- `sku_image_path_owned`, `storage_distribuidor_path_*`
- `next_codigo` (resuelve clave legacy en sequences)

## Bundle 3 — destilador ✅ prod (2026-07-03)

`scripts/apply-fase2-rpcs-destilador.sql`:

- `destilador_row_owned` (Supabase Auth + `proof_profiles`)
- RLS tablas destilador + storage `lotes-produccion`
- `dest_next_numero_lote`, `dest_ensure_bodega_principal`
- `confirmar_llegada_destilador`, `cerrar_corrida_destilador`

## Patrón de migración

```sql
-- Antes
if not proof.row_belongs_to_requester(v_row.clerk_id, v_row.profile_type_v2) then

-- Después
if not proof.auth_can_access_scope(v_row.user_id, v_row.profile_type_v2) then
```

Inserts: `clerk_id` → `user_id` en tablas con columna `user_id`.

Reemplazar: `proof.current_clerk_id()` → `auth.uid()`
Reemplazar: `proof.is_super_user()` → consulta a `profiles` donde `id = auth.uid()`
