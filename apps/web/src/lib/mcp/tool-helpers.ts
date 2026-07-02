import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentProfileType } from '@/lib/proof/agent-context-types'
import { createSupabaseForMcpToken } from '@/lib/mcp/auth'
import { getMcpRequestContext, type McpRequestContext } from '@/lib/mcp/request-context'
import { resolveMcpScope, type McpScopeInput, type ResolvedMcpScope } from '@/lib/mcp/resolve-scope'

export type McpToolResult = { content: { type: 'text'; text: string }[] }

export function mcpJsonResult(data: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

export function requireMcpContext(): McpRequestContext {
  const ctx = getMcpRequestContext()
  if (!ctx) throw new Error('Unauthorized')
  return ctx
}

export function createMcpSupabase(accessToken: string): SupabaseClient {
  return createSupabaseForMcpToken(accessToken)
}

export async function withMcpScope<T>(
  input: McpScopeInput | undefined,
  requiredProfile: AgentProfileType,
  run: (args: {
    sb: SupabaseClient
    ctx: McpRequestContext
    scope: ResolvedMcpScope
  }) => Promise<T>
): Promise<McpToolResult> {
  const ctx = requireMcpContext()
  const sb = createMcpSupabase(ctx.accessToken)
  const scope = await resolveMcpScope(sb, ctx.userId, input)

  if (scope.profileType !== requiredProfile) {
    throw new Error(
      `This tool requires profile_type=${requiredProfile} (resolved: ${scope.profileType}). Pass profile_type explicitly if you have multiple profiles.`
    )
  }

  const data = await run({ sb, ctx, scope })
  return mcpJsonResult(data)
}
