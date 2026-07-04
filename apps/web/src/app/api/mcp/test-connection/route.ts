import { createClient, getAuthUserId } from '@/lib/supabase/server'
import { errorMessageFromUnknown } from '@/lib/errors/unknown'
import { resolveMcpScope } from '@/lib/mcp/resolve-scope'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Browser-only connectivity check using the same Supabase SSR session as the dashboard
 * (cookies), not the bearer-token MCP path used by external clients.
 */
export async function POST() {
  const supabase = await createClient()
  const userId = await getAuthUserId()

  if (!userId) {
    return Response.json({ ok: false, error: 'no_session' }, { status: 401 })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  try {
    const scope = await resolveMcpScope(supabase, userId)

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
