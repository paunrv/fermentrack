#!/usr/bin/env node
/**
 * BYOA audit probe — calls MCP get_cobro_context (write-scoped, no mutation).
 *
 * Prereqs:
 *   1. apps/web dev server: npm run dev  (uses prod Supabase from .env.local)
 *   2. Log in as distributor on http://localhost:3000
 *   3. /dashboard/conectar → Descargar token
 *
 * Usage:
 *   PROOF_MCP_TOKEN='eyJ...' npm run probe:mcp-audit
 *   npm run probe:mcp-audit -- --file ~/Downloads/proof-mcp-token.txt
 *
 * Optional: PROOF_MCP_URL (default http://localhost:3000/api/mcp)
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const fileIdx = argv.indexOf('--file')
  if (fileIdx !== -1) {
    return { file: argv[fileIdx + 1] }
  }
  return {}
}

function loadToken() {
  if (process.env.PROOF_MCP_TOKEN?.trim()) {
    return process.env.PROOF_MCP_TOKEN.trim()
  }
  const { file } = parseArgs(process.argv.slice(2))
  if (file) {
    return readFileSync(file, 'utf8').replace(/\s+/g, '').trim()
  }
  return ''
}

const token = loadToken()
const mcpUrl = (process.env.PROOF_MCP_URL ?? 'http://localhost:3000/api/mcp').replace(/\/$/, '')
const clienteNombre = process.env.PROOF_MCP_CLIENTE ?? 'Probe QA'

if (!token || !token.startsWith('eyJ')) {
  console.error('Missing PROOF_MCP_TOKEN (JWT from /dashboard/conectar → Descargar token)')
  console.error('  PROOF_MCP_TOKEN=eyJ... npm run probe:mcp-audit')
  console.error('  npm run probe:mcp-audit -- --file ~/Downloads/proof-mcp-token.txt')
  process.exit(1)
}

try {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    console.error(`Token expired at ${new Date(payload.exp * 1000).toISOString()}`)
    console.error('Re-download from http://localhost:3000/dashboard/conectar → Descargar token')
    process.exit(1)
  }
} catch {
  /* non-fatal */
}

console.log(`MCP probe · ${mcpUrl}`)
console.log(`Tool: get_cobro_context · cliente_nombre="${clienteNombre}"\n`)

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
})

const client = new Client({ name: 'probe-mcp-audit', version: '1.0.0' })

try {
  await client.connect(transport)

  const result = await client.callTool({
    name: 'get_cobro_context',
    arguments: {
      profile_type: 'distributor',
      cliente_nombre: clienteNombre,
    },
  })

  const text = result.content
    ?.map(part => ('text' in part ? part.text : ''))
    .filter(Boolean)
    .join('\n')

  if (result.isError) {
    console.error('Tool returned error:', text || result)
    process.exit(1)
  }

  console.log('Tool OK ✓')
  if (text) {
    const preview = text.length > 400 ? `${text.slice(0, 400)}…` : text
    console.log(preview)
  }

  await client.close()
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('Probe failed:', msg)
  if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
    console.error('\nStart dev server: npm run dev')
    console.error('Then log in at http://localhost:3000 and refresh the token if needed.')
  }
  if (msg.includes('401') || msg.includes('Unauthorized')) {
    console.error('\nToken expired or invalid — download a fresh token from /dashboard/conectar')
  }
  process.exit(1)
}

console.log('\nVerifying audit table…')
const { spawnSync } = await import('node:child_process')
const check = spawnSync(process.execPath, [join(root, 'scripts/check-mcp-audit.mjs')], {
  stdio: 'inherit',
  cwd: root,
})
process.exit(check.status ?? 1)
