'use client'

import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/context/OrganizationContext'
import { useProfile } from '@/context/ProfileContext'
import type { ExtraProfile } from '@/lib/supabase'

/** Winemaker vía org (epic #3) o perfil legacy (`proof_profiles`). */
export function useWinemakerAccess() {
  const { user } = useAuth()
  const { activeProfile, scope, loading: profileLoading, profilesResolved } = useProfile()
  const {
    activeOrg,
    membership,
    loading: orgLoading,
    orgsResolved,
  } = useOrganization()

  const viaOrg = activeOrg?.org_type === 'winemaker'
  const viaProfile = activeProfile?.profile_type_v2 === 'winemaker'
  const isWinemaker = viaOrg || viaProfile

  const effectiveProfileType: ExtraProfile | null = isWinemaker
    ? 'winemaker'
    : (activeProfile?.profile_type_v2 ?? null)

  const loading =
    profileLoading || orgLoading || !profilesResolved || !orgsResolved

  const userId = scope?.user_id ?? (isWinemaker ? user?.id ?? null : null)

  return {
    isWinemaker,
    viaOrg,
    viaProfile,
    effectiveProfileType,
    loading,
    userId,
    activeOrg,
    membership,
    activeProfile,
    scope,
    canWrite: viaOrg
      ? membership != null && ['owner', 'admin', 'member'].includes(membership.role)
      : viaProfile,
    canManage: viaOrg
      ? membership != null && ['owner', 'admin'].includes(membership.role)
      : false,
  }
}
