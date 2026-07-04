import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgPlan, OrgPlanStatus } from '@/lib/supabase/organization'
import { isMissingColumnError } from '@/lib/supabase/organization'
import { isTrialExpired } from '@/lib/billing/billing-renewal-anchor'
import {
  evaluateLimit,
  limitForResource,
  PLAN_LIMITS_CATALOG,
  type CheckLimitBlocked,
  type CheckLimitOk,
  type CheckLimitResult,
  type OrgPlanContext,
  type PlanLimitResource,
  type PlanLimitsRow,
  type PlanTier,
} from '@/lib/proof/plan-limits-types'

export type { CheckLimitResult, OrgPlanContext, PlanLimitResource, PlanLimitsRow, PlanTier }
export { PLAN_LIMITS_CATALOG, evaluateLimit, limitForResource }

/** Legacy DB value — treated as regular tier. */
export type LegacyOrgPlan = OrgPlan | 'free'

export function normalizePlanTier(plan: LegacyOrgPlan | string | null | undefined): PlanTier {
  if (plan === 'pro' || plan === 'enterprise' || plan === 'trial') return plan
  if (plan === 'regular' || plan === 'free' || plan == null) return 'regular'
  return 'regular'
}

export function resolveEffectivePlanTier(
  plan: LegacyOrgPlan | string,
  planStatus: OrgPlanStatus,
  trialEndsAt?: string | null
): PlanTier {
  if (plan === 'pro' || plan === 'enterprise') return normalizePlanTier(plan)
  if (plan === 'trial') {
    return isTrialExpired(trialEndsAt) ? 'regular' : 'trial'
  }
  if (planStatus === 'trialing' && (plan === 'regular' || plan === 'free')) {
    return isTrialExpired(trialEndsAt) ? 'regular' : 'trial'
  }
  return normalizePlanTier(plan)
}

export function planLimitsForTier(tier: PlanTier): PlanLimitsRow {
  return PLAN_LIMITS_CATALOG[tier]
}

export function parsePlanLimitsRow(raw: Record<string, unknown>): PlanLimitsRow {
  const plan = normalizePlanTier(String(raw.plan))
  const featuresRaw = raw.features
  const features: Record<string, boolean> = {}
  if (featuresRaw && typeof featuresRaw === 'object' && !Array.isArray(featuresRaw)) {
    for (const [key, value] of Object.entries(featuresRaw)) {
      if (typeof value === 'boolean') features[key] = value
    }
  }
  const catalog = PLAN_LIMITS_CATALOG[plan]
  return {
    plan,
    lotes_activos: (raw.lotes_activos as number | null) ?? catalog.lotes_activos,
    etiquetas: (raw.etiquetas as number | null) ?? catalog.etiquetas,
    memoria_meses: (raw.memoria_meses as number | null) ?? catalog.memoria_meses,
    max_usuarios: (raw.max_usuarios as number | null) ?? catalog.max_usuarios,
    features: { ...catalog.features, ...features },
  }
}

export async function fetchPlanLimitsRow(
  sb: SupabaseClient,
  tier: PlanTier
): Promise<PlanLimitsRow> {
  const { data, error } = await sb.from('plan_limites').select('*').eq('plan', tier).maybeSingle()

  if (error) {
    if (error.code === '42P01' || isMissingColumnError(error, 'plan')) {
      return planLimitsForTier(tier)
    }
    throw error
  }

  if (!data) return planLimitsForTier(tier)
  return parsePlanLimitsRow(data as Record<string, unknown>)
}

export async function fetchOrgPlanContext(
  sb: SupabaseClient,
  organizationId: string
): Promise<OrgPlanContext> {
  let { data, error } = await sb
    .from('organizations')
    .select(
      'plan, plan_status, features, billing_cycle, trial_ends_at, primer_registro_at, renewal_anchor, founding_member_at'
    )
    .eq('id', organizationId)
    .maybeSingle()

  if (error && isMissingColumnError(error, 'features')) {
    ;({ data, error } = await sb
      .from('organizations')
      .select('plan, plan_status')
      .eq('id', organizationId)
      .maybeSingle())
  }

  if (error) throw error
  if (!data) throw new Error('organization_not_found')

  const plan = (data.plan as LegacyOrgPlan) ?? 'regular'
  const plan_status = (data.plan_status as OrgPlanStatus) ?? 'active'
  const tier = resolveEffectivePlanTier(
    plan,
    plan_status,
    (data.trial_ends_at as string | null) ?? null
  )
  const limits = await fetchPlanLimitsRow(sb, tier)

  const orgFeatures =
    data.features && typeof data.features === 'object' && !Array.isArray(data.features)
      ? (data.features as Record<string, boolean>)
      : {}

  return {
    organizationId,
    plan: tier,
    plan_status,
    features: orgFeatures,
    limits,
    billing_cycle: (data.billing_cycle as OrgPlanContext['billing_cycle']) ?? null,
    trial_ends_at: (data.trial_ends_at as string | null) ?? null,
    primer_registro_at: (data.primer_registro_at as string | null) ?? null,
    renewal_anchor: (data.renewal_anchor as string | null) ?? null,
    founding_member_at: (data.founding_member_at as string | null) ?? null,
  }
}

export async function countPlanResourceUsage(
  sb: SupabaseClient,
  organizationId: string,
  resource: PlanLimitResource
): Promise<number> {
  switch (resource) {
    case 'lotes_activos': {
      const { count, error } = await sb
        .from('lots')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')
      if (error) throw error
      return count ?? 0
    }
    case 'etiquetas': {
      const { count, error } = await sb
        .from('wm_etiquetas')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
      if (error) {
        if (error.code === '42P01') return 0
        throw error
      }
      return count ?? 0
    }
    case 'usuarios': {
      const { count, error } = await sb
        .from('organization_members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['active', 'invited'])
      if (error) throw error
      return count ?? 0
    }
    case 'memoria': {
      const { data, error } = await sb
        .from('events')
        .select('occurred_at')
        .eq('organization_id', organizationId)
        .order('occurred_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) {
        if (error.code === '42P01') return 0
        throw error
      }

      if (!data?.occurred_at) return 0

      const oldest = new Date(data.occurred_at as string)
      const now = new Date()
      const months =
        (now.getFullYear() - oldest.getFullYear()) * 12 + (now.getMonth() - oldest.getMonth())
      return Math.max(0, months)
    }
  }
}

/** Never deletes data — only blocks creation beyond plan_limites. */
export async function checkLimit(
  sb: SupabaseClient,
  organizationId: string,
  resource: PlanLimitResource,
  options?: { additional?: number }
): Promise<CheckLimitResult> {
  const ctx = await fetchOrgPlanContext(sb, organizationId)
  const limit = limitForResource(ctx.limits, resource)
  const current = await countPlanResourceUsage(sb, organizationId, resource)
  return evaluateLimit(resource, current, limit, ctx.plan, options?.additional ?? 1)
}

export function planHasFeature(
  ctx: Pick<OrgPlanContext, 'limits' | 'features'>,
  feature: string
): boolean {
  const override = ctx.features?.[feature]
  if (typeof override === 'boolean') return override
  return ctx.limits.features[feature] === true
}

export function planLimitErrorCode(resource: PlanLimitResource): string {
  return `limit_reached_${resource}`
}

export class PlanLimitError extends Error {
  readonly code: string
  readonly resource: PlanLimitResource
  readonly current: number
  readonly limit: number
  readonly plan: PlanTier

  constructor(result: CheckLimitBlocked) {
    const code = planLimitErrorCode(result.resource)
    super(code)
    this.name = 'PlanLimitError'
    this.code = code
    this.resource = result.resource
    this.current = result.current
    this.limit = result.limit
    this.plan = result.plan
  }
}

/** Throws PlanLimitError when creation would exceed plan_limites. */
export async function assertPlanLimit(
  sb: SupabaseClient,
  organizationId: string,
  resource: PlanLimitResource,
  options?: { additional?: number }
): Promise<CheckLimitOk> {
  const result = await checkLimit(sb, organizationId, resource, options)
  if (!result.ok) throw new PlanLimitError(result)
  return result
}
