import type { SupabaseClient } from '@supabase/supabase-js'
import {
  countPlanResourceUsage,
  fetchOrgPlanContext,
  limitForResource,
} from '@/lib/proof/plan-limits'
import type { PlanTier } from '@/lib/proof/plan-limits-types'

export type PlanLimitHomeResource = 'lotes_activos' | 'memoria'

export type PlanLimitWarningLevel = 'ok' | 'approaching' | 'reached'

export type PlanResourceWarning = {
  resource: PlanLimitHomeResource
  current: number
  limit: number | null
  remaining: number | null
  level: PlanLimitWarningLevel
  percentUsed: number | null
}

export type PlanHomeWarnings = {
  plan: PlanTier
  resources: PlanResourceWarning[]
  showAlerts: boolean
}

/** Show warning at 80% capacity or when one slot remains. */
export const PLAN_WARNING_APPROACH_RATIO = 0.8

export function planResourceWarningLevel(
  current: number,
  limit: number | null
): PlanLimitWarningLevel {
  if (limit == null) return 'ok'
  if (current >= limit) return 'reached'
  if (current + 1 >= limit) return 'approaching'
  if (limit > 0 && current / limit >= PLAN_WARNING_APPROACH_RATIO) return 'approaching'
  return 'ok'
}

export function buildPlanResourceWarning(
  resource: PlanLimitHomeResource,
  current: number,
  limit: number | null
): PlanResourceWarning {
  const level = planResourceWarningLevel(current, limit)
  const remaining = limit == null ? null : Math.max(0, limit - current)
  const percentUsed =
    limit == null || limit === 0 ? null : Math.min(100, Math.round((current / limit) * 100))

  return { resource, current, limit, remaining, level, percentUsed }
}

export async function fetchPlanHomeWarnings(
  sb: SupabaseClient,
  organizationId: string
): Promise<PlanHomeWarnings | null> {
  try {
    const ctx = await fetchOrgPlanContext(sb, organizationId)
    const [lotesCurrent, memoriaCurrent] = await Promise.all([
      countPlanResourceUsage(sb, organizationId, 'lotes_activos'),
      countPlanResourceUsage(sb, organizationId, 'memoria'),
    ])

    const resources: PlanResourceWarning[] = [
      buildPlanResourceWarning(
        'lotes_activos',
        lotesCurrent,
        limitForResource(ctx.limits, 'lotes_activos')
      ),
      buildPlanResourceWarning(
        'memoria',
        memoriaCurrent,
        limitForResource(ctx.limits, 'memoria')
      ),
    ]

    return {
      plan: ctx.plan,
      resources,
      showAlerts: resources.some(resource => resource.level !== 'ok'),
    }
  } catch {
    return null
  }
}
