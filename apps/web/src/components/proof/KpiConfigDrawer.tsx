'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { metricsForProfile, type ProfileType } from '@/lib/proof/kpi-metrics'

export type KpiDrawerScope = 'all' | 'single'

export function KpiConfigDrawer({
  slot: _slot,
  profileType,
  currentMetric,
  currentScope = 'all',
  accent,
  onSelect,
  onClose,
}: {
  slot: number
  profileType: ProfileType
  currentMetric: string
  currentScope?: KpiDrawerScope
  accent: string
  onSelect: (metric: string, scope: KpiDrawerScope) => void
  onClose: () => void
}) {
  const t = useTranslations(
    profileType === 'distributor' ? 'distributor.common.kpi' : 'distiller.common.kpi'
  )
  const [scope, setScope] = useState<KpiDrawerScope>(currentScope)
  const options = metricsForProfile(profileType)

  function handleMetric(metric: string) {
    onSelect(metric, scope)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-label={t('configureAria')}
      style={{
        marginTop: 8,
        background: 'var(--panel-2)',
        border: '0.5px solid var(--hairline)',
        borderRadius: 8,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--fg-3)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 10,
        }}
      >
        {t('changeDatum')}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => {
          const selected = opt.key === currentMetric
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleMetric(opt.key)}
              style={{
                fontSize: 11,
                borderRadius: 16,
                padding: '4px 12px',
                border: selected ? '0.5px solid var(--fg-0)' : '0.5px solid var(--line)',
                background: selected ? 'var(--fg-0)' : 'var(--surface-card)',
                color: selected ? 'var(--ink)' : 'var(--fg-3)',
                cursor: 'pointer',
                transition: 'border-color 0.12s ease, color 0.12s ease, background 0.12s ease',
              }}
              onMouseEnter={e => {
                if (selected) return
                e.currentTarget.style.borderColor = 'var(--fg-3)'
                e.currentTarget.style.color = 'var(--fg-1)'
              }}
              onMouseLeave={e => {
                if (selected) return
                e.currentTarget.style.borderColor = 'var(--line)'
                e.currentTarget.style.color = 'var(--fg-3)'
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            fontSize: 10,
            color: 'var(--fg-3)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            marginBottom: 6,
          }}
        >
          {t('applyTo')}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(
            [
              { key: 'single' as const, label: t('scopeSingle') },
              { key: 'all' as const, label: t('scopeAll') },
            ] as const
          ).map(opt => {
            const active = scope === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setScope(opt.key)}
                style={{
                  fontSize: 11,
                  borderRadius: 16,
                  padding: '4px 12px',
                  border: active ? `0.5px solid ${accent}44` : '0.5px solid var(--line)',
                  background: active ? `${accent}18` : 'var(--surface-card)',
                  color: active ? accent : 'var(--fg-3)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
