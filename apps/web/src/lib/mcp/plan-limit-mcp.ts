import type { SupabaseClient } from '@supabase/supabase-js'
import {
  assertPlanLimit,
  checkLimit,
  PlanLimitError,
  planLimitErrorCode,
} from '@/lib/proof/plan-limits'
import type {
  CheckLimitBlocked,
  PlanLimitResource,
  PlanTier,
} from '@/lib/proof/plan-limits-types'

export const MCP_PLAN_UPGRADE_PATH = '/dashboard/settings'

export type McpPlanLimitPayload = {
  error: 'plan_limit_reached'
  code: string
  resource: PlanLimitResource
  current: number | null
  limit: number | null
  plan: PlanTier | null
  message: string
  upgrade_path: string
  upgrade_hint: string
  data_safe: true
}

const RESOURCE_LABELS: Record<PlanLimitResource, string> = {
  lotes_activos: 'active lots',
  etiquetas: 'label catalog entries',
  usuarios: 'team members',
  memoria: 'months of event memory',
}

function upgradeHint(plan: PlanTier | null, resource: PlanLimitResource): string {
  if (plan === 'enterprise') {
    return 'Contact support if you need a custom limit increase.'
  }
  if (plan === 'pro') {
    if (resource === 'memoria' || resource === 'lotes_activos' || resource === 'etiquetas') {
      return 'Upgrade to Enterprise for unlimited capacity.'
    }
    return 'Your Pro plan already includes expanded limits for this resource.'
  }
  return 'Upgrade to Pro at /dashboard/settings for higher limits (chat, more lots, labels, and memory).'
}

function buildMessage(blocked: CheckLimitBlocked): string {
  const label = RESOURCE_LABELS[blocked.resource]
  return `Plan limit reached: ${label} (${blocked.current}/${blocked.limit} on ${blocked.plan}). Existing data remains accessible — only new creation is blocked.`
}

export function buildMcpPlanLimitPayload(blocked: CheckLimitBlocked): McpPlanLimitPayload {
  return {
    error: 'plan_limit_reached',
    code: planLimitErrorCode(blocked.resource),
    resource: blocked.resource,
    current: blocked.current,
    limit: blocked.limit,
    plan: blocked.plan,
    message: buildMessage(blocked),
    upgrade_path: MCP_PLAN_UPGRADE_PATH,
    upgrade_hint: upgradeHint(blocked.plan, blocked.resource),
    data_safe: true,
  }
}

export class McpPlanLimitError extends Error {
  readonly payload: McpPlanLimitPayload

  constructor(payload: McpPlanLimitPayload) {
    super(JSON.stringify(payload))
    this.name = 'McpPlanLimitError'
    this.payload = payload
  }

  static fromBlocked(blocked: CheckLimitBlocked): McpPlanLimitError {
    return new McpPlanLimitError(buildMcpPlanLimitPayload(blocked))
  }

  static fromPlanLimitError(err: PlanLimitError): McpPlanLimitError {
    return McpPlanLimitError.fromBlocked({
      ok: false,
      code: 'limit_reached',
      resource: err.resource,
      current: err.current,
      limit: err.limit,
      plan: err.plan,
    })
  }
}

export async function assertMcpPlanLimit(
  sb: SupabaseClient,
  organizationId: string,
  resource: PlanLimitResource,
  options?: { additional?: number }
): Promise<void> {
  try {
    await assertPlanLimit(sb, organizationId, resource, options)
  } catch (err) {
    if (err instanceof PlanLimitError) throw McpPlanLimitError.fromPlanLimitError(err)
    throw err
  }
}

const LIMIT_CODE_PREFIX = 'limit_reached_'

export function isPlanLimitErrorCode(code: string): code is `limit_reached_${PlanLimitResource}` {
  return code.startsWith(LIMIT_CODE_PREFIX)
}

export function resourceFromPlanLimitCode(code: string): PlanLimitResource | null {
  if (!isPlanLimitErrorCode(code)) return null
  const resource = code.slice(LIMIT_CODE_PREFIX.length) as PlanLimitResource
  if (resource === 'lotes_activos' || resource === 'etiquetas' || resource === 'usuarios' || resource === 'memoria') {
    return resource
  }
  return null
}

/** Map domain-layer limit codes into structured MCP errors (with live usage when possible). */
export async function normalizeMcpPlanLimitError(
  e: unknown,
  sb: SupabaseClient | null,
  organizationId: string | null
): Promise<McpPlanLimitError | null> {
  if (e instanceof McpPlanLimitError) return e
  if (e instanceof PlanLimitError) return McpPlanLimitError.fromPlanLimitError(e)

  const code = e instanceof Error ? e.message : null
  if (!code || !isPlanLimitErrorCode(code)) return null

  const resource = resourceFromPlanLimitCode(code)
  if (!resource || !sb || !organizationId) {
    return new McpPlanLimitError({
      error: 'plan_limit_reached',
      code,
      resource: resource ?? 'memoria',
      current: null,
      limit: null,
      plan: null,
      message: `Plan limit reached (${code}). Existing data remains accessible.`,
      upgrade_path: MCP_PLAN_UPGRADE_PATH,
      upgrade_hint: upgradeHint(null, resource ?? 'memoria'),
      data_safe: true,
    })
  }

  const result = await checkLimit(sb, organizationId, resource)
  if (!result.ok) return McpPlanLimitError.fromBlocked(result)

  return McpPlanLimitError.fromBlocked({
    ok: false,
    code: 'limit_reached',
    resource,
    current: result.current,
    limit: result.limit ?? 0,
    plan: 'regular',
  })
}
