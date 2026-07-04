# Dashboard rail (Epic B)

Epic [#36](https://github.com/paunrv/fermentrack/issues/36) · Spec [WINEMAKER-UX-SPEC.md](./WINEMAKER-UX-SPEC.md)

Rail lateral de 52px con agrupación, separadores visibles y tooltips localizados.

## Issues

| ID | Issue | Estado |
|----|-------|--------|
| B1 | [#45](https://github.com/paunrv/fermentrack/issues/45) | Auditoría ruta × perfil ✅ |
| B2 | [#46](https://github.com/paunrv/fermentrack/issues/46) | Agrupación + separadores + tooltips ✅ |
| B3 | [#47](https://github.com/paunrv/fermentrack/issues/47) | Modo expandido 52px ↔ 220px ✅ |

## B1 — Matriz ruta × perfil

Fuente de verdad: `apps/web/src/lib/proof/dashboard-rail.ts` · tests: `dashboard-rail.test.ts`

| Perfil | Operación | Equipo | Configuración |
|--------|-----------|--------|---------------|
| **Winemaker** | Inicio, Lotes, Etiquetas bodega, Documentos, Proveedores, Gastos | Mi equipo*, Agenda, Chat† | Conectar agente, Ajustes |
| **Distribuidor** | Inicio, Inventario, Pedidos, Movimientos, Catálogo, Entrada, Remisiones | Clientes, Crédito, Productores | Conectar agente, Ajustes |
| **Destilador** | Inicio, Compras, Lotes, Producción, Bodega, Ventas | — | Conectar agente, Ajustes |
| **Productor (brewer)** | Inicio, Inventario, Movimientos, Catálogo, Clientes | — | Conectar agente, Ajustes |
| **Super user** | Unión deduplicada de rutas anteriores | Equipo winemaker + finanzas distribuidor | Conectar agente, Ajustes |

\* Mi equipo solo si `fetchTeamAccess.canManage` (owner/admin).  
† Toggle 💬 en grupo Equipo cuando `orgHasFeature('chat')` (Pro+).

### Duplicados eliminados (vs. nav plano anterior)

| Problema | Resolución |
|----------|------------|
| Mismo icono para pedidos / movimientos / crédito / remisiones / gastos | Icono único por ruta en `dashboard-rail-icons.tsx` |
| Ajustes duplicado (lista + pie) | Solo en grupo **Configuración** al pie |
| `/dashboard` como home y como “conectar” | Home en Operación; MCP hub en `/dashboard/conectar` |
| Lista plana sin jerarquía (~20 iconos) | Máx. 3 grupos con separador |

## B2 — Implementación

| Pieza | Path |
|-------|------|
| Config + builder | `apps/web/src/lib/proof/dashboard-rail.ts` |
| Iconos SVG | `apps/web/src/lib/proof/dashboard-rail-icons.tsx` |
| Componente rail | `apps/web/src/components/proof/DashboardRail.tsx` |
| Tooltips CSS | `apps/web/src/app/globals.css` (`.proof-dashboard-rail-link[data-tooltip]`) |
| Shell integration | `apps/web/src/app/dashboard/layout.tsx` |

### Grupos visuales

1. **Operación** — scroll principal
2. **Equipo** — separador · chat toggle + miembros + agenda (winemaker)
3. **Configuración** — separador · pegado al pie (conectar + ajustes)

Tooltips: `data-tooltip` + label de `dashboard.nav.*` vía next-intl (solo en modo colapsado 52px).

## B3 — Modo expandido

| Pieza | Path |
|-------|------|
| Preferencia localStorage | `dashboard-rail-preference.ts` · clave `proof_dashboard_rail_expanded` |
| Hook | `hooks/useDashboardRailExpanded.ts` |
| Anchos | `DASHBOARD_RAIL_WIDTH_PX` (52) · `DASHBOARD_RAIL_WIDTH_EXPANDED_PX` (220) |
| Toggle | Pie del rail · transición `width 200ms` |

Modo colapsado = comportamiento B2. Modo expandido muestra etiquetas i18n sin truncar en la mayoría de locales.

## Criterios de aceptación

- [x] Ningún `href` duplicado por perfil (`findDuplicateRailHrefs`)
- [x] Máximo 3 grupos con separador visible
- [x] Todo icono con tooltip localizado (es-MX / en-US)
- [x] Indicador activo (barra accent izquierda) consistente con shell existente

Ver también: [DASHBOARD-SHELL.md](./DASHBOARD-SHELL.md), [DASHBOARD-BREAKPOINTS.md](./DASHBOARD-BREAKPOINTS.md)
