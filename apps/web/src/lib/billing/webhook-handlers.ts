import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { billingCycleFromStripeInterval } from '@/lib/billing/billing-checkout'
import {
  formatRenewalAnchorDate,
  nextRenewalAnchorDate,
} from '@/lib/billing/billing-renewal-anchor'
import { planFromStripeSubscriptionStatus } from '@/lib/billing/winemaker-plans'

type OrgBillingRow = {
  id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

async function findOrgByStripeIds(
  sb: SupabaseClient,
  ids: { customerId?: string | null; subscriptionId?: string | null }
): Promise<OrgBillingRow | null> {
  if (ids.subscriptionId) {
    const { data } = await sb
      .from('organizations')
      .select('id, stripe_customer_id, stripe_subscription_id')
      .eq('stripe_subscription_id', ids.subscriptionId)
      .maybeSingle()
    if (data) return data
  }
  if (ids.customerId) {
    const { data } = await sb
      .from('organizations')
      .select('id, stripe_customer_id, stripe_subscription_id')
      .eq('stripe_customer_id', ids.customerId)
      .maybeSingle()
    if (data) return data
  }
  return null
}

async function updateOrgBilling(
  sb: SupabaseClient,
  organizationId: string,
  patch: Record<string, unknown>
) {
  const { error } = await sb.from('organizations').update(patch).eq('id', organizationId)
  if (error) throw error
}

function stripeId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: string }).id)
  }
  return null
}

function billingCycleFromSession(session: Stripe.Checkout.Session): 'monthly' | 'annual' | null {
  const raw = session.metadata?.billing_cycle
  if (raw === 'monthly' || raw === 'annual') return raw
  return null
}

function billingCycleFromSubscription(subscription: Stripe.Subscription): 'monthly' | 'annual' | null {
  const fromMeta = subscription.metadata?.billing_cycle
  if (fromMeta === 'monthly' || fromMeta === 'annual') return fromMeta
  const item = subscription.items.data[0]
  return billingCycleFromStripeInterval(item?.price.recurring?.interval)
}

export async function handleCheckoutSessionCompleted(
  sb: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const organizationId = session.metadata?.organization_id
  if (!organizationId) return

  const customerId = stripeId(session.customer)
  const subscriptionId = stripeId(session.subscription)
  const billingCycle = billingCycleFromSession(session)

  await updateOrgBilling(sb, organizationId, {
    ...(customerId ? { stripe_customer_id: customerId } : {}),
    ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
    plan: 'pro',
    plan_status: 'active',
    ...(billingCycle ? { billing_cycle: billingCycle } : {}),
    ...(billingCycle === 'annual'
      ? { renewal_anchor: formatRenewalAnchorDate(nextRenewalAnchorDate(new Date())) }
      : {}),
  })
}

export async function handleSubscriptionUpdated(
  sb: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const organizationId = subscription.metadata?.organization_id
  const customerId = stripeId(subscription.customer)
  const snapshot = planFromStripeSubscriptionStatus(subscription.status)
  const billingCycle = billingCycleFromSubscription(subscription)

  const patch = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan: snapshot.plan,
    plan_status: snapshot.plan_status,
    ...(billingCycle ? { billing_cycle: billingCycle } : {}),
    ...(billingCycle === 'annual'
      ? { renewal_anchor: formatRenewalAnchorDate(nextRenewalAnchorDate(new Date())) }
      : {}),
  }

  if (organizationId) {
    await updateOrgBilling(sb, organizationId, patch)
    return
  }

  const org = await findOrgByStripeIds(sb, {
    customerId,
    subscriptionId: subscription.id,
  })
  if (!org) return

  await updateOrgBilling(sb, org.id, {
    ...patch,
    stripe_customer_id: customerId ?? org.stripe_customer_id,
  })
}

export async function handleSubscriptionDeleted(
  sb: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const organizationId = subscription.metadata?.organization_id
  const customerId = stripeId(subscription.customer)

  const patch = {
    plan: 'regular' as const,
    plan_status: 'canceled' as const,
    stripe_subscription_id: null,
    billing_cycle: null,
  }

  if (organizationId) {
    await updateOrgBilling(sb, organizationId, patch)
    return
  }

  const org = await findOrgByStripeIds(sb, {
    customerId,
    subscriptionId: subscription.id,
  })
  if (!org) return

  await updateOrgBilling(sb, org.id, patch)
}

export async function handleInvoicePaymentFailed(
  sb: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = stripeId(invoice.customer)
  const subscriptionId = stripeId(invoice.subscription)
  if (!customerId && !subscriptionId) return

  const org = await findOrgByStripeIds(sb, { customerId, subscriptionId })
  if (!org) return

  await updateOrgBilling(sb, org.id, {
    plan_status: 'past_due',
  })
}

export async function processStripeWebhookEvent(
  sb: SupabaseClient,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(sb, event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(sb, event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(sb, event.data.object as Stripe.Subscription)
      break
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(sb, event.data.object as Stripe.Invoice)
      break
    default:
      break
  }
}

export async function recordWebhookEventIfNew(
  sb: SupabaseClient,
  event: Stripe.Event
): Promise<boolean> {
  const { error } = await sb.from('billing_webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
  })

  if (!error) return true
  if (error.code === '23505') return false
  throw error
}
