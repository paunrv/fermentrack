import { NextRequest, NextResponse } from 'next/server'
import {
  processStripeWebhookEvent,
  recordWebhookEventIfNew,
} from '@/lib/billing/webhook-handlers'
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe/server'
import { createServiceSupabase } from '@/utils/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret())
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid signature'
    console.error('[billing/webhook] signature', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const sb = createServiceSupabase()

  try {
    const isNew = await recordWebhookEventIfNew(sb, event)
    if (!isNew) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    await processStripeWebhookEvent(sb, event)
    return NextResponse.json({ received: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Webhook handler failed'
    console.error('[billing/webhook]', event.type, msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
