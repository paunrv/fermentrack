#!/usr/bin/env node
/**
 * Audit remote Supabase for FASE 2 RPC auth migration (B1 + B2 + B3).
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local
 *
 * Usage: node scripts/check-fase2-rpcs.mjs
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

const RPCS = [
  {
    id: 'confirmar_pedido',
    fn: 'confirmar_pedido',
    args: { p_pedido_id: '00000000-0000-0000-0000-000000000000' },
    okMessage: 'Pedido no encontrado',
  },
  {
    id: 'confirmar_recepcion',
    fn: 'confirmar_recepcion',
    args: { p_recepcion_id: '00000000-0000-0000-0000-000000000000' },
    okMessage: 'Recepción no encontrada',
  },
  {
    id: 'registrar_movimiento_sku',
    fn: 'registrar_movimiento_sku',
    args: {
      p_sku_id: '00000000-0000-0000-0000-000000000000',
      p_tipo: 'entrada',
      p_cantidad: 1,
    },
    okMessage: 'SKU no encontrado',
  },
  {
    id: 'registrar_pago_cliente',
    fn: 'registrar_pago_cliente',
    args: {
      p_cuenta_id: '00000000-0000-0000-0000-000000000000',
      p_monto: 1,
    },
    okMessage: 'Cuenta por cobrar no encontrada',
  },
  {
    id: 'registrar_pago_proveedor',
    fn: 'registrar_pago_proveedor',
    args: {
      p_cuenta_id: '00000000-0000-0000-0000-000000000000',
      p_monto: 1,
    },
    okMessage: 'Cuenta por pagar no encontrada',
  },
  {
    id: 'confirmar_llegada_destilador',
    fn: 'confirmar_llegada_destilador',
    args: {
      p_viaje_id: '00000000-0000-0000-0000-000000000000',
      p_lineas: [],
    },
    okMessage: 'viaje no encontrado',
    pendingHint: 'apply scripts/apply-fase2-rpcs-destilador.sql (B3)',
  },
  {
    id: 'cerrar_corrida_destilador',
    fn: 'cerrar_corrida_destilador',
    args: {
      p_corrida_id: '00000000-0000-0000-0000-000000000000',
      p_botellas_producidas: 1,
    },
    okMessage: 'corrida no encontrada',
    pendingHint: 'apply scripts/apply-fase2-rpcs-destilador.sql (B3)',
  },
]

function classifyRpcError(error) {
  const code = error?.code ?? ''
  const msg = String(error?.message ?? '')
  if (code === 'PGRST202' || msg.includes('Could not find the function')) return 'missing'
  if (code === '42883' || msg.includes('does not exist')) return 'missing'
  return 'callable'
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

console.log('FASE 2 · RPC audit (B1 + B2 + B3)\n')

for (const check of RPCS) {
  const { error } = await sb.rpc(check.fn, check.args)
  const kind = error ? classifyRpcError(error) : 'unexpected_ok'
  const msg = String(error?.message ?? '')

  if (kind === 'missing') {
    missing += 1
    const hint =
      msg.includes('current_clerk_id')
        ? ` — B3 pending (${check.pendingHint ?? 'apply apply-fase2-rpcs-destilador.sql'})`
        : ''
    console.log(`✗ ${check.id} — ${error.code ?? error.message}${hint}`)
    continue
  }

  if (kind === 'callable' && msg.includes(check.okMessage)) {
    console.log(`✓ ${check.id} — ok (probe: ${check.okMessage})`)
    continue
  }

  if (kind === 'unexpected_ok') {
    console.log(`✓ ${check.id} — callable (unexpected success)`)
    continue
  }

  if (msg.includes('row_belongs_to_requester') || msg.includes('function proof.row_belongs')) {
    missing += 1
    console.log(`✗ ${check.id} — still uses row_belongs_to_requester`)
    continue
  }

  missing += 1
  console.log(`? ${check.id} — ${msg || 'unknown response'}`)
}

console.log(
  `\n${missing === 0 ? 'All checks passed.' : `${missing} pending — see docs/DEPLOY-FASE2-RPCS.md`}`
)
process.exit(missing === 0 ? 0 : 1)
