'use client'

import { useState } from 'react'
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
  const [scope, setScope] = useState<KpiDrawerScope>(currentScope)
  const options = metricsForProfile(profileType)

  function handleMetric(metric: string) {
    onSelect(metric, scope)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-label="Configurar KPI"
      style={{
        marginTop: 8,
        background: '#FAFAF8',
        border: '0.5px solid #E8E6E0',
        borderRadius: 8,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: '#AAA',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 10,
        }}
      >
        Cambiar este dato
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
                border: selected ? '0.5px solid #1A1A1A' : '0.5px solid #E0DDD6',
                background: selected ? '#1A1A1A' : '#fff',
                color: selected ? '#fff' : '#888',
                cursor: 'pointer',
                transition: 'border-color 0.12s ease, color 0.12s ease, background 0.12s ease',
              }}
              onMouseEnter={e => {
                if (selected) return
                e.currentTarget.style.borderColor = '#BBB'
                e.currentTarget.style.color = '#555'
              }}
              onMouseLeave={e => {
                if (selected) return
                e.currentTarget.style.borderColor = '#E0DDD6'
                e.currentTarget.style.color = '#888'
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
            color: '#BBB',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            marginBottom: 6,
          }}
        >
          Aplicar a:
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(
            [
              { key: 'single' as const, label: 'Solo este lote' },
              { key: 'all' as const, label: 'Todos mis lotes' },
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
                  border: active ? `0.5px solid ${accent}44` : '0.5px solid #E0DDD6',
                  background: active ? `${accent}18` : '#fff',
                  color: active ? accent : '#888',
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
