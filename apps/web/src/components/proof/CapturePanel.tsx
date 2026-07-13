'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export type CaptureOptionId = 'voz' | 'foto' | 'nota' | 'lab'

const ALL_CAPTURE_IDS: CaptureOptionId[] = ['voz', 'foto', 'nota', 'lab']

const CAPTURE_EMOJI: Record<CaptureOptionId, string> = {
  voz: '🎙️',
  foto: '📷',
  nota: '✍️',
  lab: '🧪',
}

export function CapturePanel({
  open,
  onClose,
  onSelect,
  customizeHref = '/dashboard/settings',
  /** Subset of options to show. Defaults to all four. */
  options = ALL_CAPTURE_IDS,
}: {
  open: boolean
  onClose: () => void
  onSelect?: (id: CaptureOptionId) => void
  customizeHref?: string
  options?: CaptureOptionId[]
}) {
  const t = useTranslations('dashboard.capturePanel')
  const ids = options.length > 0 ? options : ALL_CAPTURE_IDS

  return (
    <div className="proof-capture-panel-root proof-mobile-only" data-open={open ? 'true' : 'false'} aria-hidden={!open}>
      <button
        type="button"
        className="proof-capture-backdrop"
        aria-label={t('closeAria')}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />

      <div role="dialog" aria-label={t('dialogAria')} aria-modal="true" className="proof-capture-sheet">
        <div className="proof-capture-grid">
          {ids.map(id => (
            <button
              key={id}
              type="button"
              className="proof-capture-option"
              onClick={() => {
                onSelect?.(id)
                onClose()
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{CAPTURE_EMOJI[id]}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
                {t(`options.${id}.title`)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.35 }}>
                {t(`options.${id}.subtitle`)}
              </span>
            </button>
          ))}
        </div>

        <Link
          href={customizeHref}
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 14,
            padding: '10px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--fg-2)',
            textDecoration: 'none',
            borderRadius: 'var(--radius-md)',
          }}
        >
          ⚙️ {t('customize')}
        </Link>
      </div>
    </div>
  )
}
