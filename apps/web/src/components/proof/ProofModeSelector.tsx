'use client'

import type { ProofModeAction, ProofSubHub } from '@/lib/proof/proof-canvas-copy'

function ModeIcon({ kind, accent }: { kind: 'compra' | 'venta' | 'bodega'; accent: string }) {
  const bg = `color-mix(in srgb, ${accent} 12%, var(--color-background-primary))`
  const color = accent
  const shell = {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: bg,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  } as const

  if (kind === 'compra') {
    return (
      <span style={shell} aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75">
          <path d="M12 3v12M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 21h14" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  if (kind === 'venta') {
    return (
      <span style={shell} aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75">
          <path d="M12 21V9M7 14l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 3h14" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  return (
    <span style={shell} aria-hidden>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75">
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" strokeLinecap="round" />
        <path d="M3 13h18" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function iconForIndex(i: number): 'compra' | 'venta' | 'bodega' {
  if (i === 0) return 'compra'
  if (i === 1) return 'venta'
  return 'bodega'
}

export function ProofModeSelector({
  accent,
  actions,
  disabled,
  onSelect,
  activeSubHub,
}: {
  accent: string
  actions: ProofModeAction[]
  disabled?: boolean
  onSelect: (action: ProofModeAction) => void
  activeSubHub?: ProofSubHub | null
}) {
  if (actions.length === 0) return null

  return (
    <div
      className="proof-mode-selector"
      role="group"
      aria-label="Modos de PROOF"
      style={{ width: '100%' }}
    >
      <style>{`
        .proof-mode-selector__grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }
        @media (max-width: 560px) {
          .proof-mode-selector__grid {
            grid-template-columns: 1fr;
          }
        }
        .proof-mode-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 14px 14px 13px;
          border-radius: 12px;
          border: 0.5px solid var(--color-border-tertiary);
          background: var(--color-background-primary);
          cursor: pointer;
          text-align: left;
          font-family: var(--font-display);
          transition:
            border-color 0.15s ease,
            background 0.15s ease,
            box-shadow 0.15s ease;
        }
        .proof-mode-card:hover:not(:disabled) {
          border-color: color-mix(in srgb, var(--proof-mode-accent) 55%, var(--color-border-tertiary));
          background: color-mix(in srgb, var(--proof-mode-accent) 4%, var(--color-background-primary));
        }
        .proof-mode-card:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--proof-mode-accent) 45%, transparent);
          outline-offset: 2px;
        }
        .proof-mode-card:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .proof-mode-card--active {
          border-color: color-mix(in srgb, var(--proof-mode-accent) 55%, var(--color-border-tertiary));
          background: color-mix(in srgb, var(--proof-mode-accent) 6%, var(--color-background-primary));
        }
      `}</style>
      <div
        className="proof-mode-selector__grid"
        style={{ '--proof-mode-accent': accent } as React.CSSProperties}
      >
        {actions.map((action, i) => (
          <button
            key={action.label}
            type="button"
            className={`proof-mode-card${
              (action.compraHub && activeSubHub === 'compra') ||
              (action.ventaHub && activeSubHub === 'venta') ||
              (action.bodegaHub && activeSubHub === 'bodega')
                ? ' proof-mode-card--active'
                : ''
            }`}
            disabled={disabled}
            onClick={() => onSelect(action)}
          >
            <ModeIcon kind={iconForIndex(i)} accent={accent} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 14,
                  lineHeight: 1.35,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                }}
              >
                {action.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  lineHeight: 1.45,
                  fontWeight: 400,
                  color: 'var(--color-text-tertiary)',
                }}
              >
                {action.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
