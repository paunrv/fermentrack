import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentProfileType } from '@/lib/proof/agent-context-types'
import { PROOF_PROFILES_TABLE, type ExtraProfile, type ProfileScope } from '@/lib/supabase'
import {
  fetchWinemakerOrganizationIdForUser,
  fetchWinemakerOrganizations,
  type OrganizationMembership,
} from '@/lib/supabase/organization'
import { resolveDistribuidorScope } from '@/lib/supabase/distribuidor'

export type McpScopeInput = {
  profile_type?: AgentProfileType
  organization_id?: string
}

export type ResolvedMcpScope = {
  profileType: AgentProfileType
  organizationId: string | null
  distributorScope: ProfileScope | null
  availableProfiles: ExtraProfile[]
  winemakerOrganizations: { id: string; name: string; role: string }[]
}

function isAgentProfile(value: string | null | undefined): value is AgentProfileType {
  return value === 'distributor' || value === 'winemaker' || value === 'distiller'
}

function inferDefaultProfile(
  profiles: ExtraProfile[],
  winemakerMemberships: OrganizationMembership[]
): AgentProfileType | null {
  if (profiles.includes('distributor')) return 'distributor'
  if (winemakerMemberships.length > 0) return 'winemaker'
  if (profiles.includes('distiller')) return 'distiller'
  if (profiles.includes('winemaker')) return 'winemaker'
  const first = profiles.find(isAgentProfile)
  return first ?? null
}

function assertProfileAccess(
  profiles: ExtraProfile[],
  winemakerMemberships: OrganizationMembership[],
  profileType: AgentProfileType,
  organizationId?: string
): void {
  if (profileType === 'winemaker') {
    const hasProfile = profiles.includes('winemaker')
    const hasOrg = winemakerMemberships.length > 0
    if (!hasProfile && !hasOrg) {
      throw new Error('Winemaker profile not available for this user.')
    }
    if (organizationId) {
      const member = winemakerMemberships.find(m => m.organizationId === organizationId)
      if (!member) {
        throw new Error('You are not a member of the requested winemaker organization.')
      }
    }
    return
  }

  if (!profiles.includes(profileType)) {
    throw new Error(`Profile "${profileType}" is not available for this user.`)
  }
}

export async function resolveMcpScope(
  sb: SupabaseClient,
  userId: string,
  input?: McpScopeInput
): Promise<ResolvedMcpScope> {
  const { data: profileRows, error: profileError } = await sb
    .from(PROOF_PROFILES_TABLE)
    .select('profile_type_v2')
    .or(`user_id.eq.${userId},clerk_id.eq.${userId}`)

  if (profileError) throw profileError

  const profiles = (profileRows ?? [])
    .map(row => row.profile_type_v2 as ExtraProfile)
    .filter(Boolean)

  const winemakerMemberships = await fetchWinemakerOrganizations(sb, userId)
  const winemakerOrganizations = winemakerMemberships.map(m => ({
    id: m.organizationId,
    name: m.organization.name,
    role: m.role,
  }))

  const requested = input?.profile_type
  const profileType = requested ?? inferDefaultProfile(profiles, winemakerMemberships)

  if (!profileType) {
    throw new Error(
      'No active PROOF profile. Complete onboarding or pass profile_type in the tool call.'
    )
  }

  assertProfileAccess(profiles, winemakerMemberships, profileType, input?.organization_id)

  let organizationId: string | null = null
  if (profileType === 'winemaker') {
    organizationId = await fetchWinemakerOrganizationIdForUser(
      sb,
      userId,
      input?.organization_id ?? null
    )
    if (!organizationId) {
      throw new Error('No winemaker organization found for this user.')
    }
  }

  const distributorScope =
    profileType === 'distributor' ? await resolveDistribuidorScope(sb, userId) : null

  return {
    profileType,
    organizationId,
    distributorScope,
    availableProfiles: profiles,
    winemakerOrganizations,
  }
}
