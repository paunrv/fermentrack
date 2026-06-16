#!/usr/bin/env node
/**
 * Borra datos operativos del distribuidor para un clerk_id.
 * Uso: node scripts/reset-distribuidor-scope.mjs <clerk_id>
 * Requiere DIRECT_URL en .env (raíz).
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadDirectUrl() {
  const envPath = resolve(root, '.env')
  const raw = readFileSync(envPath, 'utf8')
  const m = raw.match(/^DIRECT_URL="([^"]+)"/m)
  if (!m) throw new Error('DIRECT_URL no encontrada en .env')
  return m[1]
}

function buildResetSql(clerkId) {
  const safe = clerkId.replace(/'/g, "''")
  const template = readFileSync(resolve(__dirname, 'reset-distribuidor-scope.sql'), 'utf8')
  const block = template.split('-- Verificación')[0]
  return block.replace(/user_3Duc3blb3Bm87dMkJiUFPb5XZII/g, safe)
}

async function main() {
  const clerkId = process.argv[2]
  const client = new pg.Client({ connectionString: loadDirectUrl() })
  await client.connect()

  if (!clerkId) {
    const { rows } = await client.query(`
      select p.clerk_id,
        (select count(*)::int from public.skus s where s.clerk_id = p.clerk_id) as skus,
        (select count(*)::int from public.clients c where c.clerk_id = p.clerk_id) as clients
      from public.profiles p
      order by skus desc
      limit 10
    `)
    console.log('Pasa clerk_id como argumento. Cuentas con datos:')
    for (const r of rows) {
      console.log(`  ${r.clerk_id}  skus=${r.skus}  clients=${r.clients}`)
    }
    await client.end()
    process.exit(1)
  }

  const profile = 'distributor'
  const before = await client.query(
    `select
      (select count(*)::int from public.skus where clerk_id=$1 and profile_type_v2=$2) as skus,
      (select count(*)::int from public.clients where clerk_id=$1 and profile_type_v2=$2) as clients,
      (select count(*)::int from public.pedidos where clerk_id=$1 and profile_type_v2=$2) as pedidos`,
    [clerkId, profile]
  )
  console.log(`Reset distribuidor → ${clerkId}`)
  console.log('Antes:', before.rows[0])

  await client.query('begin')
  try {
    await client.query(buildResetSql(clerkId))
    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  }

  const after = await client.query(
    `select
      (select count(*)::int from public.skus where clerk_id=$1 and profile_type_v2=$2) as skus,
      (select count(*)::int from public.clients where clerk_id=$1 and profile_type_v2=$2) as clients,
      (select count(*)::int from public.pedidos where clerk_id=$1 and profile_type_v2=$2) as pedidos`,
    [clerkId, profile]
  )
  console.log('Después:', after.rows[0])
  console.log('✓ Listo (perfil y trabajadores intactos).')
  await client.end()
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
