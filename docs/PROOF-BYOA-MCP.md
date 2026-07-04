# PROOF · BYOA / MCP (Bring Your Own Agent)

Epic [#24](https://github.com/paunrv/fermentrack/issues/24) · Phase 0 [#25](https://github.com/paunrv/fermentrack/issues/25).

External agents (Claude Desktop, Cursor, etc.) connect to PROOF via the [Model Context Protocol](https://modelcontextprotocol.io/) instead of the hosted Anthropic API in `/api/proof/contexto`.

## Phase 0 spike (implemented)

| Piece | Location |
|-------|----------|
| MCP route (Streamable HTTP) | `GET/POST/DELETE /api/mcp` → `apps/web/src/app/api/[transport]/route.ts` |
| OAuth resource metadata (RFC 9728) | `GET /.well-known/oauth-protected-resource` |
| Auth | Supabase access token (`Authorization: Bearer <jwt>`) |
| Read tool | `list_skus` — distributor SKUs scoped by RLS |

### Auth flow (spike)

1. User signs in to PROOF (Supabase Auth) in the browser.
2. Obtain a **Supabase access token** (session JWT) from the logged-in session — e.g. DevTools → Application → cookies / or `supabase.auth.getSession()` in console while signed in.
3. MCP client sends `Authorization: Bearer <access_token>` on each request.
4. Server validates JWT via `supabase.auth.getUser(token)` and runs tools with a Supabase client that forwards the same token (RLS applies).

**OAuth 2.1 metadata:** MCP clients discover the authorization server at `{NEXT_PUBLIC_SUPABASE_URL}/auth/v1` via the protected-resource metadata endpoint. Full OAuth authorization-code flow for headless clients is **Phase 1+**; Phase 0 uses bearer tokens from an existing browser session.

### Cursor / Claude Desktop config

Streamable HTTP (Cursor 2026+):

```json
{
  "mcpServers": {
    "proof": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SUPABASE_ACCESS_TOKEN"
      }
    }
  }
}
```

Legacy stdio bridge:

```json
{
  "mcpServers": {
    "proof": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp", "--header", "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN"]
    }
  }
}
```

Replace production URL and rotate tokens; never commit tokens.

## Tool catalog (planned mapping)

Future MCP tools map from existing agent actions and Supabase loaders.

### Distributor (`distributor-agent-actions.ts`)

| MCP tool (planned) | Agent action / loader |
|--------------------|------------------------|
| `list_skus` | ✅ `fetchSkus` (Phase 0) |
| `get_sku` | `fetchSkuById` |
| `update_sku_price` | `actualizar_precio` |
| `add_sku_note` | `agregar_nota` |
| `create_sales_order` | `crear_toma_pedido` |
| `update_order_status` | `actualizar_estado_pedido` |
| `confirm_delivery` | `confirmar_entrega` |
| `register_payment` | `registrar_pago` |
| `create_purchase_order` | `crear_orden_compra` |
| `confirm_po_arrival` | `confirmar_llegada_distribuidor` |
| `register_supplier_payment` | `registrar_pago_proveedor` |
| `generate_delivery_note` | `generar_remision` |
| `update_deposit_info` | `actualizar_mi_informacion` |

### Distiller (`distiller-agent-actions.ts`)

| MCP tool (planned) | Agent action |
|--------------------|--------------|
| `list_lotes` | lot context loaders |
| `confirm_trip_arrival` | viaje confirm |
| `update_bottling_date` | lote update |
| `update_sale_price` | lote pricing |

### Winemaker (`winemaker-agent-actions.ts`)

| MCP tool (planned) | Agent action |
|--------------------|--------------|
| `list_lotes` | winemaker context |
| `assign_document_to_lot` | document actions |
| `upload_ticket` | ticket OCR flow |

### Context / read-only (all profiles)

| MCP tool (planned) | Source |
|--------------------|--------|
| `get_agent_context` | `loadIsolatedAgentContext` / `loadDistributorAgentContext` |

Write tools require explicit confirmation scopes in Phase 2+.

## Implementation notes

- **Package:** `mcp-handler` + `@modelcontextprotocol/sdk` (≥1.26.0) in `apps/web`.
- **Per-request context:** `AsyncLocalStorage` in `lib/mcp/request-context.ts` carries `userId` + token into tool handlers after `withMcpAuth`.
- **Profile scope:** Phase 0 `list_skus` uses `resolveDistribuidorScope` (distributor default). Multi-profile users may need an explicit `profile_type` argument in Phase 1.
- **Deployment:** Same Next.js app on Vercel; route `maxDuration` 60s. No separate MCP process.

## Validation checklist (Phase 0)

- [x] `GET /.well-known/oauth-protected-resource` → JSON metadata (`authorization_servers` → Supabase Auth)
- [x] MCP `tools/list` without token → `401` + `WWW-Authenticate` bearer challenge
- [x] `listSkusTool` unit test with authenticated MCP context → SKU JSON payload
- [ ] MCP `list_skus` with valid Supabase JWT in Cursor → manual (see config below)

Validated locally on 2026-07-02:

```bash
curl -s http://localhost:3000/.well-known/oauth-protected-resource
# {"resource":"http://localhost:3000","authorization_servers":["https://<project>.supabase.co/auth/v1"]}

curl -i -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# HTTP/1.1 401 Unauthorized
```

### Cursor config (manual validation)

1. Sign in to PROOF in the browser.
2. In DevTools console: `const { data } = await supabase.auth.getSession(); copy(data.session.access_token)`
3. Add to Cursor MCP settings (`~/.cursor/mcp.json` or project config):

```json
{
  "mcpServers": {
    "proof": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SUPABASE_ACCESS_TOKEN"
      }
    }
  }
}
```

4. Restart MCP in Cursor → `list_skus` should appear; invoke it to list distributor SKUs (RLS applies).

## Phase 1 read tools (implemented — #26)

Auth remains Supabase bearer JWT (RLS). Tools accept optional `profile_type` and `organization_id` for multi-profile / multi-org users.

| Profile | MCP tool | Loader |
|---------|----------|--------|
| All | `get_session_snapshot` | `resolveMcpScope` + schema hints |
| Distributor | `list_skus` | `fetchSkus` |
| Distributor | `get_inventory_summary` | `buildDistributorAgentContext().resumen` |
| Distributor | `list_pedidos` | `fetchPedidos` |
| Distributor | `get_credito_resumen` | `fetchCreditoCxCResumen` |
| Distributor | `list_ordenes_compra` | `fetchOrdenesCompraDistribuidorPendientes` |
| Winemaker | `list_lotes` | `loadWinemakerPipelineMcpContext` → `public.lots` + `etapa`, `dias_sin_registro` ([#44](https://github.com/paunrv/fermentrack/issues/44)) |
| Winemaker | `list_documentos` | `fetchDocuments` |
| Winemaker | `get_resumen_bodega` | `fetchWinemakerSummary` + pipeline `salud` / `conteo_por_etapa` ([#44](https://github.com/paunrv/fermentrack/issues/44)) |
| Winemaker | `list_etiquetas` | `fetchFinishedGoodsInventory` → grouped etiqueta → existencia ([#57](https://github.com/paunrv/fermentrack/issues/57)) |
| Distiller | `list_corridas` | `fetchCorridas` |
| Distiller | `list_viajes` | `fetchViajes` + `fetchProductosViaje` |
| Distiller | `list_lotes_distiller` | `fetchLotesForAgent` |

**Org scoping:** Winemaker tools resolve `organization_id` via `fetchWinemakerOrganizationIdForUser` (membership required). Cross-org access is rejected at scope resolution.

**Client example (winemaker org):**

```json
{
  "mcpServers": {
    "proof": {
      "url": "http://localhost:3000/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_SUPABASE_ACCESS_TOKEN" }
    }
  }
}
```

Call `get_session_snapshot` first, then profile tools with `profile_type` / `organization_id` if needed.

### Winemaker pipeline tools (Epic A — #44)

`list_lotes` and `get_resumen_bodega` read **`public.lots`** (pipeline `etapa`) plus `public.events` for `dias_sin_registro` and attention. Legacy `wm_wine_lots.status` counts remain in `resumen.porEstado` inside `get_resumen_bodega` only.

**`list_lotes` response (excerpt):**

```json
{
  "organization_id": "…",
  "salud": "requiere_atencion",
  "count": 2,
  "lotes": [{
    "id": "…",
    "code": "LOT-2026-001",
    "etapa": "fermentacion",
    "dias_sin_registro": 8,
    "varietal": "Chardonnay",
    "requiere_atencion": true,
    "contenedor": "Tanque 3",
    "ultima_medicion": "17°C · 20.1°Bx"
  }]
}
```

**`get_resumen_bodega` pipeline fields:**

```json
{
  "salud": "todo_en_orden",
  "lotes_requieren_atencion": 0,
  "conteo_por_etapa": {
    "cosecha": 1,
    "analisis": 0,
    "fermentacion": 2,
    "malolactica": 0,
    "crianza": 0,
    "embotellado": 0
  },
  "pipeline": { "…": "same object" }
}
```

Loader: `apps/web/src/lib/mcp/winemaker-pipeline-context.ts` · doc: [WINEMAKER-HOME.md](./WINEMAKER-HOME.md).

Example agent prompt: *«Resume el estado de mi bodega»* → call `get_resumen_bodega`.

All write tools accept optional `idempotency_key` (min 8 chars). Duplicate keys return the first result with `idempotent_replay: true`.

Winemaker writes require org role `owner`, `admin`, or `member` — **viewer is blocked**.

| Tool | Profile | Wraps |
|------|---------|-------|
| `create_pedido` | distributor | `executeDistributorAgentAction` → `crear_toma_pedido` |
| `confirmar_entrega` | distributor | `confirmar_entrega` |
| `create_orden_compra` | distributor | `crear_orden_compra` |
| `confirmar_recepcion` | distributor | `confirmar_llegada_distribuidor` |
| `import_recepcion_draft` | distributor | `createRecepcionDraft` + line items (Zod validated) |
| `registrar_pago_cliente` | distributor | `registrar_pago` |
| `editar_sku` | distributor | `editar_sku` |
| `get_cobro_context` | distributor | `fetchDetalleClienteCredito` (structured, no hosted LLM) |
| `import_winemaker_ticket` | winemaker | `processTicketUpload` from extraction JSON |
| `registrar_salida` | winemaker | `recordWmSalida` — `origen = mcp`, optional `preview_only` ([#57](https://github.com/paunrv/fermentrack/issues/57)) |

**Import schemas:** `lib/mcp/schemas/recepcion-draft.ts`, `lib/mcp/schemas/winemaker-ticket.ts`

### Winemaker finished goods (Epic D — #57)

**`list_etiquetas`** — grouped cellar inventory (`wm_etiquetas` → `wm_existencias` + derived salidas). Filters: `anada`, `formato`, `etiqueta_id`.

```json
{
  "organization_id": "…",
  "etiquetas": [{
    "etiqueta_id": "…",
    "nombre": "Nebbiolo Reserva",
    "total_disponibles": 96,
    "existencias": [{
      "existencia_id": "…",
      "anada": 2023,
      "formato": "750ml",
      "lote_origen": "LOT-2023-004",
      "botellas_por_caja": 12,
      "producidas": 480,
      "consumidas": 384,
      "disponibles": 96,
      "cajas_disponibles": 8,
      "sueltas": 0
    }]
  }]
}
```

**`registrar_salida`** — deduct stock from an existencia. Params: `existencia_id`, `tipo`, `cantidad`, `unidad` (`cajas`|`botellas`), optional `rango_inicio`/`rango_fin` (Enterprise only), optional `preview_only` (validate conversion without insert). Audit: `mcp_tool_calls` via `withMcpWriteScope`.

**Enterprise gating (D6):** `rango_inicio` / `rango_fin` require `orgHasFeature(org, 'numeracion_botellas')` — enabled on Enterprise plan or via `organizations.features.numeracion_botellas`. Free/Pro calls with a range return a validation error (no upsell in MCP). See [INVENTARIO-TERMINADO.md](./INVENTARIO-TERMINADO.md#gating-numeración-d6--58).

Example agent flow: `list_etiquetas` → `registrar_salida` with `preview_only: true` → confirm with user → `registrar_salida` without preview.

Loader: `lib/proof/finished-goods-inventory.ts` · doc: [INVENTARIO-TERMINADO.md](./INVENTARIO-TERMINADO.md).

## Epic C — Team chat MCP (implemented — #37)

**`list_mensajes`** — read org chat messages. Params: optional `lote_id`, optional `desde` (ISO timestamp), optional `limit`. Requires `orgHasFeature(org, 'chat')` (Pro+).

**`enviar_mensaje`** — write message as authenticated user. Params: `body`, optional `lote_id`. Sets `origen = mcp`. Audit: `mcp_tool_calls` via `withMcpWriteScope`.

Example agent flow: `list_mensajes` with `lote_id` → summarize thread → `enviar_mensaje` with update for the team.

Loader: `lib/proof/team-chat.ts` · doc: [CHAT.md](./CHAT.md).

## Epic E — Plan limits MCP (implemented — #59 E3)

When a write would exceed `plan_limites`, MCP tools throw **`McpPlanLimitError`** — a JSON payload (in the error message) with:

- `error`: `plan_limit_reached`
- `resource`, `current`, `limit`, `plan`
- `message` — human/agent explanation (data is never deleted)
- `upgrade_path`: `/dashboard/settings`
- `upgrade_hint` — Pro vs Enterprise guidance
- `data_safe`: `true`

Audit: `mcp_tool_calls.status = limit_blocked` (via `withMcpWriteScope`).

| Tool | Limits enforced |
|------|-----------------|
| `crear_lote` | `lotes_activos` |
| `registrar_embotellado` | new `etiquetas` + `memoria` (event) |
| `cambiar_etapa_lote` | `memoria` (STAGE_CHANGED event) |

Helper: `lib/mcp/plan-limit-mcp.ts` · catalog: [PLANES.md](./PLANES.md).

**`crear_lote`** — params: `code`, optional `vintage_id`, `etapa`, `notes`. Creates active row in `public.lots`.

**`registrar_embotellado`** — params: `lot_id`, `etiqueta_id` or `new_etiqueta`, `anada`, `formato`, `botellas_por_caja`, `botellas_producidas`. Same domain as web bottling form.

**`cambiar_etapa_lote`** — params: `lot_id`, `to_etapa`, optional `note`. Appends `STAGE_CHANGED` and updates pipeline stage.

Example agent flow on limit: tool fails with JSON payload → agent explains limit → offers `/dashboard/settings` upgrade → user can still read all historical data via read tools.

## Phase 3 connection hub UI (implemented — #28)

The dashboard home (`/dashboard`) is a **connection hub** instead of hosted in-app chat. Users copy the MCP URL and Supabase access token, follow setup cards for Cursor / Claude Desktop / other MCP clients, browse profile-scoped tools, example prompts, and manual form fallbacks.

| Piece | Location |
|-------|----------|
| Hub page | `apps/web/src/app/dashboard/page.tsx` → `ProofConnectionHub` |
| Hub component | `apps/web/src/components/proof/ProofConnectionHub.tsx` |
| MCP URL + token copy | `apps/web/src/hooks/useMcpConnectionInfo.ts` |
| Tool / prompt / manual links | `apps/web/src/lib/proof/connection-hub-tools.ts` |
| i18n | `connectionHub` namespace in `messages/es-MX.json`, `messages/en-US.json` |

**Routing changes:**

- `/dashboard/agente` redirects to `/dashboard` (no separate chat route).
- Bottom nav item **Conectar** (`bottomNav.items.conectar`) replaces chat; links to `/dashboard`.
- `ConnectedProofAIBar` / `ProofAIBar` are static CTAs to the hub (no `/api/proof/contexto` calls from the bar).
- `useProofContextBar` is deprecated; camera / ask submissions on the dashboard layout no longer open the hosted agent.

**UX:** Signed-in users see OAuth metadata link, copy buttons for URL and bearer token, per-profile tool catalog (read/write badges), example prompts, and deep links to manual workflows (pedidos, recepción, inventario, etc.).

## Phase 4 remove hosted Anthropic API (implemented — #29)

All server-side calls to `api.anthropic.com` were removed. Deprecated routes return **410** with a link to `/dashboard`.

| Former flow | Replacement |
|-------------|-------------|
| `/api/proof/contexto` (agent chat) | Connection hub + MCP tools |
| `/api/chat` (vision proxy) | Manual forms or external MCP agent |
| `/api/credito/redactar-cobro` | Template message in UI + MCP `get_cobro_context` |
| `/api/recepciones/analizar-foto` | Photo evidence + OC line prefill; MCP `import_recepcion_draft` |
| Winemaker ticket vision (`analyzeWinemakerTicketImage`) | MCP `import_winemaker_ticket` or manual document entry |
| `ANTHROPIC_API_KEY` | Not required — removed from `.env.example` and `turbo.json` |

Helper: `apps/web/src/lib/proof/deprecated-hosted-ai.ts`

## Phase 5 hardening, audit log, migration (implemented — #30)

### Audit log

Table `public.mcp_tool_calls` (migration `20260702160000_mcp_tool_calls.sql`):

| Column | Purpose |
|--------|---------|
| `user_id` | Supabase auth user |
| `organization_id` | Winemaker org when applicable |
| `profile_type` | distributor / winemaker / distiller |
| `tool_name` | MCP write tool |
| `idempotency_key` | Optional client key |
| `status` | `success` \| `error` \| `replay` |

Inserts via **service role** in `lib/mcp/audit-log.ts`, hooked from `withMcpWriteScope`.

### Rate limits

Per-user sliding window on `/api/mcp` (`lib/mcp/rate-limit.ts`):

- Default: **120 requests / 60s** per `user_id`
- Override: `MCP_RATE_LIMIT_MAX`, `MCP_RATE_LIMIT_WINDOW_MS`
- Response: **429** + `Retry-After` + JSON `retry_after_seconds`

> In-memory buckets are per server instance; sufficient for MVP. For multi-region strict limits, back with Redis or DB counts.

### Security notes

| Topic | Mitigation |
|-------|------------|
| Tool permissions | RLS on all data paths; winemaker writes require org role owner/admin/member (viewer blocked) |
| Cross-org access | `resolveMcpScope` rejects `organization_id` not in user memberships |
| OAuth / JWT lifecycle | Short-lived Supabase access tokens; clients must refresh after logout; metadata at `/.well-known/oauth-protected-resource` |
| Service role | Audit inserts only — never exposed to browser |
| Hosted LLM | Removed — no `ANTHROPIC_API_KEY` in app or turbo build env |

### Cross-org penetration test checklist

Manual QA before production cutover:

- [ ] User A (winemaker org 1) cannot pass `organization_id` of org 2 to `list_lotes` / `import_winemaker_ticket`
- [ ] Viewer membership cannot call any write tool on that org
- [ ] Distributor JWT cannot read another user's SKUs (RLS `user_id` scope)
- [ ] MCP without bearer → 401
- [ ] Expired / forged JWT → 401
- [ ] Rate limit → 429 with `Retry-After`
- [ ] Write success appears in `mcp_tool_calls` with correct `user_id` and `tool_name`

### User migration

Published: [PROOF-BYOA-MIGRATION.md](./PROOF-BYOA-MIGRATION.md) (linked from connection hub).

**Operators:** remove `ANTHROPIC_API_KEY` from Vercel production/preview env after deploy.

## Epic complete

| Phase | Issue | Status |
|-------|-------|--------|
| 0 | #25 | ✅ MCP spike |
| 1 | #26 | ✅ Read tools |
| 2 | #27 | ✅ Write tools |
| 3 | #28 | ✅ Connection hub |
| 4 | #29 | ✅ Remove hosted Anthropic |
| 5 | #30 | ✅ Hardening + audit + migration |
