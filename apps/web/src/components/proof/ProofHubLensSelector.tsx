'use client'

import type { ProofHubLensAction, ProofSubHub } from '@/lib/proof/proof-canvas-copy'

function LensIcon({
  id,
  accent,
  hub,
}: {
  id: string
  accent: string
  hub: ProofSubHub
}) {
  const bg = `color-mix(in srgb, ${accent} 12%, var(--color-background-primary))`
  const shell = {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: bg,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  } as const
  const stroke = accent

  if (hub === 'compra') {
    if (id === 'nueva') {
      return (
        <span style={shell} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      )
    }
    if (id === 'en_curso') {
      return (
        <span style={shell} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6M9 16h6" strokeLinecap="round" />
          </svg>
        </span>
      )
    }
    if (id === 'ultima') {
      return (
        <span style={shell} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
            <path d="M12 3v12M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 21h14" strokeLinecap="round" />
          </svg>
        </span>
      )
    }
    return (
      <span style={shell} aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
          <path d="M12 2v20M17 7H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (hub === 'venta') {
    if (id === 'nuevo') {
      return (
        <span style={shell} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      )
    }
    if (id === 'en_curso') {
      return (
        <span style={shell} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6M9 16h4" strokeLinecap="round" />
          </svg>
        </span>
      )
    }
    return (
      <span style={shell} aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
          <path d="M12 21V9M7 14l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 3h14" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (hub === 'wm_ticket') {
    if (id === 'subir') {
      return (
        <span style={shell} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      )
    }
    return (
      <span style={shell} aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (hub === 'wm_bodega') {
    return (
      <span style={shell} aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
          <path d="M8 22h8M12 15v7" strokeLinecap="round" />
          <path d="M7 10c0-4 2.5-7 5-7s5 3 5 7v5H7v-5z" />
        </svg>
      </span>
    )
  }

  if (hub === 'wm_agenda') {
    if (id === 'calendario') {
      return (
        <span style={shell} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
        </span>
      )
    }
    return (
      <span style={shell} aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (id === 'fisica') {
    return (
      <span style={shell} aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  if (id === 'ingreso') {
    return (
      <span style={shell} aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
          <path d="M12 3v12M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 21h14" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  return (
    <span style={shell} aria-hidden>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
        <path d="M12 2v20M17 7H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6" strokeLinecap="round" />
      </svg>
    </span>
  )
}

const HUB_COPY: Record<ProofSubHub, { title: string; aria: string }> = {
  compra: {
    title: 'Compras a proveedor — ¿qué necesitas?',
    aria: 'Acciones de orden de compra',
  },
  venta: {
    title: 'Ventas a cliente — ¿qué necesitas?',
    aria: 'Acciones de pedido de venta',
  },
  bodega: {
    title: 'Estado de bodega — ¿qué quieres revisar?',
    aria: 'Vista de bodega',
  },
  wm_ticket: {
    title: 'Tickets y documentos — ¿qué necesitas?',
    aria: 'Acciones de tickets y gastos',
  },
  wm_bodega: {
    title: 'Tu bodega — ¿qué quieres consultar?',
    aria: 'Consulta de bodega winemaker',
  },
  wm_agenda: {
    title: 'Agenda y tiempos — ¿qué revisamos?',
    aria: 'Agenda de la bodega',
  },
}

export function ProofHubLensSelector({
  accent,
  hub,
  actions,
  disabled,
  onSelect,
  onBack,
  compact,
}: {
  accent: string
  hub: ProofSubHub
  actions: ProofHubLensAction[]
  disabled?: boolean
  onSelect: (action: ProofHubLensAction) => void
  onBack?: () => void
  compact?: boolean
}) {
  if (actions.length === 0) return null

  const copy = HUB_COPY[hub]
  const columns =
    hub === 'compra' || hub === 'wm_ticket' || hub === 'wm_agenda' ? 2 : 3

  return (
    <div
      className="proof-hub-lens-selector"
      role="group"
      aria-label={copy.aria}
      style={{ width: '100%' }}
    >
      <style>{`
        .proof-hub-lens-selector__grid {
          display: grid;
          grid-template-columns: repeat(${columns}, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
        }
        @media (max-width: 560px) {
          .proof-hub-lens-selector__grid {
            grid-template-columns: 1fr;
          }
        }
        .proof-hub-lens-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          width: 100%;
          padding: 12px 12px 11px;
          border-radius: 10px;
          border: 0.5px solid var(--color-border-tertiary);
          background: var(--color-background-primary);
          cursor: pointer;
          text-align: left;
          font-family: var(--font-display);
          transition:
            border-color 0.15s ease,
            background 0.15s ease;
        }
        .proof-hub-lens-card:hover:not(:disabled) {
          border-color: color-mix(in srgb, var(--proof-lens-accent) 55%, var(--color-border-tertiary));
          background: color-mix(in srgb, var(--proof-lens-accent) 4%, var(--color-background-primary));
        }
        .proof-hub-lens-card:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--proof-lens-accent) 45%, transparent);
          outline-offset: 2px;
        }
        .proof-hub-lens-card:disabled {
          opacity: 0.55;
          cursor: default;
        }
      `}</style>

      {!compact ? (
        <p
          style={{
            margin: '0 0 10px',
            fontSize: 13,
            lineHeight: 1.5,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {copy.title}
        </p>
      ) : null}

      <div
        className="proof-hub-lens-selector__grid"
        style={{ '--proof-lens-accent': accent } as React.CSSProperties}
      >
        {actions.map(action => (
          <button
            key={action.id}
            type="button"
            className="proof-hub-lens-card"
            disabled={disabled}
            onClick={() => onSelect(action)}
          >
            <LensIcon id={action.id} accent={accent} hub={hub} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span
                style={{
                  fontSize: compact ? 12 : 13,
                  lineHeight: 1.35,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                }}
              >
                {action.label}
              </span>
              {!compact ? (
                <span
                  style={{
                    fontSize: 11,
                    lineHeight: 1.4,
                    fontWeight: 400,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  {action.description}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      {onBack && !compact ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onBack}
          style={{
            marginTop: 10,
            padding: 0,
            border: 'none',
            background: 'transparent',
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--color-text-tertiary)',
            cursor: disabled ? 'default' : 'pointer',
            fontFamily: 'var(--font-display)',
          }}
        >
          ← Volver a modos
        </button>
      ) : null}
    </div>
  )
}
