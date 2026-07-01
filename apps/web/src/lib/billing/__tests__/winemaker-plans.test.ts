import { describe, expect, it } from 'vitest'
import { planFromStripeSubscriptionStatus } from '@/lib/billing/winemaker-plans'

describe('planFromStripeSubscriptionStatus', () => {
  it('maps active to pro/active', () => {
    expect(planFromStripeSubscriptionStatus('active')).toEqual({
      plan: 'pro',
      plan_status: 'active',
    })
  })

  it('maps trialing to pro/trialing', () => {
    expect(planFromStripeSubscriptionStatus('trialing')).toEqual({
      plan: 'pro',
      plan_status: 'trialing',
    })
  })

  it('maps canceled to free/canceled', () => {
    expect(planFromStripeSubscriptionStatus('canceled')).toEqual({
      plan: 'free',
      plan_status: 'canceled',
    })
  })

  it('maps past_due to pro/past_due', () => {
    expect(planFromStripeSubscriptionStatus('past_due')).toEqual({
      plan: 'pro',
      plan_status: 'past_due',
    })
  })
})
