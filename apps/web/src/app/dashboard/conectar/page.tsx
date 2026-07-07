'use client'

export const dynamic = 'force-dynamic'

import { ProofConnectionHub } from '@/components/proof/ProofConnectionHub'
import { useProfile } from '@/context/ProfileContext'
import { useOrganization } from '@/context/OrganizationContext'
import { useWinemakerAccess } from '@/hooks/useWinemakerAccess'
import { resolveMcpClientProfileType } from '@/lib/mcp/client-profile'
import { profileTypeFromV2 } from '@/lib/proof/canvas-kpi'
import { getProfileTheme } from '@/lib/proof/profile-theme'
import { useTranslations } from 'next-intl'
import type { CSSProperties } from 'react'

const pageShellStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--color-background-tertiary)',
  color: 'var(--color-text-primary)',
}

export default function ConectarPage() {
  const t = useTranslations('connectionHub')
  const { activeProfile } = useProfile()
  const { activeOrg } = useOrganization()
  const { effectiveProfileType, loading } = useWinemakerAccess()

  const profileType = profileTypeFromV2(
    effectiveProfileType ?? activeProfile?.profile_type_v2 ?? undefined
  )
  const mcpProfileType = resolveMcpClientProfileType({
    profileType: effectiveProfileType ?? activeProfile?.profile_type_v2,
    orgType: activeOrg?.org_type,
  })
  const theme = getProfileTheme(effectiveProfileType ?? activeProfile?.profile_type_v2)

  if (loading) {
    return (
      <div
        style={{
          ...pageShellStyle,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}
      >
        {t('auth.checking')}
      </div>
    )
  }

  if (!profileType) {
    return (
      <div
        style={{
          ...pageShellStyle,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
          padding: 32,
          textAlign: 'center',
        }}
      >
        {t('test.noProfile')}
      </div>
    )
  }

  return (
    <div className="proof-canvas-page" style={pageShellStyle}>
      <ProofConnectionHub
        accent={theme.accent}
        profileType={profileType}
        mcpProfileType={mcpProfileType}
      />
    </div>
  )
}
