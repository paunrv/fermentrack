'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { useWinemakerOwnerHomeData } from '@/hooks/useWinemakerOwnerHomeData'
import {
  readWinemakerDashboardTourCompleted,
  writeWinemakerDashboardTourCompleted,
} from '@/lib/proof/winemaker-dashboard-tour'

type TourStep = {
  emoji: string
  title: string
  body: string
  cta?: string
  href?: string
}

export function WinemakerDashboardTour() {
  const t = useTranslations('winemaker.tour')
  const searchParams = useSearchParams()
  const { user, isLoaded } = useAuth()
  const { loading: homeLoading } = useWinemakerOwnerHomeData()
  const steps = t.raw('steps') as TourStep[]

  const forceOpen = searchParams.get('tour') === '1'
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const userId = user?.id ?? null
  const totalSteps = steps.length
  const step = steps[stepIndex]
  const isLast = stepIndex >= totalSteps - 1

  useEffect(() => {
    if (!isLoaded || homeLoading || !userId) return
    if (forceOpen) {
      setStepIndex(0)
      setOpen(true)
      return
    }
    if (!readWinemakerDashboardTourCompleted(userId)) {
      setStepIndex(0)
      setOpen(true)
    }
  }, [isLoaded, homeLoading, userId, forceOpen])

  const stepLabel = useMemo(
    () => t('stepOf', { current: stepIndex + 1, total: totalSteps }),
    [stepIndex, totalSteps, t]
  )

  function closeTour(markCompleted: boolean) {
    if (markCompleted && userId) writeWinemakerDashboardTourCompleted(userId)
    setOpen(false)
  }

  function goNext() {
    if (isLast) {
      closeTour(true)
      return
    }
    setStepIndex(index => Math.min(index + 1, totalSteps - 1))
  }

  if (!open || !step || totalSteps === 0) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="winemaker-tour-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <button
        type="button"
        aria-label={t('skip')}
        onClick={() => closeTour(true)}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          padding: 0,
          margin: 0,
          background: 'rgba(15, 15, 15, 0.55)',
          cursor: 'pointer',
        }}
      />
      <div
        className="proof-winemaker-tour-panel"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          padding: '28px 24px 22px',
          borderRadius: 'var(--radius-card)',
          background: 'var(--panel)',
          border: '1px solid var(--hairline)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
          }}
        >
          {stepLabel}
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {steps.map((_, index) => (
            <span
              key={index}
              aria-hidden
              style={{
                flex: index === stepIndex ? 2 : 1,
                height: 4,
                borderRadius: 999,
                background:
                  index <= stepIndex
                    ? 'var(--copper)'
                    : 'color-mix(in srgb, var(--fg-3) 25%, transparent)',
                transition: 'flex 180ms var(--ease-out)',
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 14 }} aria-hidden>
          {step.emoji}
        </div>
        <h2
          id="winemaker-tour-title"
          style={{
            margin: '0 0 12px',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--fg-0)',
            lineHeight: 1.25,
          }}
        >
          {step.title}
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, color: 'var(--fg-2)' }}>
          {step.body}
        </p>

        {isLast && step.cta && step.href ? (
          <Link
            href={step.href}
            onClick={() => closeTour(true)}
            style={{
              display: 'block',
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'color-mix(in srgb, var(--copper) 12%, var(--panel))',
              border: '1px solid color-mix(in srgb, var(--copper) 35%, var(--hairline))',
              color: 'var(--fg-0)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            {step.cta} →
          </Link>
        ) : null}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => setStepIndex(index => Math.max(0, index - 1))}
              style={secondaryBtnStyle}
            >
              {t('back')}
            </button>
          ) : (
            <button type="button" onClick={() => closeTour(true)} style={secondaryBtnStyle}>
              {t('skip')}
            </button>
          )}
          <button type="button" onClick={goNext} style={primaryBtnStyle}>
            {isLast ? t('done') : t('next')}
          </button>
        </div>
      </div>
    </div>
  )
}

const primaryBtnStyle: CSSProperties = {
  flex: 1,
  minWidth: 120,
  padding: '11px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--copper)',
  background: 'var(--copper)',
  color: 'var(--ink)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryBtnStyle: CSSProperties = {
  flex: 1,
  minWidth: 120,
  padding: '11px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--hairline)',
  background: 'var(--panel-2)',
  color: 'var(--fg-0)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
