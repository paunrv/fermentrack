# Dashboard breakpoints

Epic [#2](https://github.com/paunrv/fermentrack/issues/2) · Issue [#33](https://github.com/paunrv/fermentrack/issues/33).

## Tiers

| Rango | `ShellBreakpoint` | Shell | Canvas |
|-------|-------------------|-------|--------|
| ≤767px | `mobile` | Bottom nav / WinemakerMobileNav | Stack 720px |
| 768–1023px | `tablet` | Rail 52px + inner header | Stack 640px, chat 280px |
| 1024–1279px | `desktop` | Rail + inner header | Stack 720px |
| ≥1280px | `desktop` + wide | Rail + inner header | 2 columnas (#32) |

Fuente: `apps/web/src/lib/ui/breakpoints.ts`, `useBreakpoint.ts`.

## Helpers

`apps/web/src/lib/proof/dashboard-shell.ts`:

- `shouldShowDesktopRailForBreakpoint`
- `shouldShowWinemakerMobileNav` / `shouldShowBottomNav`
- `shellHorizontalPadding` / `innerHeaderAskMaxWidth`

`apps/web/src/lib/ui/page-shell.ts`:

- `pagePadding({ breakpoint })` — padding y max-width por tier

## Reglas

- **Tablet ≠ desktop reducido**: padding 20px, títulos 24px, ask bar max 480px.
- **Rail en tablet**: sí (igual que desktop); bottom nav solo en mobile.
- **Winemaker mobile home**: solo `mobile` + canvas.

## QA

Checklist completo: **[DESKTOP-QA.md](./DESKTOP-QA.md)** — sección «Tablet».

- [ ] iPad portrait (~768): rail + inventario sin overflow horizontal
- [ ] iPad landscape (1024): desktop tier, canvas stack 720px
- [ ] Canvas modos winemaker: grid 2 columnas en tablet
- [ ] Pedidos/clientes: filas horizontales en tablet

Ver también: `docs/DASHBOARD-SHELL.md`, `docs/CANVAS-DESKTOP.md`.
