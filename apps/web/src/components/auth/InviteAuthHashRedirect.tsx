'use client'

import { useEffect } from 'react'
import { hasAuthHashTokens } from '@/lib/auth/confirm-hash'

/** Catches invite links that land on /dashboard#access_token=… (legacy Site URL). */
export function InviteAuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hasAuthHashTokens(hash)) return

    const params = new URLSearchParams(hash.slice(1))
    if (params.get('type') !== 'invite') return

    const confirm = new URL('/auth/confirm', window.location.origin)
    confirm.searchParams.set('flow', 'team')
    confirm.hash = hash
    window.location.replace(confirm.toString())
  }, [])

  return null
}
