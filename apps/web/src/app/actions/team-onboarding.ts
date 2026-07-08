'use server'

import { getAuthUserId, createClient } from '@/lib/supabase/server'
import { PROOF_PROFILES_TABLE } from '@/lib/supabase'
import { createServiceSupabase } from '@/utils/supabase/service'
import {
  accessCodesMatch,
  isValidAccessCodeFormat,
  normalizeWineryNameForMatch,
  type TeamPlatformProfile,
} from '@/lib/proof/team-access-code'

export type PendingTeamInvite = {
  organizationId: string
  organizationName: string
  platformProfile: TeamPlatformProfile
}

export async function fetchPendingTeamInvite(): Promise<PendingTeamInvite | null> {
  const userId = await getAuthUserId()
  if (!userId) return null

  const sb = await createClient()
  const { data, error } = await sb
    .from('organization_members')
    .select(
      'organization_id, platform_profile, organizations(id, name, org_type)'
    )
    .eq('user_id', userId)
    .eq('status', 'invited')
    .not('platform_profile', 'is', null)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.platform_profile) return null

  const orgRaw = data.organizations
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!org || typeof org !== 'object') return null

  const orgType = 'org_type' in org ? String(org.org_type) : 'winemaker'
  if (orgType !== 'winemaker') return null

  return {
    organizationId: String(data.organization_id),
    organizationName: String(org.name),
    platformProfile: data.platform_profile as TeamPlatformProfile,
  }
}

export async function completeTeamOnboarding(input: {
  wineryName: string
  accessCode: string
  userName: string
}): Promise<{ ok: true }> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const wineryName = input.wineryName.trim()
  const userName = input.userName.trim()
  const accessCode = input.accessCode.trim()

  if (!wineryName) throw new Error('WINERY_NAME_REQUIRED')
  if (!userName) throw new Error('USER_NAME_REQUIRED')
  if (!isValidAccessCodeFormat(accessCode)) throw new Error('ACCESS_CODE_INVALID')

  const sbUser = await createClient()
  const { data: member, error: memberError } = await sbUser
    .from('organization_members')
    .select('id, organization_id, platform_profile, access_code_hash, organizations(name)')
    .eq('user_id', userId)
    .eq('status', 'invited')
    .not('platform_profile', 'is', null)
    .limit(1)
    .maybeSingle()

  if (memberError) throw new Error(memberError.message)
  if (!member?.platform_profile) throw new Error('NO_PENDING_INVITE')

  const orgRaw = member.organizations
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  const orgName = org && typeof org === 'object' && 'name' in org ? String(org.name) : ''

  if (normalizeWineryNameForMatch(wineryName) !== normalizeWineryNameForMatch(orgName)) {
    throw new Error('WINERY_NAME_MISMATCH')
  }

  const organizationId = String(member.organization_id)
  if (!accessCodesMatch(organizationId, accessCode, member.access_code_hash)) {
    throw new Error('ACCESS_CODE_INVALID')
  }

  const platformProfile = member.platform_profile as TeamPlatformProfile
  const sb = createServiceSupabase()

  const { data: authUser, error: authError } = await sb.auth.admin.getUserById(userId)
  if (authError) throw new Error(authError.message)

  const { error: profileError } = await sb.from(PROOF_PROFILES_TABLE).upsert(
    {
      user_id: userId,
      clerk_id: userId,
      profile_type_v2: platformProfile,
      profile_type: platformProfile,
      username: userName,
      onboarding_complete: true,
      email: authUser.user.email ?? null,
      extra_profiles: [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,profile_type_v2' }
  )
  if (profileError) throw new Error(profileError.message)

  await sb.from('profiles').update({ full_name: userName }).eq('id', userId)

  const { error: activateError } = await sb
    .from('organization_members')
    .update({
      status: 'active',
      access_code_hash: null,
      access_code_plain: null,
      role: 'member',
    })
    .eq('id', member.id)

  if (activateError) throw new Error(activateError.message)

  return { ok: true }
}

export async function fetchActiveTeamMembership(): Promise<{
  organizationId: string
  organizationName: string
  platformProfile: TeamPlatformProfile
} | null> {
  const userId = await getAuthUserId()
  if (!userId) return null

  const sb = await createClient()
  const { data, error } = await sb
    .from('organization_members')
    .select('organization_id, platform_profile, organizations(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .not('platform_profile', 'is', null)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.platform_profile) return null

  const orgRaw = data.organizations
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  const orgName = org && typeof org === 'object' && 'name' in org ? String(org.name) : ''

  return {
    organizationId: String(data.organization_id),
    organizationName: orgName,
    platformProfile: data.platform_profile as TeamPlatformProfile,
  }
}
