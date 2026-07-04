import { describe, expect, it } from 'vitest'
import { buildWinemakerCheckoutSessionParams } from '@/lib/billing/billing-checkout'
import {
  computeTrialEndsAt,
  formatRenewalAnchorDate,
  isTrialExpired,
  nextRenewalAnchorDate,
  TRIAL_DURATION_DAYS,
  VENDIMIA_RENEWAL_ANCHOR,
} from '@/lib/billing/billing-renewal-anchor'

describe('nextRenewalAnchorDate', () => {
  it('returns same-year anchor when before Aug 1', () => {
    const from = new Date('2026-03-15T12:00:00.000Z')
    const anchor = nextRenewalAnchorDate(from)
    expect(formatRenewalAnchorDate(anchor)).toBe('2026-08-01')
  })

  it('returns next-year anchor when after Aug 1', () => {
    const from = new Date('2026-09-10T12:00:00.000Z')
    const anchor = nextRenewalAnchorDate(from)
    expect(formatRenewalAnchorDate(anchor)).toBe('2027-08-01')
  })
})

describe('trial helpers', () => {
  it('computes 90-day trial', () => {
    const start = new Date('2026-01-01T00:00:00.000Z')
    const end = computeTrialEndsAt(start)
    expect(end.toISOString().slice(0, 10)).toBe('2026-04-01')
    expect(TRIAL_DURATION_DAYS).toBe(90)
  })

  it('detects expired trial', () => {
    expect(isTrialExpired('2020-01-01T00:00:00.000Z', new Date('2026-01-01'))).toBe(true)
    expect(isTrialExpired('2099-01-01T00:00:00.000Z', new Date('2026-01-01'))).toBe(false)
  })
})

describe('buildWinemakerCheckoutSessionParams', () => {
  it('sets billing_cycle_anchor for annual checkout', () => {
    const params = buildWinemakerCheckoutSessionParams({
      organizationId: 'org-1',
      billingCycle: 'annual',
      siteBaseUrl: 'https://app.test',
      monthlyPriceId: 'price_monthly',
      annualPriceId: 'price_annual',
    })

    expect(params.line_items?.[0]).toEqual({ price: 'price_annual', quantity: 1 })
    expect(params.subscription_data?.billing_cycle_anchor).toBeTypeOf('number')
    expect(params.subscription_data?.proration_behavior).toBe('create_prorations')
    expect(params.metadata?.billing_cycle).toBe('annual')
  })

  it('omits anchor for monthly checkout', () => {
    const params = buildWinemakerCheckoutSessionParams({
      organizationId: 'org-1',
      billingCycle: 'monthly',
      siteBaseUrl: 'https://app.test',
      monthlyPriceId: 'price_monthly',
      annualPriceId: 'price_annual',
    })

    expect(params.line_items?.[0]).toEqual({ price: 'price_monthly', quantity: 1 })
    expect(params.subscription_data?.billing_cycle_anchor).toBeUndefined()
    expect(VENDIMIA_RENEWAL_ANCHOR.month).toBe(8)
  })
})
