import type { OrgPlan, OrgPlanStatus } from '@/lib/supabase/organization'
import { PLAN_LIMITS_CATALOG } from '@/lib/proof/plan-limits'

/** @deprecated Prefer plan_limites via checkLimit — kept for billing webhook compatibility. */
export const WINEMAKER_PLAN_LIMITS = {
  regular: {
    maxLots: PLAN_LIMITS_CATALOG.regular.lotes_activos,
    maxDocumentsPerMonth: null as number | null,
    teamInvites: (PLAN_LIMITS_CATALOG.regular.max_usuarios ?? 1) > 1,
  },
  trial: {
    maxLots: PLAN_LIMITS_CATALOG.trial.lotes_activos,
    maxDocumentsPerMonth: null as number | null,
    teamInvites: false,
  },
  pro: {
    maxLots: PLAN_LIMITS_CATALOG.pro.lotes_activos,
    maxDocumentsPerMonth: null as number | null,
    teamInvites: true,
  },
  enterprise: {
    maxLots: PLAN_LIMITS_CATALOG.enterprise.lotes_activos,
    maxDocumentsPerMonth: null as number | null,
    teamInvites: true,
  },
} as const

export type WinemakerPlanSnapshot = {
  plan: OrgPlan
  plan_status: OrgPlanStatus
}

/** Mapeo Stripe subscription.status → plan + plan_status en organizations. */
export function planFromStripeSubscriptionStatus(
  status: string
): WinemakerPlanSnapshot {
  switch (status) {
    case 'active':
      return { plan: 'pro', plan_status: 'active' }
    case 'trialing':
      return { plan: 'pro', plan_status: 'trialing' }
    case 'past_due':
      return { plan: 'pro', plan_status: 'past_due' }
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return { plan: 'regular', plan_status: 'canceled' }
    case 'incomplete':
    case 'paused':
    default:
      return { plan: 'pro', plan_status: 'past_due' }
  }
}

export function isWinemakerProActive(snapshot: WinemakerPlanSnapshot): boolean {
  return (
    snapshot.plan === 'pro' &&
    (snapshot.plan_status === 'active' || snapshot.plan_status === 'trialing')
  )
}
