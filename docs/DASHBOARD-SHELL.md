# Dashboard shell (desktop)

Epic [#2](https://github.com/paunrv/fermentrack/issues/2) · Issue [#31](https://github.com/paunrv/fermentrack/issues/31).

## Breakpoints

| Rango | Hook | Shell |
|-------|------|--------|
| ≤767px | `mobile` | Bottom nav o `WinemakerMobileNav` |
| ≥768px | `tablet` / `desktop` | Rail 52px + header sticky |

Ver `apps/web/src/hooks/useBreakpoint.ts`.

## Matriz perfil × ruta

| Área | Rutas | Rail (desktop) | Header |
|------|-------|----------------|--------|
| Canvas | `/dashboard` | Sí | Canvas header (PROOF + badge perfil) |
| Operativo | inventario, pedidos, winemaker/*, … | Sí | Inner header (título + ask + avatar) |
| Canvas-style | `/dashboard/credito` | Sí | Sin inner header (contenido full-bleed) |
| Agente legacy | `/dashboard/agente` | Sí | Sin inner header |

Guards de perfil: `apps/web/src/lib/proof/dashboard-routes.ts`.

## Helpers

`apps/web/src/lib/proof/dashboard-shell.ts`:

- `shouldShowDesktopRail`
- `shouldShowDashboardInnerHeader`
- `isDashboardNavItemActive`

## QA desktop (1280px)

- [ ] Rail visible en `/dashboard` y en inventario — mismo ancho, Inicio activo en canvas
- [ ] Tab recorre rail → settings → compositor ask
- [ ] Winemaker / distribuidor / destilador: ítems de nav acordes al perfil
- [ ] Sin salto brusco de fondo header canvas ↔ páginas operativas
