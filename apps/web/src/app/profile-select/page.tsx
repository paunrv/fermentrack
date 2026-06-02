'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import type { ExtraProfile } from '@/lib/supabase'

const font = "'Space Grotesk', sans-serif"

const PROFILE_META: Record<
  ExtraProfile,
  { emoji: string; label: string; color: string }
> = {
  brewer: { emoji: '🍺', label: 'Brewer', color: '#FAC775' },
  winemaker: { emoji: '🍷', label: 'Winemaker', color: '#9FE1CB' },
  distiller: { emoji: '🥃', label: 'Distiller', color: '#F5C4B3' },
  distributor: { emoji: '📦', label: 'Distribuidor', color: '#B5D4F4' },
}

export default function ProfileSelectPage() {
  const router = useRouter()
  const { loading, allProfiles, switchProfile } = useProfile()
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (allProfiles.length === 0) {
      router.replace('/onboarding')
    }
  }, [loading, allProfiles, router])

  async function handleSelect(type: ExtraProfile) {
    await switchProfile(type)
    router.push('/dashboard')
  }

  const canAddMore = allProfiles.length < 5

  if (loading || allProfiles.length === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#111',
          color: '#fff',
          fontFamily: font,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          opacity: 0.6,
        }}
      >
        Cargando perfiles...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#111',
        color: '#fff',
        fontFamily: font,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: '-.04em',
          color: '#fff',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Fermen<span style={{ color: '#E24B4A' }}>T</span>rack
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: '#888',
          marginBottom: 48,
          textAlign: 'center',
        }}
      >
        ¿Quién está produciendo hoy?
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          justifyContent: 'center',
          maxWidth: 900,
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
                width: 140,
                height: 160,
                background: meta.color,
                border: `3px solid ${hovered ? '#fff' : '#111'}`,
                outline: hovered ? '3px solid #fff' : 'none',
                outlineOffset: hovered ? '-3px' : 0,
                color: '#111',
                fontFamily: font,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 12,
                transition: 'transform .15s ease, outline-color .15s ease',
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              <div style={{ fontSize: 48, lineHeight: 1 }}>{meta.emoji}</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: '#111',
                  textAlign: 'center',
                  lineHeight: 1.1,
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
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: '#111',
                  opacity: 0.6,
                }}
              >
                {meta.label}
              </div>
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
              width: 140,
              height: 160,
              background: 'transparent',
              border: `3px solid ${hoveredKey === '__add__' ? '#fff' : '#444'}`,
              color: hoveredKey === '__add__' ? '#fff' : '#888',
              fontFamily: font,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: 12,
              transition: 'all .15s ease',
              transform: hoveredKey === '__add__' ? 'translateY(-4px)' : 'translateY(0)',
            }}
          >
            <div style={{ fontSize: 56, fontWeight: 300, lineHeight: 1 }}>+</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
              }}
            >
              Agregar perfil
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
