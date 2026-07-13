import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ProofMcpAuthInfo = {
  token: string
  clientId: string
  scopes: string[]
}

function requireSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

function requireAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

export async function getUserIdFromAccessToken(accessToken: string): Promise<string | null> {
  const supabase = createClient(requireSupabaseUrl(), requireAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) return null
  return data.user.id
}

export function createSupabaseForMcpToken(accessToken: string): SupabaseClient {
  return createClient(requireSupabaseUrl(), requireAnonKey(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function verifyMcpBearerToken(
  _req: Request,
  bearerToken?: string
): Promise<ProofMcpAuthInfo | undefined> {
  if (!bearerToken?.trim()) return undefined
  const userId = await getUserIdFromAccessToken(bearerToken)
  if (!userId) {
    // Distinguish missing header from present-but-invalid JWT so MCP clients
    // do not treat expired tokens as "no authorization" and fall into OAuth/DCR.
    throw new Error('Invalid or expired bearer token')
  }
  return {
    token: bearerToken,
    clientId: userId,
    scopes: ['proof:read'],
  }
}

export function supabaseOAuthIssuer(): string {
  return `${requireSupabaseUrl().replace(/\/$/, '')}/auth/v1`
}

/**
 * Supabase Auth OAuth 2.1 server (dashboard → Authentication → OAuth Server).
 * Until enabled, do not advertise authorization_servers — MCP clients will try
 * dynamic client registration and fail with "Incompatible auth server".
 */
export function isProofMcpOAuthServerEnabled(): boolean {
  return process.env.PROOF_MCP_OAUTH_ENABLED === 'true'
}
