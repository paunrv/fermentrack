'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  LANDING_PRODUCER_TABS_VISIBLE,
  type ProducerCycleDemoContent,
  type ProducerTab,
  type ProducerTabContent,
} from '@/lib/proof/landing-copy'
import { ProducerCycleDemo } from './ProducerCycleDemo'
import { LANDING, LANDING_PROFILE_COLORS } from './landing-theme'

const TAB_COLORS: Record<ProducerTab, string> = {
  winemaker: LANDING_PROFILE_COLORS.winemaker,
  brewer: LANDING_PROFILE_COLORS.brewer,
  distiller: LANDING_PROFILE_COLORS.distiller,
}

function resolveDemoContent(tabContent: ProducerTabContent): ProducerCycleDemoContent {
  if (tabContent.demo) return tabContent.demo
  const legacyStages = tabContent.stages ?? []
  return {
    lotCode: tabContent.timelineTitle?.split(' · ')[0] ?? 'LOT-2026-014',
    varietal: tabContent.timelineTitle?.split(' · ')[1] ?? '—',
    stageHints: legacyStages.map(() => ''),
    stages: legacyStages.map(s => s.label),
    defaultActiveIndex: legacyStages.findIndex(s => s.status === 'active') ?? 2,
  }
}

export function ProducerTabsSection() {
  const t = useTranslations('landing.productores')
  const visibleTabs = LANDING_PRODUCER_TABS_VISIBLE
  const [activeTab, setActiveTab] = useState<ProducerTab>(visibleTabs[0] ?? 'winemaker')
  const tabContent = t.raw(`tabs.${activeTab}`) as ProducerTabContent
  const demo = resolveDemoContent(tabContent)
  const accent = TAB_COLORS[activeTab]
  const showTabSwitcher = visibleTabs.length > 1

  return (
    <section style={{ padding: '80px 24px', background: LANDING.bg }}>
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
          {t('eyebrow')}
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
          {t('title')}
        </h2>
        <p style={{ margin: '0 0 40px', fontSize: 16, color: LANDING.textSecondary, maxWidth: 560 }}>
          {t('subtitle')}
        </p>

        {showTabSwitcher ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
            {visibleTabs.map(tab => {
              const isActive = tab === activeTab
              const color = TAB_COLORS[tab]
              const label = t(`tabs.${tab}.label`)
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
                  {label}
                </button>
              )
            })}
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32,
            alignItems: 'center',
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
            {tabContent.bullets.map(bullet => (
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

          <ProducerCycleDemo
            key={activeTab}
            demo={demo}
            accent={accent}
            ariaLabel={t('cycleAriaLabel')}
          />
        </div>
      </div>
    </section>
  )
}
