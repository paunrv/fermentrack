import type { SupabaseClient } from '@supabase/supabase-js'
import { isTrialExpired, trialDaysRemaining } from '@/lib/billing/billing-renewal-anchor'
import { isFoundingMember } from '@/lib/billing/founding-cohort'
import {
  countPlanResourceUsage,
  fetchOrgPlanContext,
  planLimitsForTier,
  resolveEffectivePlanTier,
} from '@/lib/proof/plan-limits'
import type { OrgPlanContext, PlanLimitResource } from '@/lib/proof/plan-limits-types'
import { orgCanInviteTeamMembersFromLimits } from '@/lib/proof/plan-team-invites'

export type PlanOverLimitItem = {
  resource: PlanLimitResource
  current: number
  limit: number
}

export type PlanOverLimitSummary = {
  hasOverLimit: boolean
  items: PlanOverLimitItem[]
}

const DOWNGRADE_CHECK_RESOURCES: PlanLimitResource[] = [
  'lotes_activos',
  'etiquetas',
  'usuarios',
  'memoria',
]

function limitForRegularTier(resource: PlanLimitResource, regular: ReturnType<typeof planLimitsForTier>) {
  switch (resource) {
    case 'lotes_activos':
      return regular.lotes_activos
    case 'etiquetas':
      return regular.etiquetas
    case 'usuarios':
      return regular.max_usuarios
    case 'memoria':
      return regular.memoria_meses
  }
}

/** After downgrade — usage above Regular caps (read-only; creation already blocked). */
export async function fetchPlanOverLimitSummary(
  sb: SupabaseClient,
  organizationId: string
): Promise<PlanOverLimitSummary> {
  const regular = planLimitsForTier('regular')
  const items: PlanOverLimitItem[] = []

  for (const resource of DOWNGRADE_CHECK_RESOURCES) {
    const limit = limitForRegularTier(resource, regular)
    if (limit == null) continue

    const current = await countPlanResourceUsage(sb, organizationId, resource)
    if (current > limit) {
      items.push({ resource, current, limit })
    }
  }

  return { hasOverLimit: items.length > 0, items }
}

export type PlanBillingStatus = {
  plan: OrgPlanContext['plan']
  plan_status: OrgPlanContext['plan_status']
  effectiveTier: OrgPlanContext['plan']
  trialExpired: boolean
  trialDaysRemaining: number
  canInviteTeam: boolean
  overLimit: PlanOverLimitSummary
  showUpgrade: boolean
  showManageSubscription: boolean
  showDowngradeNotice: boolean
  isFoundingMember: boolean
}

export async function fetchPlanBillingStatus(
  sb: SupabaseClient,
  organizationId: string
): Promise<PlanBillingStatus> {
  const ctx = await fetchOrgPlanContext(sb, organizationId)

  const trialExpired =
    (ctx.plan === 'trial' || ctx.plan_status === 'trialing') && isTrialExpired(ctx.trial_ends_at)

  const overLimit = await fetchPlanOverLimitSummary(sb, organizationId)

  return {
    plan: ctx.plan,
    plan_status: ctx.plan_status,
    effectiveTier: resolveEffectivePlanTier(ctx.plan, ctx.plan_status, ctx.trial_ends_at),
    trialExpired,
    trialDaysRemaining: trialDaysRemaining(ctx.trial_ends_at),
    canInviteTeam: orgCanInviteTeamMembersFromLimits(ctx.limits),
    overLimit,
    showUpgrade:
      ctx.plan === 'regular' ||
      ctx.plan === 'trial' ||
      ctx.plan_status === 'canceled' ||
      trialExpired,
    showManageSubscription:
      ctx.plan === 'pro' || ctx.plan === 'enterprise' || ctx.plan_status === 'past_due',
    showDowngradeNotice:
      (ctx.plan === 'regular' || ctx.plan_status === 'canceled') && overLimit.hasOverLimit,
    isFoundingMember: isFoundingMember(ctx.founding_member_at),
  }
}
