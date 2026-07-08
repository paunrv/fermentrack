'use server'

import { getAuthUserId, createClient } from '@/lib/supabase/server'
import { createServiceSupabase } from '@/utils/supabase/service'
import { fetchPlanBillingStatus, type PlanBillingStatus } from '@/lib/proof/plan-over-limit'
import { stripeCheckoutReady, type BillingCycle } from '@/lib/stripe/server'

export type BillingCheckoutStatus = {
  ready: boolean
  devBypass: boolean
  devHint: string | null
}

export async function fetchPlanBillingStatusAction(
  organizationId: string
): Promise<PlanBillingStatus | null> {
  const userId = await getAuthUserId()
  if (!userId || !organizationId) return null

  const sb = await createClient()
  const { data: member, error } = await sb
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !member || member.role !== 'owner') return null

  return fetchPlanBillingStatus(sb, organizationId)
}

export async function fetchBillingCheckoutStatus(
  billingCycle: BillingCycle
): Promise<BillingCheckoutStatus> {
  const ready = stripeCheckoutReady(billingCycle)
  const devBypass = process.env.NODE_ENV === 'development' && !ready
  return {
    ready,
    devBypass,
    devHint: devBypass
      ? null
      : !ready && process.env.NODE_ENV === 'development'
        ? 'Añade STRIPE_SECRET_KEY y STRIPE_PRICE_WINEMAKER_PRO_* en apps/web/.env.local'
        : null,
  }
}

export async function activateProDevelopment(
  organizationId: string
): Promise<{ ok: true }> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('dev_only')
  }
  if (!organizationId) throw new Error('Organización no especificada')

  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const sb = await createClient()
  const { data: member, error: memberError } = await sb
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (memberError) throw new Error(memberError.message)
  if (!member || member.role !== 'owner') {
    throw new Error('Solo el owner puede activar Pro')
  }

  const service = createServiceSupabase()
  const { error } = await service
    .from('organizations')
    .update({
      plan: 'pro',
      plan_status: 'active',
    })
    .eq('id', organizationId)

  if (error) throw new Error(error.message)
  return { ok: true }
}
