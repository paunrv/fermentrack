# PROOF · Contexto técnico (Distribuidor)

Plataforma de inteligencia operacional para distribuidores de bebidas en México.  
Principio: **menos captura, más evidencia.**

## Contexto de deploy — leer antes de cualquier cambio

- **Entorno:** producción directa. No hay staging.
- **Usuarios activos:** sí. Hay datos reales en Supabase.
- **Stack desplegado:** apps/web en Vercel + Supabase remoto.
- **Base de datos:** Supabase producción. Cualquier migración
  es irreversible sin restore manual.

### Reglas de trabajo obligatorias

1. **Migraciones siempre aditivas primero.**
   Nunca DROP, nunca ALTER destructivo, nunca truncar datos
   sin aprobación explícita con validaciones previas.

2. **Backfill con validación antes de cutover.**
   Cualquier migración de datos requiere queries de validación
   con resultados mostrados antes de continuar.

3. **Nunca romper el flujo activo.**
   El flujo foto → recepción → stock → pedido → crédito
   debe funcionar en todo momento durante una migración.
   Si un paso puede romperlo, hacerlo en horario de baja actividad
   o con feature flag.

4. **Build antes de cada PR.**
   npm run build debe pasar después de cada bloque de cambios.
   No acumular cambios sin verificar build.

5. **Pedir aprobación en puntos de no retorno.**
   Antes de: cutover de app a nueva fuente de datos,
   DROP de tablas, cambios en RLS que afecten datos existentes.
   Mostrar resultados de validación y esperar OK explícito.

6. **Una cosa a la vez.**
   No mezclar migración de datos + cambios de UI + limpieza
   en el mismo commit. Bloques separados, build entre cada uno.

## Estado actual — 26 de mayo de 2026

**Completado:**

- Monorepo estable: solo `apps/web` + `packages/typescript-config`; build verificado.
- Auth Clerk + perfiles en Supabase; RLS con JWT template `supabase`.
- **Inicio** (`/dashboard`): `skus` + alertas; feed de actividad desde `dist_movements` (datos reales legacy).
- **Inventario**: `skus` por scope; banner “sincronizar catálogo” → `proof.sync_all_skus_for_scope`.
- **Pedidos** (lista, detalle, nuevo): tablas PROOF (`pedidos`, `items_pedido`, `clients`, `skus`) + RPC confirmar/entregar.
- **Crédito**: resumen, deudas productores, cuentas clientes, alertas; redacción de cobro vía `/api/credito/redactar-cobro`.
- **Productores** y detalle por nombre: agregado desde `skus`, `deudas_productores`, OCs abiertas.
- **Entrada foto** (`/dashboard/recepcion`): análisis vía API, OCs, `proof.confirmar_recepcion`.
- **Remisiones**: recepciones confirmadas; detalle + URLs de fotos.
- **Ajustes** (`/dashboard/settings`): perfiles en Supabase (`upsertProfile`, etc.).
- Rutas solo productor bloqueadas para perfil `distributor` (redirect a inicio).

**Pendiente próxima sesión:**

- Migración **dist_products → skus** (plan aprobado M1–M8; **no ejecutar** hasta sesión siguiente como primera tarea).
- **npm audit** (7 hallazgos reportados por npm; no tratados en esta sesión).
- **Vercel / deploy**: revisión de env vars, dominio y pipeline si aplica.
- **README** raíz: sigue siendo plantilla Turborepo; alinear con PROOF cuando toque.
- **Catálogo + movimientos + detalle producto**: siguen leyendo/escribiendo **tablas legacy** `dist_products` / `dist_inventory` / `dist_movements` (datos reales, no mock); unificación en el alcance M1–M8.

**Build:** passing ✓ (`npm run build`, Next 14.2.35; puede mostrar aviso `npm warn Unknown env config "devdir"` según entorno local).

## Stack

- **Frontend:** Next.js 14, TypeScript, Clerk Auth
- **Backend datos:** Supabase (PostgreSQL), scope `clerk_id` + `profile_type_v2`
- **Tipos dominio (app):** `apps/web/src/lib/proof/types.ts`

## Auth + RLS

La app usa **Clerk** (no Supabase Auth nativo). Las políticas RLS leen:

| Claim / setting | Uso |
|----------------|-----|
| `auth.jwt() ->> 'sub'` | `clerk_id` del distribuidor |
| `auth.jwt() ->> 'profile_type_v2'` | Debe ser `distributor` |
| `app.clerk_id` (session setting) | Fallback para RPC server-side |

Configurar [Clerk → Supabase JWT template](https://clerk.com/docs/integrations/databases/supabase) con `sub` = Clerk user id y claim `profile_type_v2`.

Super-usuarios: `profiles.is_super_user = true` bypass RLS vía `proof.is_super_user()`.

## Modelo de datos (PostgreSQL)

### `skus`

Stock en **botellas**. Columnas clave:

| Columna | Tipo | Notas |
|---------|------|--------|
| `stock_total` | int | Físico en bodega |
| `stock_reservado` | int | Pedidos confirmados |
| `stock_disponible` | int **GENERATED** | `stock_total - stock_reservado` |
| `margen_porcentaje` | numeric **GENERATED** | Desde costo/precio |
| `dias_sin_movimiento` | int | Job diario + `ultimo_movimiento` |
| `rotacion_30d` | enum | Job diario (heurística movimientos) |
| `estado` | enum | Trigger + prioridad spec |
| `deuda_asociada` | numeric | Manual / recepciones |

**Estado SKU** (prioridad): `sobrevendido` → `quiebre` → `muerto` → `bajo` → `en_transito` → `consignacion` → `sano`

Legacy: `dist_product_id` → `dist_products` (sync con `proof.sync_sku_from_dist_product`).

### `pedidos` + `items_pedido`

Estados: `borrador` | `confirmado` | `preparando` | `en_ruta` | `entregado` | `parcial` | `cancelado`

**Transacciones ACID (solo RPC):**

```sql
select * from proof.confirmar_pedido('<uuid>');  -- borrador → confirmado, reserva stock
select * from proof.cancelar_pedido('<uuid>');   -- libera reserva si aplica
select * from proof.entregar_pedido('<uuid>', false);  -- descuenta stock + libera reserva
```

`stock_reservado` no se puede editar directo (trigger guard).

### `recepciones` + `items_recepcion` + `discrepancias`

```sql
select * from proof.confirmar_recepcion('<uuid>', true);
```

Incrementa `stock_total`, opcionalmente crea `deudas_productores`.

### `deudas_productores`

Tipos: `credito` | `consignacion` | `acuerdo_verbal`  
Estados: `al_corriente` | `proximo` | `vencido` | `en_negociacion` (job diario por `fecha_vencimiento`).

### `cuentas_clientes`

| Columna | Mantenimiento |
|---------|----------------|
| `dias_vencido` | Trigger + job 06:00 UTC (`fecha_vencimiento`, `saldo_pendiente`) |
| `pedido_activo_hoy` | Pedido con `fecha_entrega = today` y estado activo |

## Jobs y tiempo real

- **pg_cron:** `proof_daily_maintenance` — `0 6 * * *` UTC
- **Trigger:** `skus_refresh_estado` en cambios de stock
- **NOTIFY:** canal `proof_sku_stock` (JSON con `stock_disponible`)
- **Realtime:** tabla `skus` en publicación `supabase_realtime`

## Migraciones

```bash
supabase db push   # o aplicar en orden:
# 20250526200000_proof_distribuidor_core.sql
# 20250526200100_proof_sync_dist_products.sql
```

Backfill SKUs desde catálogo actual:

```sql
select proof.sync_all_skus_for_scope('clerk_xxx', 'distributor');
```

## App (web)

- Tipos y API: `apps/web/src/lib/supabase.ts` + `lib/supabase/distribuidor.ts`
- Cliente autenticado: `useSupabase()` → JWT Clerk template `supabase`
- Service role: `utils/supabase/service.ts` (solo Server Actions)
- JWT setup: [docs/clerk-supabase-jwt.md](docs/clerk-supabase-jwt.md)
- Compositor: `/dashboard/pedidos` → `proof.confirmar_pedido` vía RPC (no UPDATE directo a `stock_reservado`)

## Storage recepciones

- Bucket privado `recepciones` — path `{clerk_id}/{recepcion_id}/{timestamp}.jpg`
- RLS: solo el `clerk_id` dueño (carpeta raíz) puede leer/subir
- `recepciones.foto_urls`: URLs firmadas (7 días) generadas al subir en `/api/recepciones/analizar-foto`

## Órdenes de compra

Tablas `ordenes_compra` + `items_orden_compra`. Estados: `borrador` | `enviada` | `recibida` | `parcial`.

Al `confirmar_recepcion` con `orden_compra_id`, la OC pasa a `recibida` o `parcial` si hay diferencias vs ítems esperados.

## Monorepo

- **App:** `apps/web` (Next.js 14 + Clerk + Supabase)
- **Shared:** `packages/typescript-config` únicamente
- Datos: migraciones en `supabase/migrations` (sin Prisma)

## Próximo paso (app)

1. Migración catálogo/movimientos: `dist_products` → `skus`
2. Smoke tests E2E (foto → stock → pedido → crédito)
