'use client'

import { useState } from 'react'
import { PRODUCER_TABS, type ProducerTab } from '@/lib/proof/landing-copy'
import { useLandingLanguage } from './LandingLanguageContext'
import { LANDING, LANDING_PROFILE_COLORS } from './landing-theme'

const TAB_COLORS: Record<ProducerTab, string> = {
  winemaker: LANDING_PROFILE_COLORS.winemaker,
  brewer: LANDING_PROFILE_COLORS.brewer,
  distiller: LANDING_PROFILE_COLORS.distiller,
}

function StageIcon({ status }: { status: 'done' | 'active' | 'pending' }) {
  if (status === 'done') return <span aria-hidden>✅</span>
  if (status === 'active') return <span aria-hidden>⚡</span>
  return null
}

export function ProducerTabsSection() {
  const { lang, copy } = useLandingLanguage()
  const [activeTab, setActiveTab] = useState<ProducerTab>('winemaker')
  const tabContent = PRODUCER_TABS[activeTab]
  const accent = TAB_COLORS[activeTab]
  const tabs: ProducerTab[] = ['winemaker', 'brewer', 'distiller']

  return (
    <section id="demo" style={{ padding: '80px 24px', background: LANDING.bg }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div
          style={{
            marginBottom: 12,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: LANDING.textSecondary,
          }}
        >
          {copy.productores.eyebrow}
        </div>
        <h2
          style={{
            margin: '0 0 12px',
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: LANDING.text,
            maxWidth: 640,
          }}
        >
          {copy.productores.title}
        </h2>
        <p style={{ margin: '0 0 40px', fontSize: 16, color: LANDING.textSecondary, maxWidth: 560 }}>
          {copy.productores.subtitle}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          {tabs.map(tab => {
            const isActive = tab === activeTab
            const color = TAB_COLORS[tab]
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-pressed={isActive}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isActive ? color : LANDING.border}`,
                  background: isActive ? `${color}14` : LANDING.bg,
                  color: isActive ? color : LANDING.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms var(--ease-out)',
                }}
              >
                {PRODUCER_TABS[tab].label[lang]}
              </button>
            )
          })}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32,
            alignItems: 'start',
          }}
        >
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {tabContent.bullets[lang].map(bullet => (
              <li
                key={bullet}
                style={{
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: LANDING.text,
                  paddingLeft: 4,
                }}
              >
                {bullet}
              </li>
            ))}
          </ul>

          <div
            style={{
              border: `1px solid ${accent}33`,
              borderRadius: 'var(--radius-card)',
              background: LANDING.bg,
              padding: 24,
              boxShadow: '0 1px 3px rgba(15, 15, 15, 0.06)',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: accent,
                fontWeight: 600,
                marginBottom: 20,
                letterSpacing: '0.02em',
              }}
            >
              {tabContent.timelineTitle[lang]}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 4px', alignItems: 'center' }}>
              {tabContent.stages.map((stage, i) => (
                <span key={stage.label.es} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && (
                    <span style={{ color: LANDING.border, margin: '0 2px' }} aria-hidden>
                      ·
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: stage.status === 'active' ? 600 : 400,
                      color:
                        stage.status === 'active'
                          ? accent
                          : stage.status === 'done'
                            ? LANDING.text
                            : LANDING.textSecondary,
                    }}
                  >
                    {stage.label[lang]}
                  </span>
                  <StageIcon status={stage.status} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
