# PROOF · BYOA + MCP

Documento de referencia para el epic [#24](https://github.com/paunrv/fermentrack/issues/24).  
Define el modelo BYOA, alcance por fases, catálogo de tools y criterios de aceptación.

---

## Problema

PROOF trata al agente como navegación, pero **sigue hospedando el LLM** vía `ANTHROPIC_API_KEY` en varios puntos del servidor. Eso implica costo, lock-in con Anthropic, y una arquitectura partida: la mayoría de flujos de valor ya evitan el LLM (parsers determinísticos en español).

**Solución:** exponer capacidades operacionales como **servidor MCP**; el usuario conecta su propio agente (Claude Desktop, Cursor, ChatGPT, etc.). PROOF deja de pagar y ejecutar inferencias.

---

## Decisiones de producto

| Tema | Decisión |
|------|----------|
| Visión / fotos | El agente externo del usuario extrae datos; empuja JSON estructurado vía MCP write tools |
| UI in-app | **Connection hub** — URL MCP, OAuth, docs de setup; sin chat conversacional hospedado |
| Auth | OAuth 2.1 MCP scoped a Clerk user + org activa (ver [ORG-TENANCY.md](./ORG-TENANCY.md)) |

---

## Arquitectura

```
Usuario (agente externo + visión propia)
        │
        │  OAuth + MCP tools
        ▼
PROOF MCP server  ──►  Supabase + RLS
        ▲
        │  setup URL + OAuth
Connection hub UI (dashboard)
```

**Ejemplo — recepción con foto:**
1. Usuario fotografía remisión en su agente.
2. Agente extrae `{ proveedor, lineas[], fecha }`.
3. Agente llama `import_recepcion_draft` o `confirmar_recepcion`.
4. PROOF valida schema y escribe vía RPCs existentes.

---

## Inventario de IA hospedada (a eliminar)

| Archivo | Rol |
|---------|-----|
| `apps/web/src/app/api/chat/route.ts` | Proxy Anthropic genérico |
| `apps/web/src/app/api/proof/contexto/route.ts` | Agente SSE — quick answers + fallback LLM |
| `apps/web/src/app/api/credito/redactar-cobro/route.ts` | Redacción de cobro |
| `apps/web/src/app/api/recepciones/analizar-foto/route.ts` | Visión recepción |
| `apps/web/src/lib/proof/winemaker-ticket-vision.ts` | Visión tickets winemaker |
| `apps/web/src/app/dashboard/agente/page.tsx` | Chat legacy |
| `apps/web/src/app/dashboard/productos/nueva/page.tsx` | Sugerencias AI en formulario |
| `apps/web/src/app/dashboard/muestras/page.tsx` | Llamadas Anthropic directas |

**Reutilizar (sin LLM):** `agent-context-server.ts`, intent parsers, agent actions, display cards, acceso Supabase con RLS.

---

## Catálogo MCP (borrador)

### Read — Distribuidor
- `list_skus`
- `get_inventory_summary`
- `list_pedidos`
- `get_credito_resumen`
- `list_ordenes_compra`

### Read — Winemaker
- `list_lotes`
- `list_documentos`
- `get_resumen_bodega`

### Read — Destilador
- `list_corridas`
- `list_viajes`
- `list_lotes`

### Write (fase 2)
- `create_pedido`, `confirmar_entrega`
- `create_orden_compra`, `confirmar_recepcion`
- `import_recepcion_draft` — JSON de visión externa
- `import_winemaker_ticket` — JSON de ticket
- `registrar_pago_cliente`, `editar_sku`
- `get_cobro_context` — datos estructurados; el agente redacta el mensaje

### Resources
- Schemas JSON: pedidos, recepciones, tickets
- Snapshot org/perfil activo

---

## Fases e issues

| Fase | Issue | Descripción |
|------|-------|-------------|
| Epic | [#24](https://github.com/paunrv/fermentrack/issues/24) | BYOA — MCP server (parent) |
| 0 | [#25](https://github.com/paunrv/fermentrack/issues/25) | Spike: MCP read-only + OAuth |
| 1 | [#26](https://github.com/paunrv/fermentrack/issues/26) | Read tools + auth org-scoped |
| 2 | [#27](https://github.com/paunrv/fermentrack/issues/27) | Write tools (paridad agent actions) |
| 3 | [#28](https://github.com/paunrv/fermentrack/issues/28) | Connection hub UI |
| 4 | [#29](https://github.com/paunrv/fermentrack/issues/29) | Eliminar API Anthropic |
| 5 | [#30](https://github.com/paunrv/fermentrack/issues/30) | Hardening + migración |

---

## Criterios de aceptación (epic)

- [ ] `ANTHROPIC_API_KEY` no requerida para flujos core
- [ ] Usuario conecta Claude Desktop o Cursor a MCP staging y lista SKUs de su org
- [ ] Agente externo puede importar draft de recepción y confirmar vía MCP
- [ ] Acceso cross-org bloqueado (test con dos orgs)
- [ ] Dashboard muestra connection hub, no input de chat LLM
- [ ] `npm run build` pasa; rutas Anthropic eliminadas o 410 con link de migración

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Usuarios sin agente externo | Hub con agentes recomendados + formularios manuales |
| Calidad de visión variable | Validación de schema server-side |
| OAuth MCP complejo | Spike fase 0; reutilizar Clerk + org scope |
| Romper chat activo | Fase 4 solo tras paridad write; ventana de deprecación 2 semanas |

---

## Implementación recomendada (v1)

Next.js route `/api/mcp` con `@modelcontextprotocol/sdk`, OAuth siguiendo el patrón [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp).

---

## Qué NO es MCP

- No reemplaza al LLM — el usuario lo trae
- No reemplaza canvas, grid, KPIs, formularios manuales
- MCP es capa delgada sobre RPCs y RLS existentes
