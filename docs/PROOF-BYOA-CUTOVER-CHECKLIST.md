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

**Status (2026-07-02):** Blocked — Vercel CLI not authenticated in this environment.

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
| Write success in `mcp_tool_calls` | ⏳ | Pending one MCP write after winemaker migrations applied |

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
- [ ] Confirm connection hub loads on production `/dashboard`
- [ ] Rotate Supabase JWT if any test tokens were created during QA
