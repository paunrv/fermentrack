# Piloto campo — Winemaker (vinícolas)

Guía corta para la visita con enólogos. Actualizado con el prep de issues `pilot` (#68–#87).

## Decisión OCR (T1)

**MCP-only para este piloto.** La visión hosted de tickets está deshabilitada (`vision_disabled`). No hay upload in-app de tickets en el home del owner.

- Importar tickets: agente externo + tool `import_winemaker_ticket` (hub **Conectar**).
- Evidencia de bodega (pizarrón / lab / foto): captura in-app en **Agenda** o FAB móvil **+** → Foto/Lab.
- Post-ticket: solo CTA **gasto de bodega** (asignar a lote está omitido / mensaje honesto si lo piden).

## Antes de salir (checklist)

- [ ] Login en la cuenta de demo (owner winemaker)
- [ ] Abrir `/dashboard?tour=0` una vez (marca el tour como visto; no interrumpe la demo)
- [ ] Verificar lotes activos visibles en home pipeline **y** en nav Lotes
- [ ] Probar captura agenda en un día pasado → aparece en ese día
- [ ] Probar abrir evidencia desde agenda / documentos
- [ ] Hub **Conectar**: JWT fresco + test-connection OK (token ~1h) — ver dry-run abajo
- [ ] Device: laptop desktop (≥1024px) + teléfono para captura
- [ ] Plan B offline: demo solo UI (pipeline, agenda, bodega, detalle) sin MCP

## Datos demo HUMI

- Org: HUMI (owner)
- Lote pipeline de prueba: `HUMI-PILOTO-001` (etapa fermentación) — creado vía MCP `crear_lote`
- `get_resumen_bodega` y `list_lotes` deben coincidir (ambos sobre `public.lots`)

## Dry-run MCP (#82) — día antes

Hacerlo en la **laptop de campo**, con la misma red/cuenta que usarás en la visita.

1. Login owner → `/dashboard/conectar`
2. Confirmar que el token **no** aparece como expirado (si está rojo: recarga sesión / vuelve a login)
3. Pulsar **Probar conexión** → debe responder OK
4. Copiar config Cursor/Claude desde el hub (o pegar JWT en headers)
5. Desde el agente, correr en orden:

```
list_lotes (winemaker)
get_resumen_bodega (winemaker)
```

Opcional si hay ticket de prueba:

```
import_winemaker_ticket
```

6. Si falla: Plan B = solo UI. No improvisar OAuth (`PROOF_MCP_OAUTH_ENABLED` off).

Detalle auth: [PROOF-BYOA-MCP.md](./PROOF-BYOA-MCP.md) (Bearer JWT de sesión browser).

**Nota:** un dry-run desde Cursor cloud/IDE remoto puede fallar si el MCP `user-proof` no tiene sesión; el dry-run válido es en la laptop de demo.

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
| Agenda + fecha seleccionada | Captura usa el día del calendario |
| Viewer evidencia | Agenda + Documentos (signed URL) |
| Lista lotes = pipeline | Tabla `lots` |
| Conectar (bottom nav) | `/dashboard/conectar` |
| Errores de lista | No se disfrazan de empty |
| Fallo al completar tarea | Mensaje visible en home |
| Tour skip | `/dashboard?tour=0` |

## Qué evitar / decir con honestidad

| Tema | Qué decir |
|------|-----------|
| Ticket OCR in-app | “Lo importamos con el agente conectado (MCP), no desde un botón de cámara de tickets en la app.” |
| Asignar ticket a lote | “En este piloto lo dejamos como gasto de bodega; asignar a lote viene después.” |
| Voz / Nota en FAB | Ocultos en piloto; no disponibles aún |
| Non-owner / member | Home owner es el path de demo; otros roles ven ops genérico |
| Tour | Usar `?tour=0` al arrancar; `?tour=1` solo si quieren ver el onboarding |
| Crear lote in-app | Empty state apunta a MCP / cosecha |

## Prompts MCP útiles (si hay laptop con agente)

```
¿Cuál es el resumen de mi bodega?
Lista mis lotes activos
Importa este ticket de compra (adjunto)
```

## Issues piloto

- Epic captura: #68 (cerrado)
- Epic lotes: #69 (cerrado)
- Epic tickets/MCP: #70 — queda dry-run humano #82
- Epic UX campo: #71 (cerrado)

Filtro: `label:pilot` en GitHub.
