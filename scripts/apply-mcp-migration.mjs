#!/usr/bin/env node
/**
 * Apply mcp_tool_calls migration to remote Postgres.
 * Requires DATABASE_URL (Supabase → Settings → Database → Connection string → URI).
 *
 * Usage:
 *   DATABASE_URL='postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres' node scripts/apply-mcp-migration.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sqlPath = join(root, 'supabase/migrations/20260702160000_mcp_tool_calls.sql')
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('Missing DATABASE_URL.')
  console.error('Get it from Supabase Dashboard → Project Settings → Database → Connection string (URI).')
  console.error('Project ref: stjnoacbdcjhhucaoqrw')
  console.error(`SQL file: ${sqlPath}`)
  process.exit(1)
}

const sql = readFileSync(sqlPath, 'utf8')
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query(sql)
  const { rows } = await client.query(
    "select to_regclass('public.mcp_tool_calls') as table_name"
  )
  console.log('Migration applied:', rows[0]?.table_name ?? 'unknown')
} catch (e) {
  console.error('Migration failed:', e instanceof Error ? e.message : e)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
