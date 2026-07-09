# PROOF · Sistema VU (Fase 0)

Referencia visual: [admin.vuh.io/connect](https://admin.vuh.io/connect) (Connect AI).  
Plan de rollout: fases 0–7 en el chat de producto / issues.  
Breakpoints y móvil: [DASHBOARD-BREAKPOINTS.md](./DASHBOARD-BREAKPOINTS.md) · `.cursor/rules/ui-ux.mdc`.

## Objetivo

Aplicar la **lógica de orden** de VU a todas las páginas desktop/tablet de PROOF (≥768), sin tocar flujos móviles existentes.

## Principios

| # | Principio | Implicación |
|---|-----------|-------------|
| 1 | Una página = un trabajo | Un título, una superficie principal, sin paneles competidores |
| 2 | Ops arriba / config abajo | Rail: operación → equipo → Conectar + Settings abajo |
| 3 | Fondo gris + tarjeta blanca | `--page-bg` en el área de contenido; `--surface-card` para el bloque principal |
| 4 | Header delgado | Brand/contexto izquierda · org + avatar derecha. Sin Ask/camera global |
| 5 | Un acento suave en chrome | Active nav = tinte + barra; badges de perfil conservan color |
| 6 | Setup guiado | Connect: URL + Copy + pasos por asistente |
| 7 | Whitespace | Menos chips/barras; más aire |

## Decisiones cerradas (Fase 0)

1. **Acento** — Chrome/nav usa tokens neutros + `--accent-soft` / `--nav-active-bg`. El color por perfil (`profile-theme`) queda **solo en badges** (y CTAs de perfil explícitos). No inventar hex por página (`canvas-accents` → deprecar en fases posteriores).
2. **Connect / acordeones** — Excepción documentada: en `/dashboard/conectar` los setup por asistente pueden ser acordeones (patrón VU). En el resto de páginas desktop: sin acordeones (regla ui-ux).
3. **Home ≠ hub MCP** — Home = KPIs / operación. Conexión de agente solo en `/dashboard/conectar`. El hub embebido en `/dashboard` se retira en Fase 2–3.

## Anatomía de página (desktop)

```
┌─ Shell ─────────────────────────────────────────┐
│ Rail │ Header fino (brand · org · avatar)       │
│      ├──────────────────────────────────────────┤
│      │ PageFrame (--page-bg)                    │
│      │   PageHeader (título + 1 subtítulo)      │
│      │   ContentCard (--surface-card)           │
│      │     … contenido del trabajo …            │
│      │   (opcional) nota al pie                 │
└──────┴──────────────────────────────────────────┘
```

- Contenedor: `max-width: 1280px` centrado (`Container` xl).
- Título **dentro** de la página, no en el chrome del layout.
- Estados obligatorios: loading / vacío / error / datos.

## Tokens (packages/ui)

| Token | Rol |
|-------|-----|
| `--page-bg` | Fondo del área de contenido (gris claro) |
| `--surface-card` | Superficie blanca de la card principal |
| `--surface-muted` | Campo / fila secundaria dentro de la card |
| `--accent-soft` | Tinte suave del acento activo |
| `--nav-active-bg` | Fondo del ítem de rail activo |
| `--nav-active-bar` | Barra vertical del ítem activo |
| `--radius-page` | Radio de ContentCard (12px, estilo VU) |

Aliases existentes (`--canvas`, `--ink`, `--panel`, `--proof-accent`) se mantienen; los nuevos tokens son la API semántica para páginas VU.

## Primitivos `@fermentrack/ui`

| Componente | Uso |
|------------|-----|
| `PageFrame` | Wrapper de página: padding + max-width + `--page-bg` |
| `ContentCard` | Card blanca principal (borde fino, `--radius-page`) |
| `CopyField` | Valor de solo lectura + botón Copiar |
| `SetupAccordion` | Fila expandible para setup (solo Connect / móvil) |

Storybook: `VuPage` stories.

## Do / Don’t

**Do**

- Usar primitivos + tokens del preset.
- Un CTA primario por sección.
- i18n en `es-MX` y `en-US`.

**Don’t**

- Hex / `text-[13px]` / `notion-styles`.
- Ask bar o `ConnectedProofAIBar` en páginas operativas (retirar en fases 4+).
- Modificar `WinemakerMobileHome`, `BottomNav`, `WinemakerMobileNav`.
- Embeber el hub MCP en Home.

## Criterio de aceptación por página (fases 1+)

- [x] Fondo `--page-bg` + contenido en `ContentCard` / `VuOpsPage`
- [x] Un título, un trabajo
- [x] Sin Ask bar / AI CTA competidor en ops
- [x] Acentos de página vía `--proof-accent` (no hex por ruta)
- [x] Desktop ≥1024; móvil winemaker idéntico al previo (branch ≤767)
- [x] i18n es-MX + en-US en superficies migradas

Pendiente menor (no bloquea cierre VU): hex decorativos en paletas `COLORS` de cards brewer legacy (intencional). Canvas form i18n (`LoteDetalle`, `ViajePendienteDetalle`) ✅.

## Roadmap

| Fase | Scope |
|------|--------|
| **0** | Spec + tokens + primitivos + Storybook ✅ |
| **1** | Shell desktop (fondo `--page-bg`, header fino sin Ask, rail `--nav-active-*`) ✅ |
| **2** | Connect 1:1 VU (`PageFrame`/`ContentCard`/`CopyField`/`SetupAccordion`); Home ≠ hub ✅ |
| **3** | Homes desktop: KPIs distributor/distiller + `WinemakerDesktopHome` en `PageFrame`/`ContentCard` ✅ |
| **4** | Ops distributor: Inventario, Pedidos, Recepción, Movimientos, Clientes, Productos + sin AI bars ✅ |
| **5** | Winemaker desktop: Lotes, Bodega, Documentos, Proveedores, Gastos, Agenda, Lab, Equipo + detalle lote (`VuOpsPage`, móvil intacto) ✅ |
| **6** | Distiller + legacy + Settings: destilador/*, remisiones, productores, crédito (PageFrame), settings (PageFrame), brewer legacy shells ✅ |
| **7** | Hardening: detalle pedidos/clientes/productos, tokens residuales, `canvas-accents` → `--proof-accent`, QA V1–V12 ✅ |
