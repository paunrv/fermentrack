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
import {
  generateTeamAccessCode,
  hashTeamAccessCode,
  isValidAccessCodeFormat,
  type TeamPlatformProfile,
} from '@/lib/proof/team-access-code'
import { errorMessageFromUnknown } from '@/lib/errors/unknown'
import { buildAuthCallbackUrl } from '@/lib/auth/auth-callback'

export type TeamMemberRow = {
  id: string
  userId: string
  fullName: string | null
  email: string | null
  orgRole: string
  status: string
  profileType: ExtraProfile | null
  platformProfile: TeamPlatformProfile | null
  accessCode: string | null
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

function inviteRedirectUrl(siteOrigin?: string): string {
  return buildAuthCallbackUrl({ flow: 'team', origin: siteOrigin })
}

type InviteAuthResult = {
  userId: string
  emailSent: boolean
  inviteLink: string | null
}

async function resolveInviteAuthUser(
  sb: ReturnType<typeof createServiceSupabase>,
  email: string,
  name: string,
  platformProfile: TeamPlatformProfile,
  siteOrigin?: string
): Promise<InviteAuthResult> {
  const redirectTo = inviteRedirectUrl(siteOrigin)
  const metadata = { full_name: name, platform_profile: platformProfile }

  const { data: inviteData, error: inviteError } = await sb.auth.admin.inviteUserByEmail(email, {
    data: metadata,
    redirectTo,
  })

  if (!inviteError && inviteData.user?.id) {
    return { userId: inviteData.user.id, emailSent: true, inviteLink: null }
  }

  let userId = await resolveUserIdByEmail(email)

  if (!userId) {
    const { data: created, error: createError } = await sb.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: metadata,
    })

    if (createError) {
      userId = await resolveUserIdByEmail(email)
      if (!userId) {
        const msg = inviteError?.message ?? createError.message
        throw new Error(msg)
      }
    } else {
      userId = created.user?.id ?? null
      if (!userId) throw new Error('No se pudo crear el usuario invitado')
    }
  }

  const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo, data: metadata },
  })

  if (linkError) {
    console.warn('[inviteTeamMember] generateLink failed:', linkError.message)
    return { userId, emailSent: false, inviteLink: null }
  }

  const props = linkData?.properties as { action_link?: string } | undefined
  return {
    userId,
    emailSent: false,
    inviteLink: props?.action_link ?? null,
  }
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
    .select('id, user_id, role, status, platform_profile, access_code_plain, created_at')
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
    if (authError) {
      console.warn('[fetchTeamMembers] getUserById failed', member.user_id, authError.message)
      emailById.set(member.user_id, null)
      continue
    }
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
    platformProfile: (member.platform_profile as TeamPlatformProfile | null) ?? null,
    accessCode:
      member.status === 'invited' && member.access_code_plain
        ? String(member.access_code_plain)
        : null,
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
  let ctx
  try {
    ctx = await fetchOrgPlanContext(sb, organizationId)
  } catch (err) {
    throw new Error(errorMessageFromUnknown(err))
  }

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
  platformProfile: TeamPlatformProfile
  siteOrigin?: string
}): Promise<{
  ok: true
  accessCode: string
  wineryName: string
  emailSent: boolean
  inviteLink: string | null
}> {
  const { userId: ownerId, organizationId } = await requireManageContext(input.organizationId)

  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const platformProfile = input.platformProfile

  if (!email || !email.includes('@')) throw new Error('Escribe un email válido')
  if (!name) throw new Error('Escribe el nombre de la persona')
  if (platformProfile !== 'winemaker' && platformProfile !== 'bodega') {
    throw new Error('Perfil inválido')
  }

  const sb = createServiceSupabase()

  const { data: orgRow, error: orgError } = await sb
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .maybeSingle()
  if (orgError) throw new Error(orgError.message)
  if (!orgRow?.name) throw new Error('Organización no encontrada')

  const planCtx = await fetchOrgPlanContext(sb, organizationId).catch(err => {
    throw new Error(errorMessageFromUnknown(err))
  })
  if (!orgCanInviteTeamMembersFromLimits(planCtx.limits)) {
    throw new Error(INVITE_PRO_REQUIRED_CODE)
  }

  const accessCode = generateTeamAccessCode()
  const accessCodeHash = hashTeamAccessCode(organizationId, accessCode)

  const { userId: invitedUserId, emailSent, inviteLink } = await resolveInviteAuthUser(
    sb,
    email,
    name,
    platformProfile,
    input.siteOrigin
  )

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
      throw new Error(errorMessageFromUnknown(err))
    }
  }

  const memberPayload = {
    status: 'invited' as const,
    invited_by: ownerId,
    role: 'member' as const,
    platform_profile: platformProfile,
    access_code_hash: accessCodeHash,
    access_code_plain: accessCode,
  }

  if (existingMember) {
    if (existingMember.role === 'owner') {
      throw new Error('Este usuario ya es owner de la organización')
    }
    const { error: updateError } = await sb
      .from('organization_members')
      .update(memberPayload)
      .eq('id', existingMember.id)

    if (updateError) throw new Error(updateError.message)
  } else {
    const { error: insertError } = await sb.from('organization_members').insert({
      organization_id: organizationId,
      user_id: invitedUserId,
      ...memberPayload,
    })

    if (insertError) throw new Error(insertError.message)
  }

  return { ok: true, accessCode, wineryName: orgRow.name, emailSent, inviteLink }
}

export async function removeTeamMember(input: {
  organizationId: string
  memberId: string
}): Promise<{ ok: true }> {
  const { userId: actorId, organizationId } = await requireManageContext(input.organizationId)

  const sb = createServiceSupabase()
  const { data: member, error } = await sb
    .from('organization_members')
    .select('id, user_id, role')
    .eq('id', input.memberId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!member) throw new Error('Miembro no encontrado')
  if (member.role === 'owner') throw new Error('No puedes quitar al owner')
  if (member.user_id === actorId) throw new Error('No puedes quitarte a ti mismo')

  const { error: deleteError } = await sb.from('organization_members').delete().eq('id', member.id)
  if (deleteError) throw new Error(deleteError.message)

  return { ok: true }
}

async function applyTeamAccessCode(
  sb: ReturnType<typeof createServiceSupabase>,
  memberId: string,
  organizationId: string,
  code: string
): Promise<void> {
  if (!isValidAccessCodeFormat(code)) throw new Error('ACCESS_CODE_INVALID')

  const { error } = await sb
    .from('organization_members')
    .update({
      access_code_hash: hashTeamAccessCode(organizationId, code),
      access_code_plain: code.trim(),
    })
    .eq('id', memberId)
    .eq('organization_id', organizationId)
    .eq('status', 'invited')

  if (error) throw new Error(error.message)
}

export async function updateTeamAccessCode(input: {
  organizationId: string
  memberId: string
  code?: string
}): Promise<{ ok: true; accessCode: string }> {
  await requireManageContext(input.organizationId)

  const sb = createServiceSupabase()
  const { data: member, error } = await sb
    .from('organization_members')
    .select('id, status, role')
    .eq('id', input.memberId)
    .eq('organization_id', input.organizationId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!member) throw new Error('Miembro no encontrado')
  if (member.status !== 'invited') throw new Error('Solo puedes editar el código de invitados pendientes')
  if (member.role === 'owner') throw new Error('No puedes cambiar el código del owner')

  const code =
    input.code?.trim() && isValidAccessCodeFormat(input.code.trim())
      ? input.code.trim()
      : generateTeamAccessCode()

  await applyTeamAccessCode(sb, member.id, input.organizationId, code)
  return { ok: true, accessCode: code }
}
