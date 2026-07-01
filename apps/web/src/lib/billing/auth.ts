import { getAuthUserId, createClient } from '@/lib/supabase/server'
import type { OrgMemberRole } from '@/lib/supabase/organization'

export type BillingAccess = {
  userId: string
  organizationId: string
  role: OrgMemberRole
  isOwner: boolean
  canManageBilling: boolean
}

export async function requireBillingAccess(
  organizationId: string,
  opts?: { ownerOnly?: boolean }
): Promise<BillingAccess> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')
  if (!organizationId) throw new Error('Organización no especificada')

  const sb = await createClient()
  const { data: member, error: memberError } = await sb
    .from('organization_members')
    .select('role, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (memberError) throw new Error(memberError.message)
  if (!member) throw new Error('No tienes acceso a esta organización')

  const role = member.role as OrgMemberRole
  const isOwner = role === 'owner'
  const canManageBilling = isOwner || role === 'admin'

  if (opts?.ownerOnly && !isOwner) {
    throw new Error('Solo el owner puede gestionar la facturación')
  }
  if (!canManageBilling) {
    throw new Error('Solo owner o admin pueden gestionar la facturación')
  }

  return {
    userId,
    organizationId,
    role,
    isOwner,
    canManageBilling,
  }
}
