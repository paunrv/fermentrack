import { createClient, getAuthUserId } from '@/lib/supabase/server'
import { errorMessageFromUnknown } from '@/lib/errors/unknown'
import type { AgentProfileType } from '@/lib/proof/agent-context-types'
import { resolveMcpScope } from '@/lib/mcp/resolve-scope'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Browser-only connectivity check using the same Supabase SSR session as the dashboard
 * (cookies), not the bearer-token MCP path used by external clients.
 */
function parseProfileType(body: unknown): AgentProfileType | undefined {
  if (!body || typeof body !== 'object') return undefined
  const value = (body as { profile_type?: unknown }).profile_type
  if (value === 'distributor' || value === 'winemaker' || value === 'distiller') {
    return value
  }
  return undefined
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const userId = await getAuthUserId()

  if (!userId) {
    return Response.json({ ok: false, error: 'no_session' }, { status: 401 })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  let requestedProfile: AgentProfileType | undefined
  try {
    const body = await request.json()
    requestedProfile = parseProfileType(body)
  } catch {
    requestedProfile = undefined
  }

  try {
    const scope = await resolveMcpScope(
      supabase,
      userId,
      requestedProfile ? { profile_type: requestedProfile } : undefined
    )

    return Response.json({
      ok: true,
      profile_type: scope.profileType,
      organization_id: scope.organizationId,
      profile_count: scope.availableProfiles.length,
      expires_at: session?.expires_at ?? null,
    })
  } catch (err) {
    const message = errorMessageFromUnknown(err)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
