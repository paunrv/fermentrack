'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/context/OrganizationContext'
import { useProfile } from '@/context/ProfileContext'
import type { ExtraProfile } from '@/lib/supabase'

const BOOT_TIMEOUT_MS = 8_000

/** Winemaker vía org (epic #3) o perfil legacy (`proof_profiles`). */
export function useWinemakerAccess() {
  const { user, isLoaded } = useAuth()
  const {
    activeProfile,
    scope,
    loading: profileLoading,
    profilesResolved,
    loadError: profileLoadError,
  } = useProfile()
  const {
    activeOrg,
    membership,
    loading: orgLoading,
    orgsResolved,
    loadError: orgLoadError,
  } = useOrganization()

  const [bootTimedOut, setBootTimedOut] = useState(false)

  const viaOrg = activeOrg?.org_type === 'winemaker'
  const viaProfile = activeProfile?.profile_type_v2 === 'winemaker'
  const isWinemaker = viaOrg || viaProfile

  const effectiveProfileType: ExtraProfile | null = isWinemaker
    ? 'winemaker'
    : (activeProfile?.profile_type_v2 ?? null)

  const dataPending =
    !isLoaded || profileLoading || orgLoading || !profilesResolved || !orgsResolved

  useEffect(() => {
    if (!dataPending) {
      setBootTimedOut(false)
      return
    }
    const t = window.setTimeout(() => setBootTimedOut(true), BOOT_TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [dataPending])

  const loading = dataPending && !bootTimedOut

  const userId = scope?.user_id ?? user?.id ?? null

  return {
    isWinemaker,
    viaOrg,
    viaProfile,
    effectiveProfileType,
    loading,
    bootTimedOut,
    bootError: profileLoadError ?? orgLoadError,
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
