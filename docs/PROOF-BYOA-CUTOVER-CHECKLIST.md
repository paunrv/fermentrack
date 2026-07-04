# PROOF BYOA · Production cutover checklist

Run after deploying commits through **#30** (`mcp_tool_calls`, rate limits, migration docs).

**Schema audit (2026-07-03):** `npm run check:prod-schema` on project `stjnoacbdcjhhucaoqrw` — **7/7 ✓** (issue [#67](https://github.com/paunrv/fermentrack/issues/67) closed)

| Check | Remote |
|-------|--------|
| `mcp_tool_calls` | ✅ |
| `lots.etapa` | ✅ |
| `wm_existencias` + D schema | ✅ |
| `organizations.features` | ✅ |
| `wm_mensajes` (chat) | ✅ |
| `plan_limites` + billing fields | ✅ |
| `founding_member_at` | ✅ |

Apply: **`docs/DEPLOY-MIGRATIONS.md`** · **run `scripts/prereq-wm-rls-helpers.sql` first** · then `scripts/pending-prod-migrations.sql` · `npm run apply:prod-migrations` (needs `DATABASE_URL`).

## 1. Database migration (`mcp_tool_calls`)

**Status (2026-07-03):** ✅ Applied on remote — `public.mcp_tool_calls` exists.

### Option A — Supabase MCP (Cursor)

1. Cursor → Settings → MCP → ensure **Supabase** server is connected (project `stjnoacbdcjhhucaoqrw`).
2. Run `apply_migration` with `supabase/migrations/20260702160000_mcp_tool_calls.sql`.

### Option B — CLI (when `supabase` binary works on your machine)

```bash
cd fermentrack
supabase link --project-ref stjnoacbdcjhhucaoqrw
supabase db push
```

### Option C — Script + `DATABASE_URL`

```bash
# URI from Supabase Dashboard → Settings → Database → Connection string
DATABASE_URL='postgresql://postgres:...@db.stjnoacbdcjhhucaoqrw.supabase.co:5432/postgres' \
  node scripts/apply-mcp-migration.mjs
```

### Option D — SQL Editor

Paste contents of `supabase/migrations/20260702160000_mcp_tool_calls.sql` in  
[Supabase SQL Editor](https://supabase.com/dashboard/project/stjnoacbdcjhhucaoqrw/sql/new).

### Verify

```bash
# Should print table_exists
cd apps/web && node --input-type=module -e "
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\\n').filter(Boolean).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { error } = await sb.from('mcp_tool_calls').select('id').limit(1);
console.log(error ? error.message : 'table_exists');
"
```

---

## 2. Remove `ANTHROPIC_API_KEY` from Vercel

**Status (2026-07-04):** ✅ Removed from Vercel (confirmed in Dashboard).

```bash
npx vercel login
chmod +x scripts/remove-vercel-anthropic.sh
./scripts/remove-vercel-anthropic.sh
```

Or manually: Vercel Dashboard → Project → Settings → Environment Variables → delete `ANTHROPIC_API_KEY` for **Production**, **Preview**, and **Development**.

**Local:** Removed from `apps/web/.env.local` on 2026-07-02.

---

## 3. Cross-org penetration checklist

| Check | Result (2026-07-02) | How verified |
|-------|---------------------|--------------|
| Winemaker user A cannot use org B `organization_id` | ✅ | `resolveMcpScope` unit test rejects non-member org |
| Viewer cannot call write tools | ✅ | `assertMcpWriteAccess` unit test |
| Distributor JWT scoped to own SKUs (RLS) | ✅ | Existing RLS + MCP uses user JWT client |
| MCP without bearer → 401 | ✅ | Live `curl` → 401 |
| Forged JWT → 401 | ✅ | Live `curl` → 401 |
| Rate limit → 429 + `Retry-After` | ✅ | Live load test → 429, `Retry-After: 43` |
| Write success in `mcp_tool_calls` | ✅ | 2026-07-04 — `get_cobro_context` probe |

### QA session (2026-07-03)

| Check | Result | Notes |
|-------|--------|-------|
| `npm run check:prod-schema` | ✅ 7/7 | incl. `mcp_tool_calls` |
| MCP unit tests (`apps/web`) | ✅ 26/26 | after fix `plan-limit-mcp.ts` missing `>` |
| Vercel Production deploy | ✅ Ready (`e9d1e4b`, 2026-07-03) | Fixed TS cascade: plan-limit, movimientos, winemaker, billing, MCP enums |
| Prod connection hub | ✅ | User confirmed `/dashboard` after deploy Ready |
| Prod URL probe (unauthenticated) | ⏭️ | SSO on preview URL — use production login |
| `mcp_tool_calls` rows | ✅ | `npm run check:mcp-audit` — 2 rows `success` (2026-07-04) |

### Live MCP auth/rate-limit probe (localhost)

```
no_auth 401
forged_jwt 401
valid_jwt 406   # auth OK; MCP protocol expects Streamable HTTP handshake
rate_limit 429 43
```

### Manual follow-ups (staging with real orgs)

- [ ] User A calls `list_lotes` with org B UUID → error
- [ ] Viewer calls `import_winemaker_ticket` → blocked
- [ ] After a successful `create_pedido`, row appears in `mcp_tool_calls`

---

## 4. Post-cutover

- [x] Push commits to `origin/main` and deploy (2026-07-03)
- [x] Apply winemaker migrations Jul 2026 — see `docs/DEPLOY-MIGRATIONS.md` (2026-07-03)
- [x] Confirm connection hub loads on production `/dashboard` (2026-07-03 — deploy Ready)
- [x] One MCP write → row in `mcp_tool_calls` — **`npm run probe:mcp-audit`** (2026-07-04 ✓)
- [ ] Rotate Supabase JWT if any test tokens were created during QA

## 5. MCP audit probe (closes §3 write row)

Safe write-scoped tool (logs to `mcp_tool_calls`, no data mutation): **`get_cobro_context`**.

**Why local dev:** the Vercel preview URL is behind SSO — external `curl` gets 302. Local `npm run dev` talks to the same prod Supabase and writes the audit row.

**Not SQL Editor:** BYOA audit is an MCP HTTP call, not a Supabase migration. Do not paste this checklist (Markdown) into SQL Editor.

**If probe returns 500:** check disk space (`df -h`) — ENOSPC breaks Next dev. Free ≥2 GB, restart `npm run dev`, re-download token if expired.

### Option A — automated script (recommended)

```bash
# Terminal 1
npm run dev

# Browser: http://localhost:3000 → sign in as distributor
# → /dashboard/conectar → «Descargar token»

# Terminal 2
npm run probe:mcp-audit -- --file ~/Downloads/proof-mcp-token.txt
# or: PROOF_MCP_TOKEN='eyJ...' npm run probe:mcp-audit
```

Expect: `Tool OK ✓` then `npm run check:mcp-audit` → at least one `success` row.

Optional: `PROOF_MCP_CLIENTE='Nombre Cliente'` if you have CxC data; default `Probe QA` is fine (empty cuentas still audits).

### Option B — Cursor / Claude MCP

1. `/dashboard/conectar` → **Copiar config Cursor** (or Claude)
2. Cursor → Settings → MCP → ensure **proof** server is connected (fix if errored)
3. As **distributor**, call tool **`get_cobro_context`** with any `cliente_nombre`
4. `npm run check:mcp-audit`

Read-only tools (`list_skus`, etc.) do **not** write to `mcp_tool_calls`.

---

## 5. Clerk cleanup · Distribuidor (#12)

**Status (2026-07-04):** ✅ Applied on remote — 21 tablas sin `clerk_id`.

| Step | Script | Verify |
|------|--------|--------|
| Backfill orphans | `scripts/apply-clerk-user-id-backfill.sql` | `npm run check:clerk-cleanup` → 21/21 |
| Prereq RLS | `scripts/prereq-drop-clerk-columns.sql` | (si DROP function falla con 2BP01) |
| Drop columns | `supabase/migrations/20260624160000_drop_clerk_columns.sql` | `check:clerk-cleanup` → all dropped |
| Vercel | Remove `CLERK_*` env vars | Redeploy |

Post-cutover app fix: `createSkuCatalog` / `fetchClients` usan solo `user_id` (no `clerk_id` en inserts ni filtros).

**Pendiente:** destilador (`destilador.ts`) sigue con `clerk_id` en tablas propias.

---

## 6. Winemaker org + clerk drop (#7 → #8 → #12)

**Status (2026-07-04):** ✅ Applied on remote — `#7` organization_id + `#12` clerk_id dropped (`check:wm-org-migration`).

```bash
npm run check:wm-org-migration
```

| Orden | SQL Editor | Verify |
|-------|------------|--------|
| 0 | `scripts/prereq-wm-rls-helpers.sql` | org helpers + `winemaker_row_owned` (solo si aplicas #8) |
| 1 | `supabase/migrations/20260630150000_winemaker_organization_id_backfill.sql` | **obligatorio primero** · `check:wm-org-migration` |
| 2a | `supabase/migrations/20260630160000_winemaker_rls_organization_id.sql` | dual-read temporal — **opcional** si vas directo a #12 |
| 2b | `supabase/migrations/20260630190000_winemaker_drop_clerk_id.sql` | org-only RLS + drop `clerk_id` — **saltar #8 y usar esto** |

**Errores comunes**

| Error | Causa | Fix |
|-------|-------|-----|
| `winemaker_row_owned(text) does not exist` | #8 sin prereq; función borrada en migración Clerk | Ejecutar `prereq-wm-rls-helpers.sql` **o** saltar #8 |
| `organization_id does not exist` | #12 / #8 antes de #7 | Aplicar **#7 backfill primero** |

Prod `wm_*` vacías: #7 + #12 (sin #8) es suficiente.
