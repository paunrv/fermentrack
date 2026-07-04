# Deploy — migraciones producción (Jul 2026)

Winemaker epics A–E requieren **6 migraciones** en Supabase remoto.  
Proyecto: `stjnoacbdcjhhucaoqrw`

## Auditoría

```bash
npm install          # instala pg para apply script
npm run check:prod-schema
```

Salida esperada tras aplicar: 7 checks ✓.

## Opción A — Script (recomendado)

1. Supabase Dashboard → **Project Settings → Database → Connection string → URI**
2. Añade a `apps/web/.env.local` (no commitear):

   ```
   DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

3. Ejecuta:

   ```bash
   npm run apply:prod-migrations
   npm run check:prod-schema
   ```

Aplica en orden:

| Migración | Epic |
|-----------|------|
| `20260703160000_lots_etapa_stage_change.sql` | A1 |
| `20260703170000_finished_goods_inventory.sql` | D1 |
| `20260703180000_organizations_features.sql` | D6 / features |
| `20260703200000_team_chat.sql` | C1 |
| `20260703210000_plan_limites.sql` | E1 |
| `20260703230000_founding_member.sql` | E7 |

`mcp_tool_calls` (#30) ya está en prod — no re-aplicar.

## Opción B — SQL Editor

1. Abre [SQL Editor](https://supabase.com/dashboard/project/stjnoacbdcjhhucaoqrw/sql/new)
2. **Primero** pega y ejecuta en orden:
   - `scripts/prereq-wm-rls-helpers.sql`
   - `scripts/prereq-org-winemaker-columns.sql` (añade `plan_status`, `org_type`, Stripe)
3. Luego el bundle según lo ya aplicado:
   - Nada aún → `scripts/pending-prod-migrations.sql`
   - A1 hecho, falló en D → `scripts/resume-prod-from-d1.sql`
   - D + chat hechos, falló en E1 (`plan_status`) → `scripts/resume-prod-from-e1.sql`
4. `npm run check:prod-schema`

### Error `column "plan_status" does not exist`

Falta migración F1 org columns. Ejecuta `prereq-org-winemaker-columns.sql`, luego `resume-prod-from-e1.sql` (no repitas D/C si ya aplicaron).

### Error `wm_row_select_allowed(uuid) does not exist`

El prereq no corrió (o falló antes del `commit`). Ejecuta `prereq-wm-rls-helpers.sql` hasta ver **Success**; luego `resume-prod-from-d1.sql` o el bundle completo.

## Opción C — Supabase CLI

Cuando `supabase` funcione en tu máquina:

```bash
supabase link --project-ref stjnoacbdcjhhucaoqrw
supabase db push
```

## Post-apply

- [ ] `notify pgrst, 'reload schema'` incluido en migraciones con grants
- [ ] Smoke: crear org winemaker → trial 90 días
- [ ] Smoke: `/dashboard/winemaker/bodega`, chat, settings billing
- [ ] Un MCP write → fila en `mcp_tool_calls`

Ver también: [PROOF-BYOA-CUTOVER-CHECKLIST.md](./PROOF-BYOA-CUTOVER-CHECKLIST.md)
