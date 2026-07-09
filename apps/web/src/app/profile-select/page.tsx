'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { useOrganization } from '@/context/OrganizationContext'
import { AuthLocaleBar } from '@/components/auth/AuthLocaleBar'
import { ensureWinemakerOwnerProfile } from '@/app/actions/profile'
import type { ExtraProfile } from '@/lib/supabase'

const PROFILE_EMOJI: Record<ExtraProfile, string> = {
  brewer: '🍺',
  winemaker: '🍷',
  distiller: '🥃',
  distributor: '📦',
  bodega: '📦',
}

const PROFILE_COLORS: Record<ExtraProfile, string> = {
  brewer: 'rgba(250, 199, 117, 0.35)',
  winemaker: 'rgba(159, 225, 203, 0.35)',
  distiller: 'rgba(245, 196, 179, 0.35)',
  distributor: 'rgba(181, 212, 244, 0.35)',
  bodega: '#2F5F8F',
}

const ALL_PROFILE_TYPES: ExtraProfile[] = [
  'brewer',
  'winemaker',
  'distiller',
  'distributor',
  'bodega',
]

export default function ProfileSelectPage() {
  const t = useTranslations('profileSelect')
  const router = useRouter()
  const { loading, allProfiles, profilesResolved, loadError, reload, switchProfile } =
    useProfile()
  const {
    loading: orgLoading,
    orgsResolved,
    allOrganizations,
  } = useOrganization()
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [syncingProfile, setSyncingProfile] = useState(false)

  useEffect(() => {
    if (loading || orgLoading || !profilesResolved || !orgsResolved) return
    if (allProfiles.length === 0 && allOrganizations.length === 0 && !loadError) {
      router.replace('/dashboard')
    }
  }, [
    loading,
    orgLoading,
    profilesResolved,
    orgsResolved,
    allProfiles.length,
    allOrganizations.length,
    loadError,
    router,
  ])

  useEffect(() => {
    if (loading || orgLoading || !profilesResolved || !orgsResolved) return
    if (allProfiles.length > 0 || allOrganizations.length === 0) return

    let cancelled = false
    setSyncingProfile(true)
    void ensureWinemakerOwnerProfile()
      .then(result => {
        if (cancelled) return
        if (result.created) return reload()
      })
      .catch(err => {
        console.warn('[profile-select] ensureWinemakerOwnerProfile', err)
      })
      .finally(() => {
        if (!cancelled) setSyncingProfile(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    loading,
    orgLoading,
    profilesResolved,
    orgsResolved,
    allProfiles.length,
    allOrganizations.length,
    reload,
  ])

  function handleSelect(type: ExtraProfile) {
    switchProfile(type)
    router.push('/dashboard')
  }

  const existingTypes = new Set(allProfiles.map(p => p.profile_type_v2))
  const missingTypes = ALL_PROFILE_TYPES.filter(type => !existingTypes.has(type))

  const loadingScreen = (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        color: 'var(--fg-3)',
        fontFamily: 'var(--font-display)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
      }}
    >
      {t('loading')}
    </div>
  )

  if (loading || orgLoading || syncingProfile) {
    return <AuthLocaleBar>{loadingScreen}</AuthLocaleBar>
  }

  if (loadError && allProfiles.length === 0) {
    return (
      <AuthLocaleBar>
        <div
          style={{
            minHeight: '100vh',
            background: 'var(--ink)',
            color: 'var(--fg-0)',
            fontFamily: 'var(--font-display)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            gap: 16,
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 15, color: 'var(--fg-2)' }}>{t('errorLoad')}</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>{loadError}</p>
          <button
            type="button"
            onClick={() => void reload()}
            style={{
              marginTop: 8,
              padding: '10px 20px',
              background: 'var(--fg-0)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('retry')}
          </button>
        </div>
      </AuthLocaleBar>
    )
  }

  if (allProfiles.length === 0 && allOrganizations.length > 0) {
    return <AuthLocaleBar>{loadingScreen}</AuthLocaleBar>
  }

  if (allProfiles.length === 0) {
    return <AuthLocaleBar>{loadingScreen}</AuthLocaleBar>
  }

  return (
    <AuthLocaleBar>
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--ink)',
          color: 'var(--fg-0)',
          fontFamily: 'var(--font-display)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          {t('title')}
        </h1>
        <p
          style={{
            margin: '0 0 40px',
            fontSize: 15,
            color: 'var(--fg-2)',
            textAlign: 'center',
          }}
        >
          {t('subtitle')}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            maxWidth: 720,
          }}
        >
          {allProfiles.map(p => {
            const type = p.profile_type_v2
            const color = PROFILE_COLORS[type]
            const emoji = PROFILE_EMOJI[type]
            const label = t(`profiles.${type}`)
            const hovered = hoveredKey === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleSelect(type)}
                onMouseEnter={() => setHoveredKey(type)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{
                  width: 148,
                  minHeight: 140,
                  background: hovered ? color : 'var(--ink)',
                  border: `1px solid ${hovered ? 'var(--line)' : 'var(--hairline)'}`,
                  borderRadius: 'var(--radius-md)',
                  boxShadow: hovered ? 'var(--shadow-sm)' : 'none',
                  color: 'var(--fg-0)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 16,
                  transition:
                    'background 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
                }}
              >
                <div style={{ fontSize: 36, lineHeight: 1 }}>{emoji}</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    maxWidth: '100%',
                  }}
                >
                  {p.username || label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{label}</div>
              </button>
            )
          })}

          {missingTypes.length > 0 ? (
            <button
              type="button"
              onClick={() => router.push('/onboarding')}
              onMouseEnter={() => setHoveredKey('add')}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                width: 148,
                minHeight: 140,
                background: hoveredKey === 'add' ? 'rgba(105, 64, 165, 0.08)' : 'var(--ink)',
                border: `1px dashed ${hoveredKey === 'add' ? 'var(--proof-accent)' : 'var(--hairline)'}`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--fg-0)',
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 32, lineHeight: 1 }}>+</div>
              <div style={{ fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
                {t('addProfile')}
              </div>
            </button>
          ) : null}
        </div>
      </div>
    </AuthLocaleBar>
  )
}
