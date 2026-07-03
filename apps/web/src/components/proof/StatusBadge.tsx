'use client'

import { Badge, type BadgeVariant } from '@fermentrack/ui'
import { useTranslations } from 'next-intl'
import type { EstadoSKU } from '@/lib/proof/types'

const VARIANT_BY_ESTADO: Record<EstadoSKU, BadgeVariant> = {
  sano: 'success',
  bajo: 'warning',
  quiebre: 'error',
  muerto: 'default',
  sobrevendido: 'info',
  en_transito: 'info',
  consignacion: 'info',
}

export function StatusBadge({
  estado,
  diasSinMovimiento,
}: {
  estado: EstadoSKU
  diasSinMovimiento?: number
}) {
  const t = useTranslations('distributor.skuStatus')
  const label =
    estado === 'muerto'
      ? t('muerto', { days: diasSinMovimiento ?? 0 })
      : t(estado)

  return (
    <Badge variant={VARIANT_BY_ESTADO[estado]} className="mono" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
      {label}
    </Badge>
  )
}
