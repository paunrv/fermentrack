'use client'

import Link from 'next/link'

export type CaptureOptionId = 'voz' | 'foto' | 'nota' | 'lab'

const CAPTURE_OPTIONS: {
  id: CaptureOptionId
  emoji: string
  title: string
  subtitle: string
}[] = [
  { id: 'voz', emoji: '🎙️', title: 'Voz', subtitle: 'Dicta y PROOF registra' },
  { id: 'foto', emoji: '📷', title: 'Foto', subtitle: 'PROOF analiza y captura' },
  { id: 'nota', emoji: '✍️', title: 'Nota', subtitle: 'Texto libre o bitácora' },
  { id: 'lab', emoji: '🧪', title: 'Lab', subtitle: 'Carga resultados' },
]

export function CapturePanel({
  open,
  onClose,
  onSelect,
  customizeHref = '/dashboard/settings',
}: {
  open: boolean
  onClose: () => void
  onSelect?: (id: CaptureOptionId) => void
  customizeHref?: string
}) {
  return (
    <div className="proof-capture-panel-root proof-mobile-only" data-open={open ? 'true' : 'false'} aria-hidden={!open}>
      <button type="button" className="proof-capture-backdrop" aria-label="Cerrar panel de captura" onClick={onClose} tabIndex={open ? 0 : -1} />

      <div role="dialog" aria-label="Capturar" aria-modal="true" className="proof-capture-sheet">
        <div className="proof-capture-grid">
          {CAPTURE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              className="proof-capture-option"
              onClick={() => {
                onSelect?.(opt.id)
                onClose()
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{opt.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>{opt.title}</span>
              <span style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.35 }}>{opt.subtitle}</span>
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
          ⚙️ Personalizar mis accesos rápidos
        </Link>
      </div>
    </div>
  )
}
