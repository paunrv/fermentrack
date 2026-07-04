'use server'

import { getAuthUserId, createClient } from '@/lib/supabase/server'
import { fetchPlanBillingStatus, type PlanBillingStatus } from '@/lib/proof/plan-over-limit'

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
