'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'

/** Solo perfil distiller (Patrón mezcal) en rutas /dashboard/destilador. */
export function useDestiladorScope() {
  const router = useRouter()
  const { scope, activeProfile, loading } = useProfile()
  const ok = activeProfile?.profile_type_v2 === 'distiller'

  useEffect(() => {
    if (loading) return
    if (!ok) router.replace('/dashboard')
  }, [loading, ok, router])

  return {
    loading,
    ok,
    clerkId: scope?.clerk_id ?? null,
    profile: activeProfile,
  }
}
