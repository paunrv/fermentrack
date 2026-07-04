'use server'

import { getAuthUserId, createClient } from '@/lib/supabase/server'
import { PROOF_PROFILES_TABLE, type ExtraProfile } from '@/lib/supabase'
import { createServiceSupabase } from '@/utils/supabase/service'
import type { OrgMemberRole } from '@/lib/supabase/organization'
import {
  assertPlanLimit,
  checkLimit,
  fetchOrgPlanContext,
  planLimitErrorCode,
  PlanLimitError,
} from '@/lib/proof/plan-limits'
import {
  INVITE_PRO_REQUIRED_CODE,
  orgCanInviteTeamMembersFromLimits,
} from '@/lib/proof/plan-team-invites'

export type TeamMemberRow = {
  id: string
  userId: string
  fullName: string | null
  email: string | null
  orgRole: string
  status: string
  profileType: ExtraProfile | null
  createdAt: string
}

export type TeamAccess = {
  organizationId: string | null
  role: OrgMemberRole | null
  isOwner: boolean
  canManage: boolean
  canWrite: boolean
}

type ManageContext = {
  userId: string
  organizationId: string
  role: OrgMemberRole
}

async function requireManageContext(organizationId: string): Promise<ManageContext> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')
  if (!organizationId) throw new Error('Organización no especificada')

  const sb = await createClient()
  const { data, error } = await sb
    .from('organization_members')
    .select('role, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data || !['owner', 'admin'].includes(data.role)) {
    throw new Error('Solo owner o admin pueden gestionar el equipo')
  }

  return { userId, organizationId, role: data.role as OrgMemberRole }
}

async function requireMemberContext(organizationId: string): Promise<ManageContext> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')
  if (!organizationId) throw new Error('Organización no especificada')

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

  return { userId, organizationId, role: data.role as OrgMemberRole }
}

function inviteRedirectUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base}/auth/callback?next=${encodeURIComponent('/onboarding')}`
}

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const sb = createServiceSupabase()
  const normalized = email.trim().toLowerCase()
  let page = 1
  const perPage = 200

  while (page <= 5) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    const match = data.users.find(u => u.email?.toLowerCase() === normalized)
    if (match) return match.id
    if (data.users.length < perPage) break
    page += 1
  }

  return null
}

function mapTeamAccess(
  organizationId: string,
  role: OrgMemberRole | null
): TeamAccess {
  const isOwner = role === 'owner'
  const canManage = role === 'owner' || role === 'admin'
  const canWrite = canManage || role === 'member'
  return {
    organizationId: role ? organizationId : null,
    role,
    isOwner,
    canManage,
    canWrite,
  }
}

export async function fetchTeamAccess(organizationId: string): Promise<TeamAccess> {
  const userId = await getAuthUserId()
  if (!userId || !organizationId) {
    return {
      organizationId: null,
      role: null,
      isOwner: false,
      canManage: false,
      canWrite: false,
    }
  }

  const sb = await createClient()
  const { data, error } = await sb
    .from('organization_members')
    .select('role, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return mapTeamAccess(organizationId, (data?.role as OrgMemberRole) ?? null)
}

export async function fetchTeamMembers(organizationId: string): Promise<TeamMemberRow[]> {
  await requireMemberContext(organizationId)
  const sb = createServiceSupabase()

  const { data: members, error } = await sb
    .from('organization_members')
    .select('id, user_id, role, status, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  if (!members?.length) return []

  const userIds = members.map(m => m.user_id)
  const { data: profiles, error: profilesError } = await sb
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  if (profilesError) throw new Error(profilesError.message)

  const { data: proofProfiles, error: proofError } = await sb
    .from(PROOF_PROFILES_TABLE)
    .select('user_id, profile_type_v2')
    .in('user_id', userIds)
    .in('profile_type_v2', ['winemaker', 'bodega'])

  if (proofError) throw new Error(proofError.message)

  const profileById = new Map((profiles ?? []).map(p => [p.id, p.full_name]))
  const proofByUser = new Map(
    (proofProfiles ?? []).map(p => [p.user_id as string, p.profile_type_v2 as ExtraProfile])
  )

  const emailById = new Map<string, string | null>()
  for (const member of members) {
    const { data: authUser, error: authError } = await sb.auth.admin.getUserById(member.user_id)
    if (authError) throw new Error(authError.message)
    emailById.set(member.user_id, authUser.user.email ?? null)
  }

  return members.map(member => ({
    id: member.id,
    userId: member.user_id,
    fullName: profileById.get(member.user_id) ?? null,
    email: emailById.get(member.user_id) ?? null,
    orgRole: member.role,
    status: member.status,
    profileType: proofByUser.get(member.user_id) ?? null,
    createdAt: member.created_at,
  }))
}

export type TeamInviteStatus = {
  canInvite: boolean
  proRequired?: boolean
  limitReachedCode?: string
}

export async function fetchTeamInviteStatus(organizationId: string): Promise<TeamInviteStatus> {
  await requireManageContext(organizationId)
  const sb = createServiceSupabase()
  const ctx = await fetchOrgPlanContext(sb, organizationId)

  if (!orgCanInviteTeamMembersFromLimits(ctx.limits)) {
    return { canInvite: false, proRequired: true }
  }

  const result = await checkLimit(sb, organizationId, 'usuarios')
  if (!result.ok) {
    return { canInvite: false, limitReachedCode: planLimitErrorCode(result.resource) }
  }
  return { canInvite: true }
}

export async function inviteTeamMember(input: {
  organizationId: string
  email: string
  name: string
  orgRole: Exclude<OrgMemberRole, 'owner'>
}): Promise<{ ok: true }> {
  const { userId: ownerId, organizationId } = await requireManageContext(input.organizationId)

  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const orgRole = input.orgRole

  if (!email || !email.includes('@')) throw new Error('Escribe un email válido')
  if (!name) throw new Error('Escribe el nombre de la persona')

  const sb = createServiceSupabase()

  const planCtx = await fetchOrgPlanContext(sb, organizationId)
  if (!orgCanInviteTeamMembersFromLimits(planCtx.limits)) {
    throw new Error(INVITE_PRO_REQUIRED_CODE)
  }

  let invitedUserId: string | null = null

  const { data: inviteData, error: inviteError } = await sb.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
    redirectTo: inviteRedirectUrl(),
  })

  if (inviteError) {
    const alreadyExists =
      inviteError.message.toLowerCase().includes('already') ||
      inviteError.message.toLowerCase().includes('registered')
    if (!alreadyExists) throw new Error(inviteError.message)
    invitedUserId = await resolveUserIdByEmail(email)
    if (!invitedUserId) throw new Error('No se pudo encontrar el usuario con ese email')
  } else {
    invitedUserId = inviteData.user.id
  }

  await sb.from('profiles').update({ full_name: name }).eq('id', invitedUserId)

  const { data: existingMember, error: existingError } = await sb
    .from('organization_members')
    .select('id, status, role')
    .eq('organization_id', organizationId)
    .eq('user_id', invitedUserId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  const needsNewSeat =
    !existingMember ||
    existingMember.status === 'suspended'

  if (needsNewSeat) {
    try {
      await assertPlanLimit(sb, organizationId, 'usuarios')
    } catch (err) {
      if (err instanceof PlanLimitError) throw new Error(err.code)
      throw err
    }
  }

  if (existingMember) {
    if (existingMember.role === 'owner') {
      throw new Error('Este usuario ya es owner de la organización')
    }
    const { error: updateError } = await sb
      .from('organization_members')
      .update({
        status: 'invited',
        invited_by: ownerId,
        role: orgRole,
      })
      .eq('id', existingMember.id)

    if (updateError) throw new Error(updateError.message)
  } else {
    const { error: insertError } = await sb.from('organization_members').insert({
      organization_id: organizationId,
      user_id: invitedUserId,
      role: orgRole,
      status: 'invited',
      invited_by: ownerId,
    })

    if (insertError) throw new Error(insertError.message)
  }

  return { ok: true }
}
