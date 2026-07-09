#!/usr/bin/env node
/**
 * Escribe la config MCP de PROOF en Claude Desktop (Mac).
 *
 * Forma más fiable (archivo):
 *   1. PROOF → /dashboard/conectar → «Descargar token»
 *   2. npm run setup:claude-mcp -- --file ~/Downloads/proof-mcp-token.txt
 *
 * Alternativa (portapapeles):
 *   1. «Copiar token» en PROOF (solo ese botón)
 *   2. npm run setup:claude-mcp
 */

import { execSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const configPath = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')

function normalizeMcpUrl(raw) {
  const base = raw.replace(/\/$/, '')
  return base.endsWith('/api/mcp') ? base : `${base}/api/mcp`
}

function readClipboardToken() {
  try {
    return execSync('pbpaste', { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function parseArgs(argv) {
  const fileIdx = argv.indexOf('--file')
  if (fileIdx !== -1) {
    return { file: argv[fileIdx + 1] }
  }
  return {}
}

function validateToken(raw) {
  const token = raw.replace(/\s+/g, '').trim()
  if (!token || token.length < 80) {
    return { ok: false, reason: 'empty' }
  }
  if (!token.startsWith('eyJ')) {
    return { ok: false, reason: 'not_jwt' }
  }
  if (
    token.includes('#') ||
    token.includes('Copiar') ||
    token.includes('npm') ||
    token.includes('PROOF') ||
    token.includes('Terminal') ||
    token.includes('mcpServers') ||
    token.startsWith('{')
  ) {
    return { ok: false, reason: 'instructions_not_token' }
  }
  return { ok: true, token }
}

async function loadToken() {
  const { file } = parseArgs(process.argv.slice(2))

  if (process.env.PROOF_MCP_TOKEN?.trim()) {
    return validateToken(process.env.PROOF_MCP_TOKEN)
  }

  if (file) {
    try {
      const raw = await readFile(file, 'utf8')
      return validateToken(raw)
    } catch {
      console.error(`❌ No pude leer el archivo: ${file}`)
      process.exit(1)
    }
  }

  return validateToken(readClipboardToken())
}

const validation = await loadToken()

if (!validation.ok) {
  const messages = {
    empty: `
❌ No hay token válido.

Método recomendado (archivo):
  1. PROOF → /dashboard/conectar → «Descargar token»
  2. npm run setup:claude-mcp -- --file ~/Downloads/proof-mcp-token.txt

Método portapapeles:
  1. «Copiar token» (solo ese botón, no instrucciones)
  2. npm run setup:claude-mcp
`,
    not_jwt: `
❌ Eso no es un token JWT (debe empezar con eyJ).

  → En PROOF pulsa «Descargar token» o «Copiar token»
  → NO pegues texto de instrucciones en la Terminal
`,
    instructions_not_token: `
❌ Tienes instrucciones en vez del token (vimos «Copiar», «npm» o «#»).

  → Pulsa SOLO «Descargar token» en PROOF
  → Luego: npm run setup:claude-mcp -- --file ~/Downloads/proof-mcp-token.txt
`,
  }
  console.error(messages[validation.reason] ?? messages.empty)
  process.exit(1)
}

const token = validation.token

// Warn if JWT looks expired (best-effort decode; never block on parse errors).
try {
  const payloadB64 = token.split('.')[1]
  if (payloadB64) {
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4)
    const payload = JSON.parse(Buffer.from(padded, 'base64url').toString('utf8'))
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      console.error(`
❌ El token ya expiró (exp ${new Date(payload.exp * 1000).toLocaleString()}).

  → En PROOF (/dashboard/conectar) pulsa «Descargar token» de nuevo
  → Luego: npm run setup:claude-mcp -- --file ~/Downloads/proof-mcp-token.txt
`)
      process.exit(1)
    }
  }
} catch {
  // ignore decode errors — server will reject bad tokens
}

const url = normalizeMcpUrl(process.env.MCP_URL ?? 'http://localhost:3000')

// Use AUTH_HEADER env so spaces in "Bearer …" are not mangled by Claude Desktop.
// See mcp-remote README (Claude Desktop / Cursor args escaping bug).
const proofServer = {
  command: 'npx',
  args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${AUTH_HEADER}'],
  env: {
    AUTH_HEADER: `Bearer ${token}`,
  },
}

let config = { mcpServers: {} }

try {
  const raw = await readFile(configPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (parsed && typeof parsed === 'object') {
    config = parsed
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      config.mcpServers = {}
    }
  }
} catch (err) {
  if (err && typeof err === 'object' && 'code' in err && err.code !== 'ENOENT') {
    console.error(`⚠️  No se pudo leer ${configPath}:`, err.message)
  }
}

config.mcpServers.proof = proofServer

await mkdir(dirname(configPath), { recursive: true })
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

console.log(`
✅ Claude Desktop configurado (token eyJ…${token.slice(-8)})

   Archivo: ${configPath}
   URL MCP: ${url}

Siguiente:
  1. Cmd+Q en Claude (cerrar del todo)
  2. npm run dev corriendo en otra Terminal
  3. Abre Claude → tools de PROOF en el chat
`)
