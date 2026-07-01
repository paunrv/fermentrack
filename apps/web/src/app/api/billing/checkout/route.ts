import { NextRequest, NextResponse } from 'next/server'
import { requireBillingAccess } from '@/lib/billing/auth'
import { billingSiteUrl, getStripe, getWinemakerProPriceId } from '@/lib/stripe/server'
import { createClient, getAuthUserId } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { organizationId?: string }
    const organizationId = body.organizationId?.trim()
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId requerido' }, { status: 400 })
    }

    await requireBillingAccess(organizationId, { ownerOnly: true })

    const sb = await createClient()
    const { data: org, error: orgError } = await sb
      .from('organizations')
      .select('id, name, stripe_customer_id')
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
    const base = billingSiteUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(org.stripe_customer_id
        ? { customer: org.stripe_customer_id }
        : email
          ? { customer_email: email }
          : {}),
      line_items: [{ price: getWinemakerProPriceId(), quantity: 1 }],
      metadata: { organization_id: organizationId },
      subscription_data: {
        metadata: { organization_id: organizationId },
      },
      success_url: `${base}/dashboard/settings?billing=success`,
      cancel_url: `${base}/dashboard/settings?billing=canceled`,
      allow_promotion_codes: true,
    })

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
