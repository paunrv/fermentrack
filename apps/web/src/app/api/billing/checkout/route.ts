import { NextRequest, NextResponse } from 'next/server'
import { requireBillingAccess } from '@/lib/billing/auth'
import { buildWinemakerCheckoutSessionParams } from '@/lib/billing/billing-checkout'
import { resolveFoundingCheckoutCoupon } from '@/lib/billing/founding-cohort'
import type { BillingCycle } from '@/lib/stripe/server'
import { billingSiteUrl, getStripe, getWinemakerProPriceIds } from '@/lib/stripe/server'
import { createClient, getAuthUserId } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseBillingCycle(value: unknown): BillingCycle {
  return value === 'annual' ? 'annual' : 'monthly'
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { organizationId?: string; billingCycle?: string }
    const organizationId = body.organizationId?.trim()
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId requerido' }, { status: 400 })
    }

    const billingCycle = parseBillingCycle(body.billingCycle)

    await requireBillingAccess(organizationId, { ownerOnly: true })

    const sb = await createClient()
    const { data: org, error: orgError } = await sb
      .from('organizations')
      .select('id, name, stripe_customer_id, founding_member_at')
      .eq('id', organizationId)
      .maybeSingle()

    if (orgError) throw orgError
    if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })

    const userId = await getAuthUserId()
    const { data: authUser } = userId
      ? await sb.auth.getUser()
      : { data: { user: null } }
    const email = authUser.user?.email ?? undefined

    const stripe = getStripe()
    const prices = getWinemakerProPriceIds()

    const foundingCouponId = resolveFoundingCheckoutCoupon(
      org.founding_member_at as string | null,
      billingCycle
    )

    const session = await stripe.checkout.sessions.create(
      buildWinemakerCheckoutSessionParams({
        organizationId,
        billingCycle,
        customerId: org.stripe_customer_id,
        email,
        siteBaseUrl: billingSiteUrl(),
        monthlyPriceId: prices.monthly,
        annualPriceId: prices.annual,
        foundingCouponId,
      })
    )

    if (!session.url) {
      return NextResponse.json({ error: 'No se pudo crear la sesión de checkout' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al iniciar checkout'
    console.error('[billing/checkout]', msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
