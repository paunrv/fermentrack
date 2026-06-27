'use server'

import { getAuthUserId, createClient } from '@/lib/supabase/server'
import { PROOF_PROFILES_TABLE, upsertProfile, type ExtraProfile } from '@/lib/supabase'
import { createServiceSupabase } from '@/utils/supabase/service'

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
  isOwner: boolean
  organizationId: string | null
}

type OwnerContext = {
  userId: string
  organizationId: string
}

async function requireOwnerContext(): Promise<OwnerContext> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const sb = createServiceSupabase()
  const { data, error } = await sb
    .from('organization_members')
    .select('organization_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.organization_id) throw new Error('Solo el owner puede gestionar el equipo')

  return { userId, organizationId: data.organization_id }
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

export async function fetchTeamAccess(): Promise<TeamAccess> {
  const userId = await getAuthUserId()
  if (!userId) return { isOwner: false, organizationId: null }

  const sb = await createClient()
  const { data, error } = await sb
    .from('organization_members')
    .select('organization_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return {
    isOwner: Boolean(data?.organization_id),
    organizationId: data?.organization_id ?? null,
  }
}

export async function fetchTeamMembers(): Promise<TeamMemberRow[]> {
  const { organizationId } = await requireOwnerContext()
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

export async function inviteTeamMember(input: {
  email: string
  name: string
  profileType: 'winemaker' | 'bodega'
}): Promise<{ ok: true }> {
  const { userId: ownerId, organizationId } = await requireOwnerContext()

  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const profileType = input.profileType

  if (!email || !email.includes('@')) throw new Error('Escribe un email válido')
  if (!name) throw new Error('Escribe el nombre de la persona')

  const sb = createServiceSupabase()

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

  await upsertProfile(sb, {
    user_id: invitedUserId,
    profile_type_v2: profileType,
    username: name,
    onboarding_complete: false,
    is_super_user: false,
    extra_profiles: [],
    email,
  })

  const { data: existingMember, error: existingError } = await sb
    .from('organization_members')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('user_id', invitedUserId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  if (existingMember) {
    const { error: updateError } = await sb
      .from('organization_members')
      .update({
        status: 'invited',
        invited_by: ownerId,
        role: 'member',
      })
      .eq('id', existingMember.id)

    if (updateError) throw new Error(updateError.message)
  } else {
    const { error: insertError } = await sb.from('organization_members').insert({
      organization_id: organizationId,
      user_id: invitedUserId,
      role: 'member',
      status: 'invited',
      invited_by: ownerId,
    })

    if (insertError) throw new Error(insertError.message)
  }

  return { ok: true }
}
