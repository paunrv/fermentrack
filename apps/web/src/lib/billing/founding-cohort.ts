import type { BillingCycle } from '@/lib/stripe/server'

/** First 20–30 winemakers in Valle de Guadalupe (issue #66). */
export const FOUNDING_COHORT_MAX = 30

/** Example frozen Regular annual price (MXN) — configured in Stripe via coupon. */
export const FOUNDING_REGULAR_ANNUAL_MXN = 2990

export function isFoundingMember(foundingMemberAt: string | null | undefined): boolean {
  return foundingMemberAt != null && foundingMemberAt !== ''
}

/** Stripe coupon id for lifetime founding discount (annual checkout). */
export function getFoundingStripeCouponId(cycle: BillingCycle): string | null {
  if (cycle !== 'annual') return null
  return process.env.STRIPE_COUPON_FOUNDING?.trim() || null
}

/** Coupon to auto-apply at checkout when org is in the founding cohort. */
export function resolveFoundingCheckoutCoupon(
  foundingMemberAt: string | null | undefined,
  billingCycle: BillingCycle
): string | null {
  if (!isFoundingMember(foundingMemberAt)) return null
  return getFoundingStripeCouponId(billingCycle)
}
