#!/usr/bin/env node
/**
 * Audit remote Supabase schema for Jul 2026 winemaker migrations.
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local
 *
 * Usage: node scripts/check-prod-schema.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, 'apps/web/.env.local')

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

const CHECKS = [
  { id: 'mcp_tool_calls', table: 'mcp_tool_calls', column: 'id' },
  { id: 'lots.etapa', table: 'lots', column: 'etapa' },
  { id: 'wm_existencias', table: 'wm_existencias', column: 'id' },
  { id: 'organizations.features', table: 'organizations', column: 'features' },
  { id: 'wm_mensajes', table: 'wm_mensajes', column: 'id' },
  { id: 'plan_limites', table: 'plan_limites', column: 'plan' },
  { id: 'founding_member_at', table: 'organizations', column: 'founding_member_at' },
]

/** PostgREST: missing table/column vs grants only on authenticated (42501 with service role). */
function classifyError(error) {
  const code = error?.code ?? ''
  const msg = String(error?.message ?? '')
  if (code === 'PGRST205' || code === '42P01') return 'missing'
  if (code === '42703' || msg.includes('does not exist')) return 'missing'
  if (code === '42501') return 'grants_only' // table likely exists; GRANT is authenticated-only
  return 'unknown'
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local')
  process.exit(1)
}

const sb = createClient(url, key)
let missing = 0

console.log('Supabase schema audit\n')

for (const check of CHECKS) {
  const select = check.column ?? 'id'
  const { error } = await sb.from(check.table).select(select).limit(1)
  const kind = error ? classifyError(error) : 'ok'
  const ok = kind === 'ok' || kind === 'grants_only'
  if (!ok) missing += 1
  const note =
    kind === 'grants_only'
      ? ' — ok (table exists; GRANT authenticated only)'
      : error
        ? ` — ${error.code ?? error.message}`
        : ''
  console.log(`${ok ? '✓' : '✗'} ${check.id}${note}`)
}

console.log(`\n${missing === 0 ? 'All checks passed.' : `${missing} pending — run apply-pending-prod-migrations.mjs`}`)
process.exit(missing === 0 ? 0 : 1)
