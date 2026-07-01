import { NextRequest, NextResponse } from 'next/server'
import { requireBillingAccess } from '@/lib/billing/auth'
import { billingSiteUrl, getStripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { organizationId?: string }
    const organizationId = body.organizationId?.trim()
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId requerido' }, { status: 400 })
    }

    await requireBillingAccess(organizationId)

    const sb = await createClient()
    const { data: org, error: orgError } = await sb
      .from('organizations')
      .select('id, stripe_customer_id')
      .eq('id', organizationId)
      .maybeSingle()

    if (orgError) throw orgError
    if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    if (!org.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Aún no hay cliente Stripe para esta bodega' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const portal = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${billingSiteUrl()}/dashboard/settings`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al abrir el portal'
    console.error('[billing/portal]', msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
