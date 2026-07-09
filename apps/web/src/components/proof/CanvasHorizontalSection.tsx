'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Children, type ReactNode } from 'react'

export function CanvasHorizontalSection({
  accent,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  emptyMessage,
  itemWidth = 168,
  loading = false,
  skeletonCount = 2,
  toolbar,
  hideHeader,
  children,
}: {
  accent: string
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaHref?: string
  emptyMessage?: string
  itemWidth?: number
  loading?: boolean
  skeletonCount?: number
  toolbar?: ReactNode
  hideHeader?: boolean
  children?: ReactNode
}) {
  const t = useTranslations('distributor.canvas.errors')
  const router = useRouter()
  const items = Children.toArray(children).filter(Boolean)
  const isEmpty = !loading && items.length === 0
  const resolvedEmpty = emptyMessage ?? t('emptySection')

  return (
    <section style={{ marginBottom: 28 }}>
      {!hideHeader && (
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 16px',
          marginBottom: toolbar ? 8 : 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.4 }}>
              {subtitle}
            </p>
          )}
        </div>
        {ctaLabel && ctaHref && (
          <button
            type="button"
            onClick={() => router.push(ctaHref)}
            style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 500,
              padding: '8px 12px',
              minHeight: 36,
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${accent}33`,
              background: `${accent}0D`,
              color: accent,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {ctaLabel}
          </button>
        )}
      </header>
      )}

      {toolbar}

      {loading ? (
        <div className="proof-canvas-rail" aria-busy="true">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="proof-canvas-rail__item"
              style={{ width: itemWidth, flex: `0 0 ${itemWidth}px` }}
            >
              <div
                aria-hidden
                style={{
                  height: 148,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--panel-2)',
                  animation: 'proof-skeleton-pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <p style={{ margin: 0, padding: '0 16px', fontSize: 13, color: 'var(--fg-3)' }}>
          {resolvedEmpty}
        </p>
      ) : (
        <div className="proof-canvas-rail">
          {items.map((child, i) => (
            <div
              key={i}
              className="proof-canvas-rail__item"
              style={{ width: itemWidth, flex: `0 0 ${itemWidth}px` }}
            >
              {child}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
