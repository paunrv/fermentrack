'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useWinemakerRouteGuard } from '@/hooks/useWinemakerRouteGuard'
import { dashboardPageShell } from '@/lib/ui/page-shell'

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function WinemakerAgendaPage() {
  const locale = useLocale() as AppLocale
  const t = useTranslations('winemaker.agenda')
  const tCommon = useTranslations('winemaker.common')
  const breakpoint = useBreakpoint()
  const { loading: scopeLoading, ok } = useWinemakerRouteGuard()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])

  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
        new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      )
    )
  }, [locale])

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
        new Date(year, month, 1)
      ),
    [locale, year, month]
  )

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>{tCommon('loading')}</div>
    )
  }

  return (
    <div style={dashboardPageShell(breakpoint, { withBottomNav: true, maxWidth: 720 })}>
      <div
        className="proof-agenda-page__header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>{t('title')}</h1>
          <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.5 }}>
            {t('subtitle')}
          </p>
        </div>
        <Link
          href="/dashboard"
          style={{
            fontSize: 13,
            color: 'var(--proof-accent, #7c5cbf)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {t('backToProof')}
        </Link>
      </div>

      <div
        className="proof-agenda-calendar"
        style={{
          borderRadius: 12,
          border: '0.5px solid var(--border)',
          background: 'var(--bg-1)',
          padding: 16,
        }}
      >
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 15,
            fontWeight: 600,
            textAlign: 'center',
            textTransform: 'capitalize',
          }}
        >
          {monthLabel}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginBottom: 4,
          }}
        >
          {weekdays.map(d => (
            <div
              key={d}
              className="proof-agenda-calendar__weekday"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--fg-2)',
                textAlign: 'center',
                padding: '4px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            const isToday = day === today
            return (
              <div
                key={`${i}-${day ?? 'x'}`}
                className="proof-agenda-calendar__day"
                style={{
                  minHeight: 52,
                  padding: 6,
                  borderRadius: 8,
                  border: isToday ? '1px solid var(--proof-accent, #7c5cbf)' : '1px solid transparent',
                  background: day ? 'var(--bg-2)' : 'transparent',
                  opacity: day ? 1 : 0.35,
                }}
              >
                {day ? (
                  <span
                    className="proof-agenda-calendar__day-num"
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 600 : 400,
                      color: isToday ? 'var(--proof-accent, #7c5cbf)' : 'var(--fg-1)',
                    }}
                  >
                    {day}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 10,
          border: '1px dashed var(--border)',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--fg-2)',
        }}
      >
        {t.rich('nextStep', {
          code: chunks => (
            <code style={{ fontSize: 12 }}>{chunks}</code>
          ),
        })}
      </div>
    </div>
  )
}
