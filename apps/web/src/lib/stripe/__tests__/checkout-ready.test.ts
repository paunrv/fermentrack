import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { stripeCheckoutReady, stripeSecretConfigured } from '@/lib/stripe/server'

describe('stripeCheckoutReady', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_PRICE_WINEMAKER_PRO_MONTHLY
    delete process.env.STRIPE_PRICE_WINEMAKER_PRO
    delete process.env.STRIPE_PRICE_WINEMAKER_PRO_ANNUAL
    delete process.env.STRIPE_PRICE_WINEMAKER_PRO_YEARLY
  })

  afterEach(() => {
    process.env = env
  })

  it('is false without secret key', () => {
    process.env.STRIPE_PRICE_WINEMAKER_PRO_MONTHLY = 'price_monthly'
    expect(stripeSecretConfigured()).toBe(false)
    expect(stripeCheckoutReady('monthly')).toBe(false)
  })

  it('is false without monthly price id', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    expect(stripeCheckoutReady('monthly')).toBe(false)
  })

  it('is true with secret and monthly price', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    process.env.STRIPE_PRICE_WINEMAKER_PRO_MONTHLY = 'price_monthly'
    expect(stripeCheckoutReady('monthly')).toBe(true)
  })

  it('accepts legacy monthly alias', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    process.env.STRIPE_PRICE_WINEMAKER_PRO = 'price_legacy'
    expect(stripeCheckoutReady('monthly')).toBe(true)
  })

  it('requires annual price for annual cycle', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    process.env.STRIPE_PRICE_WINEMAKER_PRO_MONTHLY = 'price_monthly'
    expect(stripeCheckoutReady('annual')).toBe(false)
    process.env.STRIPE_PRICE_WINEMAKER_PRO_ANNUAL = 'price_annual'
    expect(stripeCheckoutReady('annual')).toBe(true)
  })
})
