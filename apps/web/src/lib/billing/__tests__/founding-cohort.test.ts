import { afterEach, describe, expect, it } from 'vitest'
import {
  FOUNDING_COHORT_MAX,
  FOUNDING_REGULAR_ANNUAL_MXN,
  getFoundingStripeCouponId,
  isFoundingMember,
  resolveFoundingCheckoutCoupon,
} from '@/lib/billing/founding-cohort'
import { buildWinemakerCheckoutSessionParams } from '@/lib/billing/billing-checkout'

describe('founding cohort helpers', () => {
  afterEach(() => {
    delete process.env.STRIPE_COUPON_FOUNDING
  })

  it('detects founding member by timestamp', () => {
    expect(isFoundingMember(null)).toBe(false)
    expect(isFoundingMember('2026-07-01T00:00:00.000Z')).toBe(true)
  })

  it('returns coupon only for annual cycle when env is set', () => {
    process.env.STRIPE_COUPON_FOUNDING = 'coupon_founding'
    expect(getFoundingStripeCouponId('monthly')).toBeNull()
    expect(getFoundingStripeCouponId('annual')).toBe('coupon_founding')
  })

  it('resolves coupon for founding org on annual checkout', () => {
    process.env.STRIPE_COUPON_FOUNDING = 'coupon_founding'
    expect(resolveFoundingCheckoutCoupon(null, 'annual')).toBeNull()
    expect(resolveFoundingCheckoutCoupon('2026-07-01T00:00:00.000Z', 'monthly')).toBeNull()
    expect(resolveFoundingCheckoutCoupon('2026-07-01T00:00:00.000Z', 'annual')).toBe(
      'coupon_founding'
    )
  })

  it('documents cohort cap and example price', () => {
    expect(FOUNDING_COHORT_MAX).toBe(30)
    expect(FOUNDING_REGULAR_ANNUAL_MXN).toBe(2990)
  })
})

describe('buildWinemakerCheckoutSessionParams founding discount', () => {
  it('applies founding coupon and disables promotion codes', () => {
    const params = buildWinemakerCheckoutSessionParams({
      organizationId: 'org-1',
      billingCycle: 'annual',
      siteBaseUrl: 'https://app.test',
      monthlyPriceId: 'price_monthly',
      annualPriceId: 'price_annual',
      foundingCouponId: 'coupon_founding',
    })

    expect(params.discounts).toEqual([{ coupon: 'coupon_founding' }])
    expect(params.allow_promotion_codes).toBe(false)
  })

  it('allows promotion codes when no founding coupon', () => {
    const params = buildWinemakerCheckoutSessionParams({
      organizationId: 'org-1',
      billingCycle: 'annual',
      siteBaseUrl: 'https://app.test',
      monthlyPriceId: 'price_monthly',
      annualPriceId: 'price_annual',
    })

    expect(params.discounts).toBeUndefined()
    expect(params.allow_promotion_codes).toBe(true)
  })
})
