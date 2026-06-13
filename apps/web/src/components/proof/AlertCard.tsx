import Link from 'next/link'
import type { AlertaOperativa } from '@/lib/proof/types'

const BORDER: Record<AlertaOperativa['color'], string> = {
  rojo: 'var(--crit)',
  amarillo: 'var(--warn)',
  pasivo: 'var(--fg-4)',
  verde: 'var(--ok)',
}

const BG: Record<AlertaOperativa['color'], string> = {
  rojo: 'var(--crit-soft)',
  amarillo: 'var(--warn-soft)',
  pasivo: 'var(--panel-2)',
  verde: 'var(--ok-soft)',
}

export function AlertCard({ alerta, fullWidth }: { alerta: AlertaOperativa; fullWidth?: boolean }) {
  return (
    <article
      style={{
        borderLeft: `2px solid ${BORDER[alerta.color]}`,
        background: BG[alerta.color],
        padding: '14px 16px',
        borderRadius: 10,
        display: 'flex',
        flexDirection: fullWidth ? 'column' : 'row',
        alignItems: fullWidth ? 'stretch' : 'center',
        gap: fullWidth ? 12 : 14,
        width: fullWidth ? '100%' : undefined,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--fg-0)',
            letterSpacing: '-0.01em',
            marginBottom: 4,
          }}
        >
          {alerta.titulo}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>
          {alerta.subtexto}
        </div>
      </div>
      {alerta.acciones && alerta.acciones.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
          {alerta.acciones.map(a => {
            const style: React.CSSProperties = {
              fontSize: 11,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--panel)',
              color: 'var(--fg-0)',
              textDecoration: 'none',
              cursor: 'pointer',
            }
            if (a.href) {
              return (
                <Link key={a.label} href={a.href} style={style}>
                  {a.label}
                </Link>
              )
            }
            return (
              <button key={a.label} type="button" onClick={a.onClick} style={style}>
                {a.label}
              </button>
            )
          })}
        </div>
      )}
    </article>
  )
}
