import type { OrgPlan, OrgPlanStatus } from '@/lib/supabase/organization'

/** Límites v1 — ver docs/ORG-TENANCY.md */
export const WINEMAKER_PLAN_LIMITS = {
  free: {
    maxLots: 3,
    maxDocumentsPerMonth: 20,
    teamInvites: false,
  },
  pro: {
    maxLots: null as number | null,
    maxDocumentsPerMonth: null as number | null,
    teamInvites: true,
  },
  enterprise: {
    maxLots: null as number | null,
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
      return { plan: 'free', plan_status: 'canceled' }
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
