#!/usr/bin/env node
/**
 * Audit mcp_tool_calls on remote Supabase (BYOA write probe).
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local
 *
 * Usage: node scripts/check-mcp-audit.mjs
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

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local')
  process.exit(1)
}

const sb = createClient(url, key)

const { count, error: countError } = await sb
  .from('mcp_tool_calls')
  .select('*', { count: 'exact', head: true })

if (countError) {
  console.error('mcp_tool_calls:', countError.message)
  process.exit(1)
}

console.log(`mcp_tool_calls · total rows: ${count ?? 0}\n`)

const { data, error } = await sb
  .from('mcp_tool_calls')
  .select('id, tool_name, status, profile_type, user_id, created_at')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.error(error.message)
  process.exit(1)
}

if (!data?.length) {
  console.log('No audited writes yet.')
  console.log('\nProbe (safe, no mutation): call MCP tool get_cobro_context from Claude/Cursor')
  console.log('with profile_type=distributor and a cliente_nombre you have in prod.')
  console.log('Then re-run: npm run check:mcp-audit')
  process.exit(count === 0 ? 1 : 0)
}

for (const row of data) {
  console.log(
    `${row.created_at} · ${row.status} · ${row.tool_name} · ${row.profile_type} · ${row.user_id?.slice(0, 8)}…`
  )
}

console.log('\nAudit table has data ✓')
