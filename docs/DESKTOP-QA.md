# QA desktop — Epic #2 + Winemaker home (#35)

Epic [#2](https://github.com/paunrv/fermentrack/issues/2) · Issue [#34](https://github.com/paunrv/fermentrack/issues/34) · Winemaker owner home [#35](https://github.com/paunrv/fermentrack/issues/35) · [#43](https://github.com/paunrv/fermentrack/issues/43).

Checklist reproducible antes de cerrar releases de UX desktop. Complementa:

- [DASHBOARD-SHELL.md](./DASHBOARD-SHELL.md) — shell y rail
- [CANVAS-DESKTOP.md](./CANVAS-DESKTOP.md) — canvas ≥1280px
- [DASHBOARD-BREAKPOINTS.md](./DASHBOARD-BREAKPOINTS.md) — tablet 768–1023
- [WINEMAKER-HOME.md](./WINEMAKER-HOME.md) — owner pipeline desktop
- [PROOF-VU-SYSTEM.md](./PROOF-VU-SYSTEM.md) — sistema VU (Fase 0–1 shell)

---

## Shell VU (Fase 1) · VU shell

Viewports: **768**, **1024**, **1280** · Móvil **375** = sin regresión

| # | Paso | ✓ |
|---|------|---|
| V1 | Desktop/tablet: `main` fondo `--page-bg` (gris), no blanco puro | ☐ |
| V2 | Rail ítem activo: tinte `--nav-active-bg` + barra `--nav-active-bar` | ☐ |
| V3 | Inner header desktop: título + badge + avatar — **sin** Ask/camera | ☐ |
| V4 | Móvil ≤767: Ask strip en inner header (si aplica) intacto | ☐ |
| V5 | `/dashboard/conectar` — PageFrame + ContentCard + CopyField; acordeones setup | ☐ |
| V6 | `/dashboard` (no owner) — KPIs en cards + CTA a `/conectar` (no hub embebido) | ☐ |
| V7 | Winemaker owner desktop — `PageFrame` + pipeline en `ContentCard` | ☐ |
| V8 | Inventario / Pedidos / Recepción / Movimientos / Clientes / Productos — `VuOpsPage`, sin AI bar | ☐ |
| V9 | Winemaker ≥768: Lotes, Bodega, Documentos, Proveedores, Gastos, Agenda, Lab, Equipo — `VuOpsPage`; móvil ≤767 idéntico | ☐ |
| V10 | Distiller: Compras / Lotes / Producción / Bodega / Ventas (+ forms) — `VuOpsPage` | ☐ |
| V11 | Settings — `PageFrame` + cards; Remisiones / Productores — `VuOpsPage`; Crédito — `PageFrame` (canvas KPIs) | ☐ |
| V12 | Detalle Pedidos / Clientes / Productos (+ nuevo) — shell VU; inputs `--surface-card`; sin AI bar | ☐ |
| V13 | Hardening: `canvas-accents` resuelve a `--proof-accent`; dropdown avatar `--surface-card` | ☐ |

## Pre-requisitos · Prerequisites

| | es-MX | en-US |
|---|-------|-------|
| Entorno | `npm install` en raíz (construye `@fermentrack/ui`) | Root `npm install` (builds `@fermentrack/ui`) |
| Dev | `npm run dev` → http://localhost:3000 (web) | Same |
| Cuentas | Perfil **distribuidor**, **winemaker** (team + owner), **destilador** de prueba | Same test profiles |
| Locale | Probar al menos una pasada en **es-MX** y una en **en-US** (settings o landing toggle) | Same |

**Build smoke (CI local):**

```bash
npm run build --workspace=apps/web
npm run test --workspace=apps/web
```

---

## Viewports

Probar cada bloque relevante en:

| Viewport | Tier | Uso |
|----------|------|-----|
| **1280×800** | desktop + canvas wide | Flujo principal epic #2 |
| **1440×900** | desktop + canvas wide | Densidad y márgenes amplios |
| **1024×768** | desktop (stack canvas) | Laptop / iPad landscape |
| 768×1024 (opcional) | tablet | Ver [DASHBOARD-BREAKPOINTS.md](./DASHBOARD-BREAKPOINTS.md) |

**Criterio global:** sin scroll horizontal accidental en rutas del flujo mínimo.

---

## Shell común (≥1024) · Common shell

| # | es-MX | en-US | ✓ |
|---|-------|-------|---|
| S1 | Rail 52px visible en `/dashboard` **y** en inventario | Same rail width on canvas and inventory | ☐ |
| S2 | Ítem **Inicio** activo (`aria-current`) en canvas | Home nav item active on canvas | ☐ |
| S3 | Mismo fondo header (`--ink`) canvas ↔ página operativa | No jarring header background jump | ☐ |
| S4 | Nav del rail acorde al perfil (sin rutas ajenas) | Profile-appropriate rail items | ☐ |
| S5 | **Ajustes** al pie del rail abre `/dashboard/settings` | Settings at rail bottom works | ☐ |
| S6 | Cambio es-MX ↔ en-US: labels del rail y títulos traducidos | Locale switch updates shell copy | ☐ |

---

## Teclado · Keyboard

| # | es-MX | en-US | ✓ |
|---|-------|-------|---|
| K1 | **Tab** recorre: rail (links) → header (ask/avatar) → contenido | Tab order: rail → header → main | ☐ |
| K2 | **Tab** en canvas: modos → compositor → enviar | Canvas tab reaches composer | ☐ |
| K3 | **`/`** enfoca compositor (canvas) si no hay focus en input | `/` focuses composer | ☐ |
| K4 | **`Esc`** cierra sub-hub (compra/venta/ticket) en canvas | `Esc` closes active sub-hub | ☐ |
| K5 | **Enter** en rail link navega; focus visible en links (`:focus-visible`) | Rail keyboard activation + focus ring | ☐ |

---

## Canvas ancho (≥1280) · Wide canvas

| # | es-MX | en-US | ✓ |
|---|-------|-------|---|
| C1 | Dos columnas: resultados (izq) + conversación 420px (der) | Two-column results + conversation | ☐ |
| C2 | Compositor siempre visible abajo (columna derecha) | Composer pinned bottom-right | ☐ |
| C3 | Grid de resultados sin overflow horizontal (3+ cards) | Results grid no horizontal scroll | ☐ |
| C4 | Distribuidor: panel OC usa ancho columna izquierda | Distributor OC panel uses left column | ☐ |
| C5 | Winemaker: modos + ticket hub legibles en columna derecha | Winemaker modes readable in right column | ☐ |

---

## Flujo distribuidor · Distributor

Perfil: `distributor` · Viewports: 1280×800, 1440×900, 1024×768

| # | Paso · Step | ✓ |
|---|-------------|---|
| D1 | **Canvas** `/dashboard` — modos compra/venta/bodega (sin Ask en header desktop) | ☐ |
| D2 | **Inventario** `/dashboard/inventario` — lista SKUs, rail activo con tint `--nav-active-bg`, sin Ask bar desktop | ☐ |
| D3 | **Pedido nuevo** `/dashboard/pedidos/nuevo` — formulario usable, sin overflow | ☐ |
| D4 | **Recepción** `/dashboard/recepcion` — pantalla carga sin layout roto | ☐ |
| D5 | **Crédito** `/dashboard/credito` — canvas-style full-bleed, sin inner header duplicado | ☐ |
| D6 | Volver a canvas: rail **Inicio** activo, sin salto de chrome | ☐ |

---

## Flujo winemaker (team) · Winemaker team

Perfil: winemaker con acceso team (no solo owner mobile home)

| # | Paso · Step | ✓ |
|---|-------------|---|
| W1 | **Canvas** — modos ticket / bodega / agenda | ☐ |
| W2 | **Subir ticket** (selector o archivo) — mensaje en hilo, sin error de layout | ☐ |
| W3 | **Documentos** `/dashboard/winemaker/documentos` — lista y rail winemaker | ☐ |
| W4 | i18n: placeholders y modos en locale activo | ☐ |

---

## Winemaker (owner) · Owner home

Doc: [WINEMAKER-HOME.md](./WINEMAKER-HOME.md) · Cuenta owner winemaker · Viewports: 375×667, 768×1024, 1280×800, 1024×768

| # | es-MX | en-US | ✓ |
|---|-------|-------|---|
| O1 | **≤767**: `WinemakerMobileHome` + bottom nav — acordeones, CTA MCP, cero regresión vs pre-Epic A | Same mobile home unchanged | ☐ |
| O2 | **768–1023**: owner sigue en `WinemakerMobileHome` con **rail + header** (tablet) | Tablet: mobile home inside desktop shell | ☐ |
| O3 | **≥1024**: `WinemakerDesktopHome` — **ningún acordeón**; pipeline + fila inferior visibles sin clicks | Desktop: no accordions; pipeline + bottom row always visible | ☐ |
| O4 | Pipeline: 6 columnas de etapa siempre visibles; vacías muestran «—» y contador 0 | Empty stages show dash + zero count | ☐ |
| O5 | Lote con >5 días sin registro se distingue en tarjeta (badge / estilo) sin abrir detalle | Stale lot visible on card without opening detail | ☐ |
| O6 | Click tarjeta de lote → detalle `/dashboard/winemaker/lotes/[id]` | Lot card navigates to detail | ☐ |
| O7 | Header: pill salud + pill agente (conectado) o CTA conectar (desconectado) | Health + agent pills / connect CTA | ☐ |
| O8 | Fila inferior: tareas pendientes, calendario hoy, tarjeta agente (token + última tool si hay audit) | Bottom row tasks, calendar, MCP status card | ☐ |
| O9 | Contenedor desktop max **1280px** centrado; sin scroll horizontal a 1280×800 | Centered 1280px, no horizontal overflow | ☐ |
| O10 | i18n: etapas del pipeline y strings desktop en es-MX y en-US | Pipeline stage labels localized | ☐ |

---

## Flujo destilador · Distiller

Perfil: `distiller` · cuando hay datos de prueba

| # | Paso · Step | ✓ |
|---|-------------|---|
| X1 | **Canvas** `/dashboard` — quick actions / bienvenida destilador | ☐ |
| X2 | Rutas core accesibles desde rail sin 404 ni nav ajena | ☐ |
| X3 | Sin paths de distribuidor/winemaker en rail | ☐ |

---

## Tablet (1024×768 y 768 portrait) · Optional regression

| # | Check | ✓ |
|---|-------|---|
| T1 | 1024×768: rail + canvas stack 720px (no columnas wide) | ☐ |
| T2 | 768 portrait: rail, padding ~20px, inventario sin overflow | ☐ |
| T3 | Modos winemaker en grid 2 columnas (tablet CSS) | ☐ |

---

## Sign-off · Cierre

| Campo | Valor |
|-------|--------|
| Fecha / Date | |
| Revisor / Reviewer | |
| Commit / branch | |
| Viewports probados | ☐ 1280×800 ☐ 1440×900 ☐ 1024×768 ☐ 375×667 (owner mobile) |
| Locales probados | ☐ es-MX ☐ en-US |
| Issues abiertos | |

**Epic #2 hijos:** #31 shell · #32 canvas wide · #33 tablet · #34 este checklist.

Cuando todos los ítems del flujo mínimo (D*, W*, S*, K*, C* en 1280) pasen, se puede cerrar el epic #2.
