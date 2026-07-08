'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { fetchPendingTeamInvite } from '@/app/actions/team-onboarding'

/** Invited members must finish team onboarding before using the dashboard. */
export function PendingTeamInviteRedirect() {
  const { user, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !user) return

    let cancelled = false
    void fetchPendingTeamInvite()
      .then(invite => {
        if (!cancelled && invite) {
          router.replace('/onboarding?mode=team')
        }
      })
      .catch(() => {
        /* ignore */
      })

    return () => {
      cancelled = true
    }
  }, [isLoaded, user, router])

  return null
}
