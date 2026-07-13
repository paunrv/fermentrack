import { isProofMcpOAuthServerEnabled, supabaseOAuthIssuer } from '@/lib/mcp/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
}

function resourceIdentifier(req: Request): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (site) return site

  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    || (host?.includes('localhost') || host?.startsWith('127.') ? 'http' : 'https')

  if (host && !host.startsWith('0.0.0.0')) {
    return `${proto}://${host}`
  }

  const url = new URL(req.url)
  if (url.hostname === '0.0.0.0') url.hostname = 'localhost'
  return url.origin
}

function handler(req: Request): Response {
  const resource = resourceIdentifier(req)

  // Until Supabase Auth OAuth 2.1 is enabled, omit authorization_servers so MCP
  // clients (Cursor / mcp-remote) do not attempt dynamic client registration.
  const metadata = isProofMcpOAuthServerEnabled()
    ? {
        resource,
        authorization_servers: [supabaseOAuthIssuer()],
        bearer_methods_supported: ['header'],
      }
    : {
        resource,
        bearer_methods_supported: ['header'],
      }

  return Response.json(metadata, {
    headers: {
      ...corsHeaders,
      'Cache-Control': 'max-age=60',
      'Content-Type': 'application/json',
    },
  })
}

function optionsHandler(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export { handler as GET, optionsHandler as OPTIONS }
