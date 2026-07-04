'use server'

import { getAuthUserId, createClient } from '@/lib/supabase/server'
import {
  fetchWinemakerOrganizationIdForUser,
  type OrgMemberRole,
  type OrgPlan,
  type OrgPlanStatus,
} from '@/lib/supabase/organization'

export type OrganizationSettings = {
  id: string
  name: string
  slug: string
  plan: OrgPlan
  plan_status: OrgPlanStatus
  role: OrgMemberRole | null
  canManage: boolean
  isOwner: boolean
  hasStripeCustomer: boolean
  billing_cycle: 'monthly' | 'annual' | null
  trial_ends_at: string | null
  renewal_anchor: string | null
}

async function requireOrgMember(organizationId: string) {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const sb = await createClient()
  const { data, error } = await sb
    .from('organization_members')
    .select('role, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('No tienes acceso a esta organización')

  return {
    userId,
    role: data.role as OrgMemberRole,
    canManage: ['owner', 'admin'].includes(data.role),
    isOwner: data.role === 'owner',
  }
}

export async function fetchOrganizationSettings(
  organizationId: string
): Promise<OrganizationSettings | null> {
  if (!organizationId) return null

  const userId = await getAuthUserId()
  if (!userId) return null

  const sb = await createClient()
  const { data: member, error: memberError } = await sb
    .from('organization_members')
    .select('role, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (memberError) throw new Error(memberError.message)
  if (!member) return null

  const { data: org, error: orgError } = await sb
    .from('organizations')
    .select(
      'id, name, slug, plan, plan_status, stripe_customer_id, billing_cycle, trial_ends_at, renewal_anchor'
    )
    .eq('id', organizationId)
    .maybeSingle()

  if (orgError) throw new Error(orgError.message)
  if (!org) return null

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan as OrgPlan,
    plan_status: org.plan_status as OrgPlanStatus,
    role: member.role as OrgMemberRole,
    canManage: ['owner', 'admin'].includes(member.role),
    isOwner: member.role === 'owner',
    hasStripeCustomer: Boolean(org.stripe_customer_id),
    billing_cycle: (org.billing_cycle as OrganizationSettings['billing_cycle']) ?? null,
    trial_ends_at: (org.trial_ends_at as string | null) ?? null,
    renewal_anchor: (org.renewal_anchor as string | null) ?? null,
  }
}

export async function updateOrganizationName(input: {
  organizationId: string
  name: string
}): Promise<{ ok: true }> {
  const { organizationId } = input
  const name = input.name.trim()
  if (!name) throw new Error('El nombre de la bodega es obligatorio')

  const { canManage } = await requireOrgMember(organizationId)
  if (!canManage) throw new Error('Solo owner o admin pueden editar la bodega')

  const sb = await createClient()
  const { error } = await sb
    .from('organizations')
    .update({ name })
    .eq('id', organizationId)

  if (error) throw new Error(error.message)
  return { ok: true }
}

/** Resuelve org winemaker activa del usuario autenticado. */
export async function resolveWinemakerOrgForUser(
  organizationId?: string | null
): Promise<string | null> {
  const userId = await getAuthUserId()
  if (!userId) return null

  const sb = await createClient()
  return fetchWinemakerOrganizationIdForUser(sb, userId, organizationId)
}
