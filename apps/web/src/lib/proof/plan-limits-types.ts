/** Plan limits catalog (Epic E — E1). */

export type PlanTier = 'regular' | 'pro' | 'enterprise' | 'trial'

export type PlanLimitResource = 'lotes_activos' | 'etiquetas' | 'usuarios' | 'memoria'

export type PlanLimitsRow = {
  plan: PlanTier
  lotes_activos: number | null
  etiquetas: number | null
  memoria_meses: number | null
  max_usuarios: number | null
  features: Record<string, boolean>
}

export type OrgBillingFields = {
  billing_cycle: 'monthly' | 'annual' | null
  trial_ends_at: string | null
  primer_registro_at: string | null
  renewal_anchor: string | null
  founding_member_at: string | null
}

export type OrgPlanContext = OrgBillingFields & {
  organizationId: string
  plan: PlanTier
  plan_status: 'active' | 'trialing' | 'past_due' | 'canceled'
  features: Record<string, boolean>
  limits: PlanLimitsRow
}

export type CheckLimitOk = {
  ok: true
  resource: PlanLimitResource
  current: number
  limit: number | null
  remaining: number | null
}

export type CheckLimitBlocked = {
  ok: false
  code: 'limit_reached'
  resource: PlanLimitResource
  current: number
  limit: number
  plan: PlanTier
}

export type CheckLimitResult = CheckLimitOk | CheckLimitBlocked

/** In-memory defaults — mirror plan_limites seed (offline / tests). */
export const PLAN_LIMITS_CATALOG: Record<PlanTier, PlanLimitsRow> = {
  regular: {
    plan: 'regular',
    lotes_activos: 5,
    etiquetas: 5,
    memoria_meses: 12,
    max_usuarios: 1,
    features: { chat: false, numeracion_botellas: false },
  },
  trial: {
    plan: 'trial',
    lotes_activos: 5,
    etiquetas: 5,
    memoria_meses: 12,
    max_usuarios: 1,
    features: { chat: false, numeracion_botellas: false },
  },
  pro: {
    plan: 'pro',
    lotes_activos: 20,
    etiquetas: 30,
    memoria_meses: 36,
    max_usuarios: null,
    features: { chat: true, numeracion_botellas: false },
  },
  enterprise: {
    plan: 'enterprise',
    lotes_activos: null,
    etiquetas: null,
    memoria_meses: null,
    max_usuarios: null,
    features: { chat: true, numeracion_botellas: true },
  },
}

export function limitForResource(
  limits: PlanLimitsRow,
  resource: PlanLimitResource
): number | null {
  switch (resource) {
    case 'lotes_activos':
      return limits.lotes_activos
    case 'etiquetas':
      return limits.etiquetas
    case 'usuarios':
      return limits.max_usuarios
    case 'memoria':
      return limits.memoria_meses
  }
}

export function evaluateLimit(
  resource: PlanLimitResource,
  current: number,
  limit: number | null,
  plan: PlanTier,
  additional = 1
): CheckLimitResult {
  if (limit == null) {
    return { ok: true, resource, current, limit: null, remaining: null }
  }

  const next = current + additional
  if (next > limit) {
    return { ok: false, code: 'limit_reached', resource, current, limit, plan }
  }

  return {
    ok: true,
    resource,
    current,
    limit,
    remaining: Math.max(0, limit - next),
  }
}
