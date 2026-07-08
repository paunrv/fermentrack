'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { useOrganization } from '@/context/OrganizationContext'
import { useWinemakerAccess } from '@/hooks/useWinemakerAccess'
import { resolveMcpClientProfileType } from '@/lib/mcp/client-profile'
import { ProofConnectionHub } from '@/components/proof/ProofConnectionHub'
import { ProofOrdenCompraPanel } from '@/components/proof/ProofOrdenCompraPanel'
import { WinemakerDesktopHome } from '@/components/proof/WinemakerDesktopHome'
import { WinemakerMobileHome } from '@/components/proof/WinemakerMobileHome'
import { WinemakerDashboardTour } from '@/components/proof/WinemakerDashboardTour'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { resolveWinemakerOwnerHomeView } from '@/lib/proof/winemaker-owner-home-view'
import { profileTypeFromV2 } from '@/lib/proof/canvas-kpi'
import { getProfileTheme } from '@/lib/proof/profile-theme'

const pageShellStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
}

export default function DashboardPage() {
  const tHome = useTranslations('distributor.home')
  const searchParams = useSearchParams()
  const { activeProfile } = useProfile()
  const { activeOrg } = useOrganization()
  const {
    isWinemaker,
    isWinemakerOrgShell,
    effectiveProfileType,
    membership,
    loading: winemakerAccessLoading,
    bootTimedOut,
    bootError,
  } = useWinemakerAccess()

  const profileType = profileTypeFromV2(effectiveProfileType ?? undefined)
  const mcpProfileType = resolveMcpClientProfileType({
    profileType: effectiveProfileType ?? activeProfile?.profile_type_v2,
    orgType: activeOrg?.org_type,
  })
  const theme = getProfileTheme(effectiveProfileType ?? undefined)
  const accent = theme.accent
  const isDistributor = profileType === 'distributor'
  const isWinemakerOwner = isWinemaker && membership?.role === 'owner'

  const [ocFromUrl, setOcFromUrl] = useState<string | null>(null)
  const breakpoint = useBreakpoint()
  const ownerHomeView = resolveWinemakerOwnerHomeView(breakpoint)

  useEffect(() => {
    const oc = searchParams.get('oc')?.trim()
    if (oc) setOcFromUrl(oc)
  }, [searchParams])

  if (winemakerAccessLoading) {
    return (
      <div
        style={{
          ...pageShellStyle,
          background: 'var(--color-background-tertiary)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}
      >
        {tHome('loading')}
      </div>
    )
  }

  if (bootTimedOut) {
    return (
      <div
        style={{
          ...pageShellStyle,
          background: 'var(--canvas)',
          display: 'grid',
          placeContent: 'center',
          gap: 12,
          padding: 32,
          textAlign: 'center',
          color: 'var(--fg-2)',
          fontSize: 14,
        }}
      >
        <p style={{ margin: 0 }}>
          {bootError ?? 'No pudimos cargar tu sesión. Recarga la página o vuelve a iniciar sesión.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--hairline)',
              background: 'var(--panel)',
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.assign('/sign-in?next=/dashboard')
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--copper)',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    )
  }

  if (!profileType) {
    return (
      <div
        style={{
          ...pageShellStyle,
          background: 'var(--color-background-tertiary)',
          padding: 48,
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}
      >
        {tHome('incompatibleProfile')}
      </div>
    )
  }

  if (isWinemaker && isWinemakerOwner) {
    return (
      <div style={{ ...pageShellStyle, overflow: 'hidden' }}>
        {ownerHomeView === 'desktop' ? <WinemakerDesktopHome /> : <WinemakerMobileHome />}
        <Suspense fallback={null}>
          <WinemakerDashboardTour />
        </Suspense>
      </div>
    )
  }

  return (
    <div
      className="proof-canvas-page"
      style={{
        ...pageShellStyle,
        background: 'var(--color-background-tertiary)',
        color: 'var(--color-text-primary)',
      }}
    >
      <ProofOrdenCompraPanel
        accent={accent}
        initialOrdenId={isDistributor ? ocFromUrl : null}
        onDismiss={() => setOcFromUrl(null)}
      />
      <ProofConnectionHub
        accent={accent}
        profileType={profileType}
        mcpProfileType={mcpProfileType}
      />
    </div>
  )
}
