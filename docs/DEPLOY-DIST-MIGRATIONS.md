# Deploy — migraciones distribuidor M1–M8 (dist_products → skus)

Proyecto: `stjnoacbdcjhhucaoqrw` · Reglas: [PROOF_CONTEXT.md](../PROOF_CONTEXT.md)

## Estado (2026-07-03)

| Paso | Descripción | Prod |
|------|-------------|------|
| **M1** | Columnas catálogo en `skus` | ✅ |
| **M2** | Tabla `movimientos_sku` + RLS | ⏳ |
| **M3** | RPC `registrar_movimiento_sku` | ⏳ |
| **M4** | Backfill catálogo desde `dist_products` | ⏭️ N/A en prod (sin `dist_products`; M1 defaults OK) |
| **M5 app** | `/dashboard/movimientos` → `skus` + `registrar_movimiento_sku` | ✅ |
| **M5 app** | `/dashboard/productos` (lista, detalle, nueva) → `skus` | ✅ |
| **M5–M8** | Productos, backfill SQL, maintenance, storage | pendiente |

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

## Archivos

| Archivo | Rol |
|---------|-----|
| `supabase/migrations/20250527000000_skus_catalog_columns.sql` | M1 |
| `supabase/migrations/20250527000100_movimientos_sku.sql` | M2 |
| `supabase/migrations/20250527000200_registrar_movimiento_sku.sql` | M3 |
| `scripts/apply-dist-m2-m3.sql` | Bundle M2+M3 para SQL Editor |
| `scripts/check-dist-schema.mjs` | Auditoría remota |
