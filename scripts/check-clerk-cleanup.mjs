#!/usr/bin/env node
/**
 * Preflight for distributor clerk_id drop (20260624160000_drop_clerk_columns.sql).
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local
 *
 * Usage: npm run check:clerk-cleanup
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, 'apps/web/.env.local')

const TABLES = [
  'skus',
  'pedidos',
  'recepciones',
  'proof_sequences',
  'deudas_productores',
  'cuentas_clientes',
  'cuentas_por_pagar',
  'cuentas_por_cobrar',
  'pagos',
  'pagos_proveedor',
  'pagos_cliente',
  'movimientos_stock',
  'clientes',
  'clients',
  'client_etiquetas',
  'trabajadores',
  'cajas_distribuidor',
  'ordenes_compra',
  'ordenes_compra_distribuidor',
  'remisiones_distribuidor',
  'kpi_config',
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
  if (code === 'PGRST205' || code === '42P01') return 'missing_table'
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
let clerkColumnsRemain = 0

console.log('Clerk cleanup preflight (distributor drop_clerk_columns)\n')
console.log(`Project: ${url}\n`)

// 1. clerk_id still present?
console.log('Column clerk_id (should exist before migration):')
for (const table of TABLES) {
  const { error } = await sb.from(table).select('clerk_id').limit(1)
  const kind = error ? classifyError(error) : 'ok'
  const hasClerk = kind === 'ok'
  if (hasClerk) clerkColumnsRemain += 1
  console.log(`${hasClerk ? '·' : '✓ dropped'} ${table}${error && kind !== 'missing_column' ? ` — ${error.message}` : ''}`)
}
console.log('')

if (clerkColumnsRemain === 0) {
  console.log('✓ All distributor clerk_id columns already dropped — migration applied.\n')
  process.exit(0)
}

// 2. user_id null counts (must be 0 before drop)
console.log('Rows with user_id IS NULL (must be 0 before apply):')
for (const table of TABLES) {
  const { count, error } = await sb
    .from(table)
    .select('*', { count: 'exact', head: true })
    .is('user_id', null)

  if (error) {
    failures += 1
    console.log(`✗ ${table} — ${error.message}`)
    continue
  }

  const n = count ?? 0
  const ok = n === 0
  if (!ok) failures += 1
  console.log(`${ok ? '✓' : '✗'} ${table}: ${n}`)
}

// 3. skus sample (common pain point)
const { data: skuSample, error: skuErr } = await sb
  .from('skus')
  .select('id, clerk_id, user_id')
  .limit(3)
if (!skuErr && skuSample?.length) {
  console.log('\nSample skus (first 3):')
  for (const row of skuSample) {
    console.log(`  ${row.id} clerk_id=${row.clerk_id ?? 'null'} user_id=${row.user_id ?? 'null'}`)
  }
}

console.log('')
const total = TABLES.length
const passed = total - failures
console.log(`Summary: ${passed}/${total} tables ready (user_id populated)`)
console.log('')
if (failures === 0) {
  console.log('Ready to apply: supabase/migrations/20260624160000_drop_clerk_columns.sql')
  console.log('Then remove CLERK_* env vars from Vercel.')
} else {
  console.log('NOT ready — backfill user_id before running drop migration.')
  console.log('See supabase/migrations/20260624160000_drop_clerk_columns.sql §1–2.')
}
process.exit(failures === 0 ? 0 : 1)
