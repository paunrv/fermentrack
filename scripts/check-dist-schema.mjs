#!/usr/bin/env node
/**
 * Audit remote Supabase schema for distributor dist_products → skus migration (M1–M3).
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local
 *
 * Usage: node scripts/check-dist-schema.mjs
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
  { id: 'M1 skus.origen', table: 'skus', column: 'origen' },
  { id: 'M1 skus.imagen_url', table: 'skus', column: 'imagen_url' },
  { id: 'M2 movimientos_sku', table: 'movimientos_sku', column: 'id' },
]

function classifyError(error) {
  const code = error?.code ?? ''
  const msg = String(error?.message ?? '')
  if (code === 'PGRST205' || code === '42P01') return 'missing'
  if (code === '42703' || msg.includes('does not exist')) return 'missing'
  if (code === '42501') return 'grants_only'
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

console.log('Distributor SKU migration audit (M1–M3, M8)\n')

let m2Ok = false

for (const check of CHECKS) {
  const select = check.column ?? 'id'
  const { error } = await sb.from(check.table).select(select).limit(1)
  const kind = error ? classifyError(error) : 'ok'
  const ok = kind === 'ok' || kind === 'grants_only'
  if (!ok) missing += 1
  if (check.id === 'M2 movimientos_sku' && ok) m2Ok = true
  const note =
    kind === 'grants_only'
      ? ' — ok (table exists; GRANT authenticated only)'
      : error
        ? ` — ${error.code ?? error.message}`
        : ''
  console.log(`${ok ? '✓' : '✗'} ${check.id}${note}`)
}

// M3: RPC exists (PostgREST exposes it when granted)
const { error: rpcError } = await sb.rpc('registrar_movimiento_sku', {
  p_sku_id: '00000000-0000-0000-0000-000000000000',
  p_tipo: 'entrada',
  p_cantidad: 1,
})
const rpcMissing =
  rpcError &&
  (rpcError.code === 'PGRST202' ||
    String(rpcError.message ?? '').includes('Could not find the function') ||
    String(rpcError.message ?? '').includes('schema cache'))
if (rpcMissing || !m2Ok) {
  if (!m2Ok) {
    /* already counted in loop */
  } else if (rpcMissing) {
    missing += 1
  }
  if (rpcMissing) {
    console.log(`✗ M3 registrar_movimiento_sku — ${rpcError.code ?? rpcError.message}`)
  } else if (!m2Ok) {
    console.log(`✗ M3 registrar_movimiento_sku — pending (requires M2 movimientos_sku)`)
  }
} else {
  console.log(
    `✓ M3 registrar_movimiento_sku — ok${rpcError ? ` (probe: ${rpcError.message})` : ''}`
  )
}

// M8: sync RPC revoked; skus.dist_product_id dropped
const { error: syncRpcError } = await sb.rpc('sync_all_skus_for_scope', {
  p_clerk_id: '00000000-0000-0000-0000-000000000000',
  p_profile_type_v2: 'distributor',
})
const syncRevoked =
  syncRpcError &&
  (syncRpcError.code === 'PGRST202' ||
    String(syncRpcError.message ?? '').includes('Could not find the function'))
if (syncRevoked) {
  console.log('✓ M8 sync_all_skus_for_scope — revoked')
} else {
  missing += 1
  console.log(
    `✗ M8 sync_all_skus_for_scope — still callable${syncRpcError ? '' : ' (unexpected success)'}`
  )
}

const { error: distColError } = await sb.from('skus').select('dist_product_id').limit(1)
const distColDropped =
  distColError &&
  (distColError.code === '42703' ||
    String(distColError.message ?? '').includes('dist_product_id'))
if (distColDropped) {
  console.log('✓ M8 skus.dist_product_id — dropped')
} else {
  missing += 1
  console.log(`✗ M8 skus.dist_product_id — still present`)
}

console.log(
  `\n${missing === 0 ? 'All checks passed.' : `${missing} pending — see docs/DEPLOY-DIST-MIGRATIONS.md`}`
)
process.exit(missing === 0 ? 0 : 1)
