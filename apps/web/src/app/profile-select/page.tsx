'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import type { ExtraProfile } from '@/lib/supabase'

const PROFILE_META: Record<
  ExtraProfile,
  { emoji: string; label: string; color: string }
> = {
  brewer: { emoji: '🍺', label: 'Brewer', color: 'rgba(250, 199, 117, 0.35)' },
  winemaker: { emoji: '🍷', label: 'Winemaker', color: 'rgba(159, 225, 203, 0.35)' },
  distiller: { emoji: '🥃', label: 'Distiller', color: 'rgba(245, 196, 179, 0.35)' },
  distributor: { emoji: '📦', label: 'Distribuidor', color: 'rgba(181, 212, 244, 0.35)' },
  bodega: {
    emoji: '📦',
    label: 'Bodega',
    color: '#2F5F8F',
  },
}

export default function ProfileSelectPage() {
  const router = useRouter()
  const { loading, allProfiles, profilesResolved, loadError, reload, switchProfile } =
    useProfile()
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !profilesResolved) return
    if (allProfiles.length === 0 && !loadError) {
      router.replace('/onboarding')
    }
  }, [loading, profilesResolved, allProfiles.length, loadError, router])

  function handleSelect(type: ExtraProfile) {
    switchProfile(type)
    router.push('/dashboard')
  }

  const canAddMore = allProfiles.length < 5

  if (loading) {
    return (
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
        Cargando perfiles…
      </div>
    )
  }

  if (loadError && allProfiles.length === 0) {
    return (
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
        <p style={{ margin: 0, fontSize: 15, color: 'var(--fg-2)' }}>
          No pudimos cargar tus perfiles. Revisa tu conexión e intenta de nuevo.
        </p>
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
          Reintentar
        </button>
      </div>
    )
  }

  if (allProfiles.length === 0) {
    return (
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
        Cargando perfiles…
      </div>
    )
  }

  return (
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
        PROOF
      </h1>
      <p
        style={{
          margin: '0 0 40px',
          fontSize: 15,
          color: 'var(--fg-2)',
          textAlign: 'center',
        }}
      >
        ¿Qué perfil quieres usar hoy?
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
          const meta = PROFILE_META[p.profile_type_v2]
          const hovered = hoveredKey === p.profile_type_v2
          return (
            <button
              key={p.profile_type_v2}
              type="button"
              onClick={() => handleSelect(p.profile_type_v2)}
              onMouseEnter={() => setHoveredKey(p.profile_type_v2)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                width: 148,
                minHeight: 140,
                background: hovered ? meta.color : 'var(--ink)',
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
                transition: 'background 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
              }}
            >
              <div style={{ fontSize: 36, lineHeight: 1 }}>{meta.emoji}</div>
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
                {p.username || meta.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{meta.label}</div>
            </button>
          )
        })}

        {canAddMore && (
          <button
            type="button"
            onClick={() => router.push('/onboarding?mode=add')}
            onMouseEnter={() => setHoveredKey('__add__')}
            onMouseLeave={() => setHoveredKey(null)}
            style={{
              width: 148,
              minHeight: 140,
              background: hoveredKey === '__add__' ? 'var(--panel-2)' : 'var(--ink)',
              border: `1px dashed ${hoveredKey === '__add__' ? 'var(--line)' : 'var(--hairline)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--fg-2)',
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 16,
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1 }}>+</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Agregar perfil</div>
          </button>
        )}
      </div>
    </div>
  )
}
