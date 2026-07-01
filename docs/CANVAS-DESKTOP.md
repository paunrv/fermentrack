# Canvas desktop (wide screens)

Epic [#2](https://github.com/paunrv/fermentrack/issues/2) · Issue [#32](https://github.com/paunrv/fermentrack/issues/32).

## Breakpoint

| Ancho | Layout |
|-------|--------|
| &lt;1280px | Stack vertical: resultados → hilo → compositor (720px max) |
| ≥1280px | Dos columnas: resultados (izq) + conversación (420px der) |

Constante: `PROOF_CANVAS_WIDE_MIN` en `proof-canvas-copy.ts`.  
Hook: `useCanvasWideLayout()`.

## Componentes

| Componente | Rol desktop ancho |
|------------|-------------------|
| `ProofCanvasShell` | Grid 2 columnas, atajos `/` y `Esc` |
| `ProofResultsZone` | Grid fluido en columna izquierda |
| `ProofChatThread` | Hilo scrollable, altura completa de columna |
| `ProofComposer` | Anclado abajo en columna derecha |
| `ProofOrdenCompraPanel` | Grid OC full-width sobre el canvas |

## Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `/` | Focus en compositor (si no estás en un campo) |
| `Esc` | Cierra sub-hub activo (lentes de modo) |

## QA (1280×800)

Checklist completo: **[DESKTOP-QA.md](./DESKTOP-QA.md)** — sección «Canvas ancho».

- [ ] Sin scroll horizontal en canvas vacío y con resultados
- [ ] Distribuidor: OC pendientes usa ancho de columna izquierda
- [ ] Winemaker: modos + ticket hub legibles en columna derecha
- [ ] Hilo crece verticalmente; compositor siempre visible abajo
- [ ] `/` enfoca input; `Esc` cierra sub-hub de compra/venta/ticket
- [ ] Resultados (3+ cards) en grid sin overflow horizontal

## Fuera de alcance

- Cambios al prompt/agente (#21)
- Tablet 768–1279 (#33)
