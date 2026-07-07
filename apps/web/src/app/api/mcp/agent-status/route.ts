import { createClient, getAuthUserId } from '@/lib/supabase/server'
import { errorMessageFromUnknown } from '@/lib/errors/unknown'
import type { AgentProfileType } from '@/lib/proof/agent-context-types'
import { resolveMcpScope } from '@/lib/mcp/resolve-scope'
import { createServiceSupabase } from '@/utils/supabase/service'
import type { McpAgentStatusResponse } from '@/lib/mcp/agent-status'

export type { McpAgentStatusResponse }

/** Dashboard agent card — session expiry + latest MCP tool call for active org. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function profileTypeFromQuery(value: string | null): AgentProfileType | undefined {
  if (value === 'distributor' || value === 'winemaker' || value === 'distiller') {
    return value
  }
  return undefined
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const userId = await getAuthUserId()

  if (!userId) {
    return Response.json({ error: 'no_session' }, { status: 401 })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const requestedProfile = profileTypeFromQuery(
    new URL(request.url).searchParams.get('profile_type')
  )

  try {
    const scope = await resolveMcpScope(
      supabase,
      userId,
      requestedProfile ? { profile_type: requestedProfile } : undefined
    )
    const tokenExpiresAt = session?.expires_at ?? null
    const tokenExpired = tokenExpiresAt != null && tokenExpiresAt * 1000 <= Date.now()

    let lastToolCall: McpAgentStatusResponse['lastToolCall'] = null

    if (scope.organizationId) {
      const service = createServiceSupabase()
      const { data, error } = await service
        .from('mcp_tool_calls')
        .select('tool_name, status, created_at')
        .eq('organization_id', scope.organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        lastToolCall = {
          toolName: data.tool_name,
          status: data.status,
          createdAt: data.created_at,
        }
      }
    }

    const body: McpAgentStatusResponse = {
      tokenExpiresAt,
      tokenExpired,
      lastToolCall,
    }

    return Response.json(body)
  } catch (err) {
    const message = errorMessageFromUnknown(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
