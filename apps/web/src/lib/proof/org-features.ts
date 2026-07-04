import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isMissingColumnError,
  type OrgPlan,
  type OrgPlanStatus,
} from '@/lib/supabase/organization'
import {
  normalizePlanTier,
  planHasFeature,
  planLimitsForTier,
  resolveEffectivePlanTier,
  type LegacyOrgPlan,
} from '@/lib/proof/plan-limits'

/** Feature flags gated by plan_limites + organizations.features jsonb. */
export type OrgFeature = 'numeracion_botellas' | 'chat'

export type OrgFeaturesMap = Partial<Record<OrgFeature, boolean>>

export type OrgFeatureSource = {
  plan: OrgPlan | 'free'
  plan_status?: OrgPlanStatus
  features?: OrgFeaturesMap | null
}

export function parseOrgFeatures(raw: unknown): OrgFeaturesMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: OrgFeaturesMap = {}
  for (const key of Object.keys(raw)) {
    if (key !== 'numeracion_botellas' && key !== 'chat') continue
    const value = (raw as Record<string, unknown>)[key]
    if (typeof value !== 'boolean') continue
    if (key === 'numeracion_botellas') out.numeracion_botellas = value
    if (key === 'chat') out.chat = value
  }
  return out
}

export function orgFeatureSourceFromPlan(
  plan: OrgPlan | 'free',
  planStatus: OrgPlanStatus = 'active'
): OrgFeatureSource {
  return { plan, plan_status: planStatus, features: {} }
}

function tierForSource(source: OrgFeatureSource): ReturnType<typeof normalizePlanTier> {
  if (source.plan_status) {
    return resolveEffectivePlanTier(source.plan as LegacyOrgPlan, source.plan_status)
  }
  if (source.plan === 'trial') return 'trial'
  return normalizePlanTier(source.plan)
}

/** Plan default (plan_limites) + optional per-org override in organizations.features. */
export function orgHasFeature(source: OrgFeatureSource | OrgPlan | 'free', feature: OrgFeature): boolean {
  const ctx: OrgFeatureSource =
    typeof source === 'string' ? orgFeatureSourceFromPlan(source) : source

  const tier = tierForSource(ctx)
  const limits = planLimitsForTier(tier)

  return planHasFeature(
    { limits, features: ctx.features ?? {} },
    feature
  )
}

export async function fetchOrgFeatureSource(
  sb: SupabaseClient,
  organizationId: string
): Promise<OrgFeatureSource> {
  let { data, error } = await sb
    .from('organizations')
    .select('plan, plan_status, features')
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

  return {
    plan: (data?.plan as OrgPlan | 'free') ?? 'regular',
    plan_status: (data?.plan_status as OrgPlanStatus) ?? 'active',
    features: parseOrgFeatures(data?.features),
  }
}

/** Human-readable plan capabilities — shown in settings/billing. */
export const PLAN_FEATURE_LABELS: Record<OrgPlan, OrgFeature[]> = {
  regular: [],
  trial: [],
  pro: ['chat'],
  enterprise: ['chat', 'numeracion_botellas'],
}
