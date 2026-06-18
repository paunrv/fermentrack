'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import type { DestMembresia } from '@/lib/proof/destilador-types'

const BADGE_LABEL: Record<ProfileType, string> = {
  distiller: 'DESTILADOR',
  distributor: 'DISTRIBUIDOR',
  winemaker: 'WINEMAKER',
}

const MEMBRESIA_LABEL: Record<DestMembresia, string> = {
  basico: 'Básico',
  profesional: 'Profesional',
  premium: 'Premium',
}

export function ProofTopbar({
  accent,
  profileType,
  membresia,
  profileLabel,
}: {
  accent: string
  profileType: ProfileType
  membresia?: DestMembresia | null
  profileLabel?: string
}) {
  const { user } = useUser()
  const router = useRouter()

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.firstName?.[0] || 'U'

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--ink)',
        borderBottom: '0.5px solid var(--hairline)',
        borderTop: `2px solid ${accent}`,
        padding: '14px 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.15em',
            color: 'var(--fg-0)',
          }}
        >
          PR<span style={{ color: accent }}>O</span>OF
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            borderRadius: 4,
            padding: '3px 8px',
            background: `${accent}18`,
            color: accent,
            letterSpacing: '0.06em',
          }}
        >
          {BADGE_LABEL[profileType]}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {profileType === 'distiller' && membresia && (
          <span
            style={{
              fontSize: 10,
              color: '#BBB',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {MEMBRESIA_LABEL[membresia]}
          </span>
        )}
        {profileLabel && profileType === 'distributor' && (
          <span
            style={{
              fontSize: 10,
              color: '#BBB',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {profileLabel}
          </span>
        )}
        <button
          type="button"
          onClick={() => router.push('/dashboard/settings')}
          aria-label="Ajustes"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 'none',
            background: `${accent}18`,
            color: accent,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            padding: 0,
          }}
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            initials
          )}
        </button>
      </div>
    </header>
  )
}

export function CanvasDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 24px',
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, height: '0.5px', background: 'var(--hairline)' }} />
      <div
        style={{
          fontSize: 9,
          color: '#CCC',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--hairline)' }} />
    </div>
  )
}
