# Winemaker owner home

Epic [#35](https://github.com/paunrv/fermentrack/issues/35) · Spec [WINEMAKER-UX-SPEC.md](./WINEMAKER-UX-SPEC.md)

Pantalla de inicio del **owner** winemaker en `/dashboard`. El perfil team sigue usando el canvas PROOF (modos ticket / bodega / agenda).

## Breakpoints

Fuente: [DASHBOARD-BREAKPOINTS.md](./DASHBOARD-BREAKPOINTS.md) · helper `resolveWinemakerOwnerHomeView()` en `apps/web/src/lib/proof/winemaker-owner-home-view.ts`.

| Ancho | Tier | Componente | Shell |
|-------|------|------------|-------|
| ≤767px | `mobile` | `WinemakerMobileHome` | Bottom nav |
| 768–1023px | `tablet` | `WinemakerMobileHome` | Rail 52px + header (sin rediseño tablet propio) |
| ≥1024px | `desktop` | `WinemakerDesktopHome` | Rail + header |

Switch en `apps/web/src/app/dashboard/page.tsx` — **sin media queries dentro** de los componentes hijo.

## Desktop (`WinemakerDesktopHome`)

Contenedor `max-width: 1280px` (`Container size="xl"`).

### Header

- Saludo + fecha localizada
- Pill **salud**: verde si 0 lotes con alerta; warning/danger según conteo de lotes distintos con alerta
- Pill **agente MCP** cuando hay conexión local (`isMcpConfiguredLocally`)
- Botón / banner **Conectar agente** solo cuando **no** hay conexión
- **Avisos de plan** (E4): lotes activos y memoria cuando ≥80% o límite alcanzado → `PlanLimitHomeAlerts`

### Pipeline de bodega (`PipelineBodega`)

Seis columnas fijas, orden `LOT_ETAPA_VALUES`:

`Cosecha → Análisis → Fermentación → Maloláctica → Crianza → Embotellado`

Cada lote (`PipelineLot`) muestra en tarjeta:

- Código, varietal, contenedor (`vessel_note` del último evento), última medición (temp/brix), días desde último registro
- Alertas **en la tarjeta** (temp fuera de rango, >5 días sin registro) — no hay sección «Atención ahora» aparte
- Click → `/dashboard/winemaker/lotes/[id]`

Columnas:

- Vacías: guion + contador 0, subrayado neutro
- Con lotes: subrayado accent
- Con alerta: subrayado danger

Escala:

- >6 lotes por columna: scroll interno
- >15 lotes totales: tarjetas colapsadas a chips (umbral `PIPELINE_COLLAPSE_TOTAL_LOTS`, afinar en QA)

Lógica pura: `apps/web/src/lib/proof/pipeline-lot-meta.ts`.

### Fila inferior (`DesktopHomeBottomRow`)

Tres tarjetas iguales:

1. **Tareas pendientes** — completar inline (máx. 5 visibles)
2. **Calendario** — tareas de hoy con checkbox
3. **Agente externo** — expiración de token de sesión + última tool en `mcp_tool_calls` vía `GET /api/mcp/agent-status`

## Mobile (`WinemakerMobileHome`)

Sin cambios de layout respecto al diseño pre-Epic A: acordeones, CTA MCP, secciones Atención / Lotes / Calendario / Tareas / Equipo.

Datos compartidos: hook `useWinemakerOwnerHomeData`.

## Modelo de datos — etapa (A1)

Tabla `public.lots`, columna `etapa` (`lot_etapa` enum):

`cosecha | analisis | fermentacion | malolactica | crianza | embotellado`

- Campo explícito, backfill desde `current_stage`
- Cambio de etapa: evento `STAGE_CHANGED` en `public.events` → trigger actualiza `lots.etapa`
- Eventos operativos (`FERMENTATION_STARTED`, etc.) avanzan etapa solo forward

Migración: `supabase/migrations/20260703160000_lots_etapa_stage_change.sql`

App: `recordLotStageChange()` en `apps/web/src/lib/proof/lot-etapa.ts`.

## Archivos clave

| Pieza | Ruta |
|-------|------|
| Switch breakpoint | `apps/web/src/app/dashboard/page.tsx` |
| Desktop home | `apps/web/src/components/proof/WinemakerDesktopHome.tsx` |
| Mobile home | `apps/web/src/components/proof/WinemakerMobileHome.tsx` |
| Pipeline UI | `apps/web/src/components/proof/PipelineBodega.tsx` |
| Bottom row | `apps/web/src/components/proof/DesktopHomeBottomRow.tsx` |
| Plan limit alerts | `apps/web/src/components/proof/PlanLimitHomeAlerts.tsx` |
| Datos | `apps/web/src/hooks/useWinemakerOwnerHomeData.ts` |
| i18n etapas | `winemaker.etapa.*` en `messages/es-MX.json`, `en-US.json` |
| i18n desktop | `winemaker.home.desktop.*`, `winemaker.home.pipeline.*` |

## Issues Epic A

| Issue | Entregable |
|-------|------------|
| [#39](https://github.com/paunrv/fermentrack/issues/39) | `lots.etapa` + backfill + `STAGE_CHANGED` |
| [#40](https://github.com/paunrv/fermentrack/issues/40) | Header + contenedor desktop |
| [#41](https://github.com/paunrv/fermentrack/issues/41) | `PipelineBodega` |
| [#42](https://github.com/paunrv/fermentrack/issues/42) | Fila inferior + agent status API |
| [#43](https://github.com/paunrv/fermentrack/issues/43) | Este doc + checklist QA |
| [#44](https://github.com/paunrv/fermentrack/issues/44) | MCP `list_lotes` / `get_resumen_bodega` — ✅ implementado |

## QA

Checklist ampliado: [DESKTOP-QA.md](./DESKTOP-QA.md) — sección **Winemaker owner desktop home**.
