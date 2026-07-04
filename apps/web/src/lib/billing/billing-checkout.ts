import type Stripe from 'stripe'
import type { BillingCycle } from '@/lib/stripe/server'
import {
  nextRenewalAnchorDate,
  stripeBillingCycleAnchorUnix,
} from '@/lib/billing/billing-renewal-anchor'

export type WinemakerCheckoutInput = {
  organizationId: string
  billingCycle: BillingCycle
  customerId?: string | null
  email?: string
  siteBaseUrl: string
  monthlyPriceId: string
  annualPriceId: string
  /** Auto-applied for founding cohort (annual). Mutually exclusive with promotion codes. */
  foundingCouponId?: string | null
}

export function winemakerProPriceIdForCycle(
  cycle: BillingCycle,
  prices: { monthly: string; annual: string }
): string {
  return cycle === 'annual' ? prices.annual : prices.monthly
}

/** Stripe Checkout session params for winemaker Pro upgrade. */
export function buildWinemakerCheckoutSessionParams(
  input: WinemakerCheckoutInput
): Stripe.Checkout.SessionCreateParams {
  const priceId = winemakerProPriceIdForCycle(input.billingCycle, {
    monthly: input.monthlyPriceId,
    annual: input.annualPriceId,
  })

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: {
      organization_id: input.organizationId,
      billing_cycle: input.billingCycle,
    },
  }

  if (input.billingCycle === 'annual') {
    const anchor = nextRenewalAnchorDate(new Date())
    subscriptionData.billing_cycle_anchor = stripeBillingCycleAnchorUnix(anchor)
    subscriptionData.proration_behavior = 'create_prorations'
  }

  const foundingCoupon = input.foundingCouponId?.trim()
  const useFoundingCoupon = Boolean(foundingCoupon)

  return {
    mode: 'subscription',
    ...(input.customerId
      ? { customer: input.customerId }
      : input.email
        ? { customer_email: input.email }
        : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      organization_id: input.organizationId,
      billing_cycle: input.billingCycle,
      ...(useFoundingCoupon ? { founding_member: 'true' } : {}),
    },
    subscription_data: subscriptionData,
    success_url: `${input.siteBaseUrl}/dashboard/settings?billing=success`,
    cancel_url: `${input.siteBaseUrl}/dashboard/settings?billing=canceled`,
    ...(useFoundingCoupon
      ? { discounts: [{ coupon: foundingCoupon! }], allow_promotion_codes: false }
      : { allow_promotion_codes: true }),
  }
}

export function billingCycleFromStripeInterval(
  interval: Stripe.Price.Recurring.Interval | undefined
): BillingCycle | null {
  if (interval === 'month') return 'monthly'
  if (interval === 'year') return 'annual'
  return null
}
