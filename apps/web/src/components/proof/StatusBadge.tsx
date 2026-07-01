'use client'

import { useTranslations } from 'next-intl'
import type { EstadoSKU } from '@/lib/proof/types'

const BADGE_STYLE: Record<
  EstadoSKU,
  { bg: string; text: string; border: string }
> = {
  sano: { bg: '#4CAF7D18', text: '#4CAF7D', border: '#4CAF7D33' },
  bajo: { bg: '#EF9F2718', text: '#EF9F27', border: '#EF9F2733' },
  quiebre: { bg: '#E24B4A18', text: '#E24B4A', border: '#E24B4A44' },
  muerto: { bg: '#33333344', text: '#777777', border: '#444444' },
  sobrevendido: { bg: '#9B8FE018', text: '#9B8FE0', border: '#9B8FE044' },
  en_transito: { bg: '#378ADD18', text: '#6AAAE0', border: '#378ADD33' },
  consignacion: { bg: '#378ADD18', text: '#6AAAE0', border: '#378ADD33' },
}

export function StatusBadge({
  estado,
  diasSinMovimiento,
}: {
  estado: EstadoSKU
  diasSinMovimiento?: number
}) {
  const t = useTranslations('distributor.skuStatus')
  const cfg = BADGE_STYLE[estado]
  const label =
    estado === 'muerto'
      ? t('muerto', { days: diasSinMovimiento ?? 0 })
      : t(estado)

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
