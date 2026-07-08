'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useWinemakerAccess } from '@/hooks/useWinemakerAccess'

const BODEGA_TEAM_PATH_PREFIXES = ['/dashboard/winemaker/agenda', '/dashboard/settings']

function isBodegaTeamPath(pathname: string): boolean {
  if (pathname === '/dashboard') return true
  return BODEGA_TEAM_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** Guard de rutas /dashboard/winemaker — requiere org winemaker activa. */
export function useWinemakerRouteGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const {
    isWinemaker,
    isWinemakerOrgShell,
    isBodegaTeam,
    loading,
    canWrite,
    canManage,
    userId,
    activeOrg,
    activeProfile,
  } = useWinemakerAccess()

  const organizationId = activeOrg?.id ?? null

  useEffect(() => {
    if (loading) return
    if (!isWinemakerOrgShell) {
      router.replace('/dashboard')
      return
    }
    if (isBodegaTeam && !isBodegaTeamPath(pathname)) {
      router.replace('/dashboard')
    }
  }, [loading, isWinemakerOrgShell, isBodegaTeam, pathname, router])

  return {
    loading,
    ok: isWinemakerOrgShell && (!isBodegaTeam || isBodegaTeamPath(pathname)),
    userId,
    organizationId,
    profile: activeProfile,
    activeOrg,
    canWrite,
    canManage,
    isBodegaTeam,
    isWinemaker,
  }
}
