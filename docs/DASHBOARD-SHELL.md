# Dashboard shell (desktop)

Epic [#2](https://github.com/paunrv/fermentrack/issues/2) · Issue [#31](https://github.com/paunrv/fermentrack/issues/31) · Winemaker owner home Epic [#35](https://github.com/paunrv/fermentrack/issues/35) · [WINEMAKER-HOME.md](./WINEMAKER-HOME.md).

## Breakpoints

| Rango | Hook | Shell |
|-------|------|--------|
| ≤767px | `mobile` | Bottom nav o `WinemakerMobileNav` |
| 768–1023px | `tablet` | Rail 52px (o 220px expandido) + header (padding 20px) |
| ≥1024px | `desktop` | Rail 52px (o 220px expandido) + header sticky |

Ver `apps/web/src/hooks/useBreakpoint.ts` y `docs/DASHBOARD-BREAKPOINTS.md`.

## Winemaker owner en `/dashboard`

Solo el rol **owner** (no team canvas):

| Tier | Componente |
|------|------------|
| `mobile`, `tablet` | `WinemakerMobileHome` (acordeones) |
| `desktop` (≥1024) | `WinemakerDesktopHome` (pipeline + fila inferior, sin acordeones) |

Resolución: `resolveWinemakerOwnerHomeView()` · doc completa en [WINEMAKER-HOME.md](./WINEMAKER-HOME.md).

## Matriz perfil × ruta

| Área | Rutas | Rail (desktop) | Header |
|------|-------|----------------|--------|
| Canvas | `/dashboard` | Sí | Canvas header (PROOF + badge perfil) · **Owner winemaker:** ver [WINEMAKER-HOME.md](./WINEMAKER-HOME.md) |
| Operativo | inventario, pedidos, winemaker/*, … | Sí | Inner header fino (título + badge + avatar). **Sin Ask bar en desktop/tablet** (VU Fase 1). Ask solo en móvil. |
| Canvas-style | `/dashboard/credito`, `/dashboard/conectar` | Sí | Sin inner header (contenido full-bleed / PageFrame) |
| Agente legacy | `/dashboard/agente` | Sí | Sin inner header |

Guards de perfil: `apps/web/src/lib/proof/dashboard-routes.ts`.

Rail agrupado (Epic B): [DASHBOARD-RAIL.md](./DASHBOARD-RAIL.md) · toggle expandido persistido en `localStorage` (`proof_dashboard_rail_expanded`).

**VU shell (Fase 1):** `main` usa `--page-bg` en ≥768; rail active = `--nav-active-bg` + `--nav-active-bar`. Spec: [PROOF-VU-SYSTEM.md](./PROOF-VU-SYSTEM.md).

## Helpers

`apps/web/src/lib/proof/dashboard-shell.ts`:

- `shouldShowDesktopRail`
- `shouldShowDashboardInnerHeader`
- `isDashboardNavItemActive`

## QA desktop (1280px)

Checklist completo: **[DESKTOP-QA.md](./DESKTOP-QA.md)** (es-MX + en-US, viewports, teclado, flujos por perfil).

Resumen rápido:

- [ ] Rail visible en `/dashboard` y en inventario — mismo ancho, Inicio activo en canvas
- [ ] Tab recorre rail → settings → avatar (sin Ask en desktop)
- [ ] Winemaker / distribuidor / destilador: ítems de nav acordes al perfil
- [ ] Fondo `--page-bg` continuo header ↔ contenido en desktop
- [ ] Móvil ≤767: Ask strip en inner header intacto (si aplica)