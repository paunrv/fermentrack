# Inventario de producto terminado (etiquetas)

Epic [#38](https://github.com/paunrv/fermentrack/issues/38) · Spec [WINEMAKER-UX-SPEC.md](./WINEMAKER-UX-SPEC.md)

Producto embotellado: catálogo de **etiquetas**, líneas de **existencia** (añada + formato + lote origen) y **salidas** en ledger. Unidad canónica = **botella**; la caja es empaque.

## Schema (D1 — #53)

Migración: `supabase/migrations/20260703170000_finished_goods_inventory.sql`

| Tabla | Rol |
|-------|-----|
| `wm_etiquetas` | Catálogo por org (`nombre` único por org) |
| `wm_existencias` | Stock line al embotellar — `botellas_producidas` fijo |
| `wm_salidas` | Ledger de consumo — nunca editar `disponibles` a mano |

### Claves foráneas

- `wm_existencias.lote_id` → `public.lots` (pipeline Epic A), no `wm_wine_lots`
- `wm_salidas.registrado_por` → `profiles.id`

### Enums

- `wm_salida_tipo`: `venta | degustacion | autoconsumo | merma | ajuste`
- `wm_salida_origen`: `web | mcp`
- `botellas_por_caja`: `6 | 9 | 12`

### Constraints

- `sum(wm_salidas.botellas) ≤ wm_existencias.botellas_producidas` por existencia (trigger `wm_salidas_within_produced`)
- `wm_existencias` y `wm_salidas`: append-only (sin `UPDATE`/`DELETE` vía RLS)
- `rango_inicio` / `rango_fin`: columnas desde v1; UI Enterprise en D4/D6

### RLS

Patrón org Epic #3: `wm_row_select_allowed` / `wm_row_write_allowed` / `wm_row_delete_allowed`.

## Contadores derivados

Siempre exponer **producidas**, **consumidas**, **disponibles** (nunca solo disponible):

```
disponibles = botellas_producidas − sum(salidas.botellas)
```

Helpers TypeScript: `apps/web/src/lib/proof/finished-goods-types.ts` → `computeExistenciaStock()`.

## Embotellado → existencia (D2 — #54)

Al confirmar embotellado en `/dashboard/lotes/[id]`:

1. Crea o reutiliza `wm_etiquetas`
2. Inserta `wm_existencias` con `botellas_producidas` fijo
3. Registra evento `BOTTLING_COMPLETED` en `public.events` (mueve etapa a `embotellado`)

Código: `apps/web/src/lib/proof/record-lot-bottling.ts` · UI: `LotBottlingForm.tsx` · acción: `apps/web/src/app/actions/lot-bottling.ts`

El pipeline marca lotes en crianza+ sin existencia con badge **Embotellar** (`bottlingPending`).

## Vista Etiquetas en bodega (D3 — #55)

Ruta: **`/dashboard/winemaker/bodega`** (desktop + móvil)

- Agrupación por **etiqueta**; filas por añada + formato + lote origen
- Filtros chip: añada, formato
- Cada fila: `Botella N° {consumidas} de {producidas} · quedan {disponibles}` + barra de consumo
- Unidades: `96 botellas · 8 cajas de 12` o `5 cajas + 9 sueltas`
- **Stock bajo** cuando `disponibles ≤ 3 × botellas_por_caja` (umbral por fila hasta configuración por etiqueta)

Código: `finished-goods-inventory.ts` · `WinemakerBodegaInventory.tsx` · `ExistenciaConsumptionBar.tsx` · Storybook `ExistenciaConsumptionBar.stories.tsx`

## Registrar salida (D4 — #56)

En cada fila de `/dashboard/winemaker/bodega` → **Registrar salida**:

- Tipo: `venta | degustacion | autoconsumo | merma | ajuste`
- Toggle **cajas / botellas** con línea de conversión (`2 cajas de 12 = 24 botellas · quedarán 72`)
- Validación: `botellas ≤ disponibles` (+ trigger DB `salidas_exceed_produced`)
- **Enterprise** (`orgHasFeature('numeracion_botellas')`): sección de rango pre-llenada (`consumidas + 1`) y validación de no-traslape
- Planes free/pro: sección de rango oculta (sin upsell en formulario)

Código: `record-wm-salida.ts` · `RegistrarSalidaForm.tsx` · `org-features.ts` · acción `wm-salida.ts`

## MCP (D5 — #57)

| Tool | Tipo | Descripción |
|------|------|-------------|
| `list_etiquetas` | read | Jerarquía etiqueta → existencias con producidas/consumidas/disponibles |
| `registrar_salida` | write | Descuenta botellas; `origen = mcp`; `preview_only` opcional |

Registro: `register-tools.ts` / `register-write-tools.ts` · formatter: `lib/mcp/finished-goods-mcp.ts` · doc: [PROOF-BYOA-MCP.md](./PROOF-BYOA-MCP.md)

## Gating numeración (D6 — #58)

Helper: `orgHasFeature(org, 'numeracion_botellas')` en `org-features.ts`

| Plan | Numeración en salida (web + MCP) |
|------|----------------------------------|
| Free / Pro | Oculta — sin upsell en formularios operativos |
| Enterprise | Sección de rango + pre-fill + validación no-traslape |

Override opcional: `organizations.features.numeracion_botellas` (jsonb, migración `20260703180000_organizations_features.sql`).

Diferencial de plan documentado en **Ajustes → Billing**, no inline en el formulario de salida.

## Issues Epic D

| Issue | Entregable |
|-------|------------|
| [#53](https://github.com/paunrv/fermentrack/issues/53) | Migraciones + RLS + constraints ✅ |
| [#54](https://github.com/paunrv/fermentrack/issues/54) | Embotellado crea existencia ✅ |
| [#55](https://github.com/paunrv/fermentrack/issues/55) | Vista Etiquetas en bodega ✅ |
| [#56](https://github.com/paunrv/fermentrack/issues/56) | Formulario Registrar salida ✅ |
| [#57](https://github.com/paunrv/fermentrack/issues/57) | MCP `list_etiquetas` / `registrar_salida` ✅ |
| [#58](https://github.com/paunrv/fermentrack/issues/58) | Gating Enterprise numeración ✅ |

## Convergencia futura (no implementar ahora)

`etiqueta + añada + formato` ≈ SKU distribuidor — diseñar existencias con campos de formato compatibles para cross-profile.
