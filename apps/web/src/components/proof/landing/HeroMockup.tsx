'use client'

import { LANDING } from './landing-theme'

export interface HeroMockupAlert {
  tone: 'warn' | 'info' | 'ok'
  title: string
  meta: string
}

const TONE_STYLES: Record<HeroMockupAlert['tone'], { border: string; bg: string; dot: string }> = {
  warn: {
    border: 'rgba(217, 115, 13, 0.35)',
    bg: 'rgba(217, 115, 13, 0.08)',
    dot: '#D9730D',
  },
  info: {
    border: `color-mix(in srgb, ${LANDING.brand} 35%, transparent)`,
    bg: `color-mix(in srgb, ${LANDING.brand} 10%, transparent)`,
    dot: LANDING.brand,
  },
  ok: {
    border: 'rgba(15, 123, 108, 0.35)',
    bg: 'rgba(15, 123, 108, 0.08)',
    dot: '#0F7B6C',
  },
}

export function HeroMockup({
  userLabel,
  liveLabel,
  alerts,
}: {
  userLabel: string
  liveLabel: string
  alerts: HeroMockupAlert[]
}) {
  return (
    <div
      aria-hidden
      style={{
        width: '100%',
        maxWidth: 420,
        marginLeft: 'auto',
        border: `1px solid ${LANDING.border}`,
        borderRadius: 12,
        background: LANDING.bg,
        boxShadow: '0 16px 48px rgba(15, 15, 15, 0.08)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: `1px solid ${LANDING.border}`,
          background: LANDING.bg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: LANDING.text,
            }}
          >
            PROOF
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: LANDING.textSecondary,
              padding: '2px 8px',
              border: `1px solid ${LANDING.border}`,
              borderRadius: 999,
            }}
          >
            {userLabel}
          </span>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: LANDING.textSecondary,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#0F7B6C',
              boxShadow: '0 0 0 3px rgba(15, 123, 108, 0.2)',
            }}
          />
          {liveLabel}
        </span>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map(alert => {
          const tone = TONE_STYLES[alert.tone]
          return (
            <div
              key={alert.title}
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                border: `1px solid ${tone.border}`,
                background: tone.bg,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: tone.dot,
                    marginTop: 5,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: LANDING.text,
                      lineHeight: 1.35,
                      marginBottom: 4,
                    }}
                  >
                    {alert.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: LANDING.textSecondary,
                      lineHeight: 1.4,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {alert.meta}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
