import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentProfileType } from '@/lib/proof/agent-context-types'
import {
  getIdempotentResult,
  saveIdempotentResult,
} from '@/lib/mcp/idempotency'
import {
  resolveMcpScope,
  type McpScopeInput,
  type ResolvedMcpScope,
} from '@/lib/mcp/resolve-scope'
import {
  createMcpSupabase,
  mcpJsonResult,
  requireMcpContext,
  type McpToolResult,
} from '@/lib/mcp/tool-helpers'

export type McpWriteInput = McpScopeInput & {
  idempotency_key?: string
}

const WRITE_ROLES = new Set(['owner', 'admin', 'member'])

export function assertMcpWriteAccess(scope: ResolvedMcpScope): void {
  if (scope.profileType !== 'winemaker') return
  const org = scope.winemakerOrganizations.find(o => o.id === scope.organizationId)
  if (!org) {
    throw new Error('Winemaker organization membership required for write tools.')
  }
  if (!WRITE_ROLES.has(org.role)) {
    throw new Error('Viewer role cannot call write tools.')
  }
}

export async function withMcpWriteScope<T>(
  toolName: string,
  input: McpWriteInput | undefined,
  requiredProfile: AgentProfileType,
  run: (args: {
    sb: SupabaseClient
    userId: string
    scope: ResolvedMcpScope
  }) => Promise<T>
): Promise<McpToolResult> {
  const ctx = requireMcpContext()
  const cached = getIdempotentResult(ctx.userId, toolName, input?.idempotency_key)
  if (cached) return cached

  const sb = createMcpSupabase(ctx.accessToken)
  const scope = await resolveMcpScope(sb, ctx.userId, input)

  if (scope.profileType !== requiredProfile) {
    throw new Error(
      `This tool requires profile_type=${requiredProfile} (resolved: ${scope.profileType}).`
    )
  }

  assertMcpWriteAccess(scope)

  const data = await run({ sb, userId: ctx.userId, scope })
  const result = mcpJsonResult(data)
  saveIdempotentResult(ctx.userId, toolName, input?.idempotency_key, result)
  return result
}
