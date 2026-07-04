# Dashboard shell (desktop)

Epic [#2](https://github.com/paunrv/fermentrack/issues/2) · Issue [#31](https://github.com/paunrv/fermentrack/issues/31) · Winemaker owner home Epic [#35](https://github.com/paunrv/fermentrack/issues/35) · [WINEMAKER-HOME.md](./WINEMAKER-HOME.md).

## Breakpoints

| Rango | Hook | Shell |
|-------|------|--------|
| ≤767px | `mobile` | Bottom nav o `WinemakerMobileNav` |
| 768–1023px | `tablet` | Rail 52px + header (padding 20px) |
| ≥1024px | `desktop` | Rail 52px + header sticky |

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
| Operativo | inventario, pedidos, winemaker/*, … | Sí | Inner header (título + ask + avatar) |
| Canvas-style | `/dashboard/credito` | Sí | Sin inner header (contenido full-bleed) |
| Agente legacy | `/dashboard/agente` | Sí | Sin inner header |

Guards de perfil: `apps/web/src/lib/proof/dashboard-routes.ts`.

Rail agrupado (Epic B): [DASHBOARD-RAIL.md](./DASHBOARD-RAIL.md) · `dashboard-rail.ts` · `DashboardRail.tsx`.

## Helpers

`apps/web/src/lib/proof/dashboard-shell.ts`:

- `shouldShowDesktopRail`
- `shouldShowDashboardInnerHeader`
- `isDashboardNavItemActive`

## QA desktop (1280px)

Checklist completo: **[DESKTOP-QA.md](./DESKTOP-QA.md)** (es-MX + en-US, viewports, teclado, flujos por perfil).

Resumen rápido:

- [ ] Rail visible en `/dashboard` y en inventario — mismo ancho, Inicio activo en canvas
- [ ] Tab recorre rail → settings → compositor ask
- [ ] Winemaker / distribuidor / destilador: ítems de nav acordes al perfil
- [ ] Sin salto brusco de fondo header canvas ↔ páginas operativas
