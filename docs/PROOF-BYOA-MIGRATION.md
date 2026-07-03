# PROOF · Migrating from in-app chat to BYOA / MCP

Epic [#24](https://github.com/paunrv/fermentrack/issues/24) · Phase 5 [#30](https://github.com/paunrv/fermentrack/issues/30).

If you used PROOF’s hosted agent bar or `/dashboard/agente`, follow this guide to operate with your own MCP client (Claude Desktop, Cursor, ChatGPT connectors, etc.).

## What changed

| Before | Now |
|--------|-----|
| In-app chat on `/dashboard` | **Connection hub** at `/dashboard` (MCP URL + token) |
| `/api/proof/contexto` (hosted LLM) | **410 Gone** — use MCP read/write tools |
| Photo/ticket vision on PROOF servers | External agent + MCP tools (`import_winemaker_ticket`, `import_recepcion_draft`) |
| `ANTHROPIC_API_KEY` on PROOF | **Not required** — remove from Vercel/host env |

Technical reference: [PROOF-BYOA-MCP.md](./PROOF-BYOA-MCP.md)

## Step 1 — Connect your agent

1. Sign in to PROOF in the browser.
2. Open **Dashboard → Conectar** (`/dashboard`).
3. Copy the **MCP URL** (`https://<your-app>/api/mcp`).
4. Copy your **Supabase access token** (session JWT) or configure OAuth via `/.well-known/oauth-protected-resource`.
5. Add the server in your client (see setup cards on the hub for Cursor / Claude).

Run `get_session_snapshot` first to discover `profile_type`, winemaker `organization_id`, and JSON schemas.

## Step 2 — Map old workflows

### Distributor

| Old (chat / vision) | MCP tool or manual |
|---------------------|-------------------|
| “¿Qué SKUs en quiebre?” | `get_inventory_summary` |
| Crear pedido por voz | `create_pedido` or `/dashboard/pedidos/nuevo` |
| Confirmar entrega | `confirmar_entrega` |
| Recepción con foto | Link OC → manual review, or `import_recepcion_draft` |
| Redactar cobro | `get_cobro_context` + your agent drafts text; or template in `/dashboard/credito` |

### Winemaker

| Old | MCP / manual |
|-----|----------------|
| Subir ticket con visión automática | Upload in app (evidence only) + `import_winemaker_ticket` from agent extraction |
| Preguntas de bodega | `get_resumen_bodega`, `list_lotes`, `list_documentos` |

### Distiller

| Old | MCP |
|-----|-----|
| Estado de corridas / viajes | `list_corridas`, `list_viajes`, `list_lotes_distiller` |

## Step 3 — Production checklist (operators)

- [ ] Remove `ANTHROPIC_API_KEY` from **Vercel → Project → Environment Variables** (all environments).
- [ ] Apply migration `mcp_tool_calls` (`supabase db push` or deploy pipeline).
- [ ] Confirm MCP works with a fresh Supabase JWT (tokens expire — reconnect client after logout).
- [ ] Optional: set `MCP_RATE_LIMIT_MAX` / `MCP_RATE_LIMIT_WINDOW_MS` if agents are chatty (defaults: 120 req / 60s per user).

Full cutover steps: [PROOF-BYOA-CUTOVER-CHECKLIST.md](./PROOF-BYOA-CUTOVER-CHECKLIST.md)

## Idempotency & writes

All write tools accept `idempotency_key` (≥8 chars). Retries with the same key return the first result (`idempotent_replay: true`) and are audited as `replay`.

## Support

- Tool catalog: connection hub on `/dashboard` or [PROOF-BYOA-MCP.md](./PROOF-BYOA-MCP.md)
- Security / cross-org tests: [PROOF-BYOA-MCP.md § Phase 5](./PROOF-BYOA-MCP.md#phase-5-hardening-audit-log-migration--30)
