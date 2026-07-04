#!/usr/bin/env node
/**
 * Apply pending Jul 2026 production migrations (winemaker epics A–E).
 * Skips mcp_tool_calls if already present.
 *
 * Requires DATABASE_URL (Supabase → Settings → Database → Connection string URI).
 * Project ref: stjnoacbdcjhhucaoqrw
 *
 * Usage:
 *   DATABASE_URL='postgresql://postgres.[ref]:[password]@...' node scripts/apply-pending-prod-migrations.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase/migrations')

/** Order matters. mcp_* omitted — already on prod as of 2026-07-03. */
const PREREQ = ['prereq-wm-rls-helpers.sql', 'prereq-org-winemaker-columns.sql']
const PENDING = [
  '20260703160000_lots_etapa_stage_change.sql',
  '20260703170000_finished_goods_inventory.sql',
  '20260703180000_organizations_features.sql',
  '20260703200000_team_chat.sql',
  '20260703210000_plan_limites.sql',
  '20260703230000_founding_member.sql',
]

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Missing DATABASE_URL.')
  console.error('Supabase Dashboard → Project Settings → Database → Connection string (URI)')
  console.error('Project: stjnoacbdcjhhucaoqrw')
  console.error('\nAlternatively paste scripts/pending-prod-migrations.sql in the SQL Editor.')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

await client.connect()

for (const file of [...PREREQ, ...PENDING]) {
  const path = join(migrationsDir, file)
  const sql = readFileSync(path, 'utf8')
  console.log(`Applying ${file}…`)
  try {
    await client.query(sql)
    console.log(`  ✓ ${file}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`  ✗ ${file}: ${msg}`)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

await client.end()
console.log('\nDone. Verify: node scripts/check-prod-schema.mjs')
