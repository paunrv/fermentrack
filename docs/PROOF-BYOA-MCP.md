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
| Winemaker | `list_lotes` | `fetchWineLots` (org-scoped) |
| Winemaker | `list_documentos` | `fetchDocuments` |
| Winemaker | `get_resumen_bodega` | `fetchWinemakerSummary` + agent context |
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

## Phase 2 write tools (implemented — #27)

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

**Import schemas:** `lib/mcp/schemas/recepcion-draft.ts`, `lib/mcp/schemas/winemaker-ticket.ts`

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
