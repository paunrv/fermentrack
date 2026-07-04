import Stripe from 'stripe'

export type BillingCycle = 'monthly' | 'annual'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
    stripeClient = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return stripeClient
}

export function getWinemakerProPriceId(cycle: BillingCycle = 'monthly'): string {
  if (cycle === 'annual') {
    const annual =
      process.env.STRIPE_PRICE_WINEMAKER_PRO_ANNUAL ?? process.env.STRIPE_PRICE_WINEMAKER_PRO_YEARLY
    if (annual) return annual
  }

  const monthly =
    process.env.STRIPE_PRICE_WINEMAKER_PRO_MONTHLY ?? process.env.STRIPE_PRICE_WINEMAKER_PRO
  if (!monthly) {
    throw new Error(
      cycle === 'annual'
        ? 'Missing STRIPE_PRICE_WINEMAKER_PRO_ANNUAL'
        : 'Missing STRIPE_PRICE_WINEMAKER_PRO_MONTHLY or STRIPE_PRICE_WINEMAKER_PRO'
    )
  }
  return monthly
}

export function getWinemakerProPriceIds(): { monthly: string; annual: string } {
  return {
    monthly: getWinemakerProPriceId('monthly'),
    annual: getWinemakerProPriceId('annual'),
  }
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET')
  return secret
}

export function billingSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}
