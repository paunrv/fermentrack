import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchOrgPlanContext } from '@/lib/proof/plan-limits'
import type { PlanLimitsRow } from '@/lib/proof/plan-limits-types'

/** Pro+ — `max_usuarios` null in plan_limites (regular/trial = 1 seat). */
export function orgCanInviteTeamMembersFromLimits(
  limits: Pick<PlanLimitsRow, 'max_usuarios'>
): boolean {
  return limits.max_usuarios == null
}

export async function orgCanInviteTeamMembers(
  sb: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  const ctx = await fetchOrgPlanContext(sb, organizationId)
  return orgCanInviteTeamMembersFromLimits(ctx.limits)
}

export const INVITE_PRO_REQUIRED_CODE = 'invite_pro_required'
