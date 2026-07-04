# Deploy — migraciones distribuidor M1–M8 (dist_products → skus)

Proyecto: `stjnoacbdcjhhucaoqrw` · Reglas: [PROOF_CONTEXT.md](../PROOF_CONTEXT.md)

## Estado (2026-07-03)

| Paso | Descripción | Prod |
|------|-------------|------|
| **M1** | Columnas catálogo en `skus` | ✅ |
| **M2** | Tabla `movimientos_sku` + RLS | ✅ |
| **M3** | RPC `registrar_movimiento_sku` | ✅ |
| **M4** | Backfill catálogo desde `dist_products` | ⏭️ N/A en prod (sin `dist_products`; M1 defaults OK) |
| **M5 app** | `/dashboard/movimientos` → `skus` + `registrar_movimiento_sku` | ✅ |
| **M5 app** | `/dashboard/productos` (lista, detalle, nueva) → `skus` | ✅ |
| **M6** | `run_daily_maintenance` → `movimientos_sku` | ✅ |
| **M7** | Storage `product-images` → `skus/{sku_id}/...` + RLS Auth | ✅ |
| **M8** | Legacy revoke | ✅ |

**Cutover completo** — `npm run check:dist-schema` → 6/6 ✓

## Auditoría

```bash
npm run check:dist-schema
```

## M4 — Skip en prod (2026-07-03)

No existe `dist_products` en `stjnoacbdcjhhucaoqrw`. Los SKUs viven directo en `skus` con columnas M1 (defaults). Validación: `scripts/validate-dist-m4-skip.sql`.

## Aplicar M2 + M3 (SQL Editor)

1. Abre [SQL Editor](https://supabase.com/dashboard/project/stjnoacbdcjhhucaoqrw/sql/new)
2. Pega **`scripts/apply-dist-m2-m3.sql`** completo
3. **Run** una sola vez
4. `npm run check:dist-schema` → 4/4 ✓

## Aplicar M6 (SQL Editor)

Tras M2+M3, actualiza el job diario para calcular `rotacion_30d` desde `movimientos_sku` (ya no depende de `dist_movements`):

1. Pega **`scripts/apply-dist-m6-daily-maintenance.sql`** en SQL Editor
2. **Run** una vez

## Aplicar M7 (SQL Editor)

Actualiza RLS del bucket `product-images` para paths `skus/{sku_id}/...` con Supabase Auth (elimina políticas anon legacy):

1. Pega **`scripts/apply-dist-m7-product-images-storage.sql`**
2. **Run** una vez
3. Sube una foto en `/dashboard/productos/[id]` — path canónico `skus/{uuid}/...`

## Aplicar M8 (SQL Editor)

Post-cutover: elimina RPC sync legacy, columna `skus.dist_product_id`, path storage sin prefijo `skus/`, y revoca escrituras en `dist_*` si existen (dev/local).

1. Pega **`scripts/apply-dist-m8-legacy-revoke.sql`**
2. **Run** una vez
3. Validación opcional: **`scripts/validate-dist-m8.sql`**
4. `npm run check:dist-schema` → incluye checks M8 (sync revocado, sin `dist_product_id`)

**Prod:** no hay tablas `dist_*` — el script solo limpia RPC/columnas/storage. App: inventario ya no muestra “Sincronizar catálogo”.

### Prerrequisitos

- **M1** ya aplicada (`skus.origen`, etc.)
- **Supabase Auth** en prod (`skus.user_id`, `proof.auth_has_staff_access_to_scope`) — migración `20260624120000`
- `proof.refresh_sku_estado` (core distribuidor)
- Tabla `public.clients` (FK en `movimientos_sku`)

### Tipos en prod

En `stjnoacbdcjhhucaoqrw`, `skus.id` es **uuid**. El bundle `apply-dist-m2-m3.sql` usa `sku_id uuid`.

**RLS:** prod ya no tiene `proof.row_belongs_to_requester(text,text)` (eliminada en Clerk→Supabase). El bundle usa el mismo patrón que `skus`: `user_id = auth.uid()` + staff scope.

### Errores comunes

| Error | Fix |
|-------|-----|
| `row_belongs_to_requester(text, text) does not exist` | Re-ejecuta **`scripts/apply-dist-m2-m3.sql`** actualizado (usa `auth.uid()`, no Clerk) |
| `auth_has_staff_access_to_scope does not exist` | Falta migración `20260624120000_clerk_to_supabase_auth.sql` en prod |
| `relation movimientos_sku already exists` | M2 ya aplicó — continúa solo con M3 (desde `-- M3 · RPC`) |
| `function registrar_movimiento_sku already exists` | M3 ya aplicó — verifica con `check:dist-schema` |
| `'use client' syntax error` | Pegaste código TS/React — usa **`scripts/apply-dist-m8-legacy-revoke.sql`**, no un `.tsx` |

## Archivos

| Archivo | Rol |
|---------|-----|
| `supabase/migrations/20250527000000_skus_catalog_columns.sql` | M1 |
| `supabase/migrations/20250527000100_movimientos_sku.sql` | M2 |
| `supabase/migrations/20250527000200_registrar_movimiento_sku.sql` | M3 |
| `supabase/migrations/20250703220000_dist_legacy_revoke.sql` | M8 |
| `scripts/apply-dist-m2-m3.sql` | Bundle M2+M3 para SQL Editor |
| `scripts/apply-dist-m6-daily-maintenance.sql` | M6 job rotación 30d |
| `scripts/apply-dist-m7-product-images-storage.sql` | M7 storage RLS + paths |
| `scripts/apply-dist-m8-legacy-revoke.sql` | M8 legacy revoke + storage canonical |
| `scripts/validate-dist-m8.sql` | Validación post-M8 |
| `scripts/check-dist-schema.mjs` | Auditoría remota |
