'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { resolvePostAuthPath } from '@/lib/auth/auth-callback'
import { activateInviteSession } from '@/lib/auth/activate-invite-session'
import { AuthLocaleBar } from '@/components/auth/AuthLocaleBar'

function AuthConfirmContent() {
  const t = useTranslations('auth.confirm')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const flow = searchParams.get('flow')
      const teamFlow = flow === 'team'
      const sb = createClient()

      const result = await activateInviteSession(sb, {
        hash: window.location.hash,
        searchParams,
        teamFlow,
      })

      if (!result.ok) {
        if (!cancelled) setError(result.reason)
        return
      }

      const intent = searchParams.get('intent')
      const destination =
        result.isInvite || teamFlow
          ? '/onboarding?mode=team'
          : resolvePostAuthPath(null, flow, intent, null)

      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      router.replace(destination)
    })()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <AuthLocaleBar>
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          fontFamily: 'var(--font-display)',
        }}
      >
        {error ? (
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <p style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--fg-0)' }}>{t('error')}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)' }}>{error}</p>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>{t('loading')}</p>
        )}
      </div>
    </AuthLocaleBar>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>…</div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  )
}
