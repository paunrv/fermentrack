'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { PlanHomeWarnings, PlanResourceWarning } from '@/lib/proof/plan-limit-warnings'

function PlanLimitProgressBar({
  warning,
  label,
}: {
  warning: PlanResourceWarning
  label: string
}) {
  const pct = warning.percentUsed ?? 0
  const isReached = warning.level === 'reached'

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={warning.limit ?? 100}
      aria-valuenow={warning.current}
      aria-label={label}
      style={{
        height: 8,
        borderRadius: 999,
        background: 'color-mix(in srgb, var(--hairline) 70%, transparent)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 999,
          background: isReached ? 'var(--crit, #c0392b)' : 'var(--warn, #b8860b)',
          transition: 'width 0.2s ease',
        }}
      />
    </div>
  )
}

function PlanLimitAlertCard({ warning }: { warning: PlanResourceWarning }) {
  const t = useTranslations('winemaker.home.planLimits')

  const messageKey =
    warning.resource === 'lotes_activos'
      ? warning.level === 'reached'
        ? 'lotesReached'
        : 'lotesApproaching'
      : warning.level === 'reached'
        ? 'memoriaReached'
        : 'memoriaApproaching'

  const label =
    warning.resource === 'lotes_activos' ? t('lotesLabel') : t('memoriaLabel')

  const isReached = warning.level === 'reached'

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 12,
        border: `1px solid ${isReached ? 'color-mix(in srgb, var(--crit, #c0392b) 35%, var(--hairline))' : 'color-mix(in srgb, var(--warn, #b8860b) 35%, var(--hairline))'}`,
        background: isReached ? 'var(--crit-soft, #fdecea)' : 'var(--warn-soft, #fff8e6)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--fg-0)' }}>
            {label}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.45 }}>
            {t(messageKey, {
              current: warning.current,
              limit: warning.limit ?? warning.current,
            })}
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          style={{
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--proof-accent, #6940A5)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {t('upgrade')} →
        </Link>
      </div>

      {warning.limit != null ? (
        <PlanLimitProgressBar warning={warning} label={label} />
      ) : null}
    </div>
  )
}

export function PlanLimitHomeAlerts({ warnings }: { warnings: PlanHomeWarnings | null }) {
  if (!warnings?.showAlerts) return null

  const active = warnings.resources.filter(resource => resource.level !== 'ok')
  if (active.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {active.map(warning => (
        <PlanLimitAlertCard key={warning.resource} warning={warning} />
      ))}
    </div>
  )
}
