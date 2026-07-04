#!/usr/bin/env node
/**
 * Preflight for winemaker org cutover (#7 → #8 → #12).
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local
 *
 * Usage: npm run check:wm-org-migration
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, 'apps/web/.env.local')

const WM_TABLES = [
  'wm_wine_lots',
  'wm_documents',
  'wm_production_costs',
  'wm_events',
  'wm_suppliers',
  'wm_document_lines',
]

function loadEnv() {
  const raw = readFileSync(envPath, 'utf8')
  return Object.fromEntries(
    raw
      .split('\n')
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const i = line.indexOf('=')
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
      })
  )
}

function classifyError(error) {
  const code = error?.code ?? ''
  const msg = String(error?.message ?? '')
  if (code === '42703' || msg.includes('does not exist')) return 'missing_column'
  if (code === '42501') return 'grants_only'
  return 'error'
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local')
  process.exit(1)
}

const sb = createClient(url, key)
let failures = 0
let orgColumns = 0
let clerkColumnsRemain = 0

console.log('Winemaker org migration audit (#7 backfill → #8 RLS → #12 drop clerk_id)\n')
console.log(`Project: ${url}\n`)

// organizations.org_type (issue #5)
{
  const { error } = await sb.from('organizations').select('org_type').limit(1)
  const kind = error ? classifyError(error) : 'ok'
  if (kind === 'ok' || kind === 'grants_only') {
    console.log('✓ organizations.org_type')
  } else {
    console.log(`✗ organizations.org_type — ${error.message}`)
    failures += 1
  }
}

console.log('\norganization_id column + null counts:')
for (const table of WM_TABLES) {
  const { error: colErr } = await sb.from(table).select('organization_id').limit(1)
  const colKind = colErr ? classifyError(colErr) : 'ok'
  const hasOrg = colKind === 'ok'

  if (hasOrg) orgColumns += 1

  if (!hasOrg) {
    console.log(`· ${table} — no organization_id yet (#7 pending)`)
    continue
  }

  const { count, error } = await sb
    .from(table)
    .select('*', { count: 'exact', head: true })
    .is('organization_id', null)

  if (error) {
    failures += 1
    console.log(`✗ ${table} — ${error.message}`)
    continue
  }

  const n = count ?? 0
  const ok = n === 0
  if (!ok) failures += 1
  console.log(`${ok ? '✓' : '✗'} ${table}: org_null=${n}`)
}

console.log('\nclerk_id column (dropped after #12):')
for (const table of WM_TABLES) {
  const { error } = await sb.from(table).select('clerk_id').limit(1)
  const kind = error ? classifyError(error) : 'ok'
  const hasClerk = kind === 'ok'
  if (hasClerk) clerkColumnsRemain += 1
  console.log(`${hasClerk ? '·' : '✓ dropped'} ${table}`)
}

console.log('')
if (orgColumns === 0) {
  console.log('Next: apply supabase/migrations/20260630150000_winemaker_organization_id_backfill.sql')
  console.log('Then: 20260630160000_winemaker_rls_organization_id.sql')
  process.exit(1)
}

if (orgColumns < WM_TABLES.length) {
  console.log(`Partial #7: ${orgColumns}/${WM_TABLES.length} tables have organization_id — re-run backfill migration.`)
  process.exit(1)
}

if (failures > 0) {
  console.log('NOT ready — backfill organization_id before #8/#12.')
  process.exit(1)
}

if (clerkColumnsRemain === WM_TABLES.length) {
  console.log('Ready for #8 RLS (if not applied) then #12 drop clerk_id.')
  console.log('Apply: supabase/migrations/20260630190000_winemaker_drop_clerk_id.sql')
  process.exit(0)
}

if (clerkColumnsRemain === 0) {
  console.log('✓ Winemaker clerk_id cleanup complete (#12 applied).')
  process.exit(0)
}

console.log('Mixed state — verify #8 RLS and re-run checks.')
process.exit(1)
