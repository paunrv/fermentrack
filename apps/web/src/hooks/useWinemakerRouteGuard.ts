'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWinemakerAccess } from '@/hooks/useWinemakerAccess'

/** Guard de rutas /dashboard/winemaker — requiere org winemaker activa. */
export function useWinemakerRouteGuard() {
  const router = useRouter()
  const {
    isWinemaker,
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
    if (!isWinemaker) router.replace('/dashboard')
  }, [loading, isWinemaker, router])

  return {
    loading,
    ok: isWinemaker,
    userId,
    organizationId,
    profile: activeProfile,
    activeOrg,
    canWrite,
    canManage,
  }
}
