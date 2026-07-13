# Piloto campo — Winemaker (vinícolas)

Guía corta para la visita con enólogos. Actualizado con el prep de issues `pilot` (#68–#87).

## Decisión OCR (T1)

**MCP-only para este piloto.** La visión hosted de tickets está deshabilitada (`vision_disabled`). No hay upload in-app de tickets en el home del owner.

- Importar tickets: agente externo + tool `import_winemaker_ticket` (hub **Conectar**).
- Evidencia de bodega (pizarrón / lab / foto): captura in-app en **Agenda** o FAB móvil **+** → Foto/Lab.

## Antes de salir (checklist)

- [ ] Login en la cuenta de demo (owner winemaker)
- [ ] Abrir `/dashboard?tour=0` una vez (marca el tour como visto; no interrumpe la demo)
- [ ] Verificar lotes activos visibles en home pipeline **y** en nav Lotes
- [ ] Probar captura agenda en un día pasado → aparece en ese día
- [ ] Probar abrir evidencia desde agenda / documentos
- [ ] Hub **Conectar**: JWT fresco + test-connection OK (token ~1h)
- [ ] Device: laptop desktop (≥1024px) + teléfono para captura
- [ ] Plan B offline: demo solo UI (pipeline, agenda, bodega, detalle) sin MCP

## Flujo feliz (script ~20–25 min)

1. **Home desktop** — pipeline por etapa; tap un lote → detalle (lineage / lab / embotellado).
2. **Agenda** — calendario; capturar pizarrón o lab; abrir la foto del día.
3. **Lotes** — misma lista que el pipeline; abrir detalle desde la lista.
4. **Bodega** — producto terminado + registrar salida (si hay existencia).
5. **Conectar** — mostrar agente MCP; opcional: `list_lotes` / `get_resumen_bodega` / `import_winemaker_ticket`.

## Qué sí funciona hoy

| Flujo | Notas |
|-------|--------|
| Onboarding owner → org | OK |
| Desktop home pipeline → detalle | ≥1024px |
| Mobile home | Sin pipeline board (acordeones) |
| FAB `+` → Foto / Lab | Abre captura de agenda |
| Agenda + fecha seleccionada | Captura fechase al día del calendario |
| Viewer evidencia | Agenda + Documentos (signed URL) |
| Lista lotes = pipeline | Tabla `lots` |
| Conectar (bottom nav) | `/dashboard/conectar` |
| Errores de lista | No se disfrazan de empty |
| Fallo al completar tarea | Mensaje visible en home |

## Qué evitar / decir con honestidad

| Tema | Qué decir |
|------|-----------|
| Ticket OCR in-app | “Lo importamos con el agente conectado (MCP), no desde un botón de cámara de tickets en la app.” |
| Voz / Nota en FAB | Ocultos en piloto; no estánibles aún |
| Non-owner / member | Home owner es el path de demo; otros roles ven ops genérico |
| Tour | Usar `?tour=0` al arrancar; `?tour=1` solo si quieren ver el onboarding |
| Crear lote in-app | Empty state apunta a MCP / cosecha; no hay form mínimo aún (#79) |

## Prompts MCP útiles (si hay laptop con agente)

```
¿Cuál es el resumen de mi bodega?
Lista mis lotes activos
Importa este ticket de compra (adjunto)
```

Ver también: [PROOF-BYOA-MCP.md](./PROOF-BYOA-MCP.md).

## Issues piloto

- Epic captura: #68
- Epic lotes: #69
- Epic tickets/MCP: #70
- Epic UX campo: #71

Filtro: `label:pilot` en GitHub.
