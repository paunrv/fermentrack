import type { EstadoSKU } from '@/lib/proof/types'

const BADGE: Record<
  EstadoSKU,
  { bg: string; text: string; border: string; label: string | ((dias?: number) => string) }
> = {
  sano: { bg: '#4CAF7D18', text: '#4CAF7D', border: '#4CAF7D33', label: 'SANO' },
  bajo: { bg: '#EF9F2718', text: '#EF9F27', border: '#EF9F2733', label: 'BAJO' },
  quiebre: { bg: '#E24B4A18', text: '#E24B4A', border: '#E24B4A44', label: 'QUIEBRE' },
  muerto: {
    bg: '#33333344',
    text: '#777777',
    border: '#444444',
    label: (dias = 0) => `${dias} DÍAS`,
  },
  sobrevendido: {
    bg: '#9B8FE018',
    text: '#9B8FE0',
    border: '#9B8FE044',
    label: 'SOBREVENDIDO',
  },
  en_transito: {
    bg: '#378ADD18',
    text: '#6AAAE0',
    border: '#378ADD33',
    label: 'TRÁNSITO',
  },
  consignacion: {
    bg: '#378ADD18',
    text: '#6AAAE0',
    border: '#378ADD33',
    label: 'CONSIGNACIÓN',
  },
}

export function StatusBadge({
  estado,
  diasSinMovimiento,
}: {
  estado: EstadoSKU
  diasSinMovimiento?: number
}) {
  const cfg = BADGE[estado]
  const label =
    typeof cfg.label === 'function' ? cfg.label(diasSinMovimiento) : cfg.label

  return (
    <span
      className="mono"
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.1em',
        background: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        borderRadius: 6,
      }}
    >
      {label}
    </span>
  )
}
