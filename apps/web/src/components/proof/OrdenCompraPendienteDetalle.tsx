'use client'

import { OrdenCompraDocumentCard } from '@/components/proof/OrdenCompraDocumentCard'

export function OrdenCompraPendienteDetalle({
  ordenId,
  accent,
  onClose,
  onRecibido,
}: {
  ordenId: string
  accent: string
  onClose: () => void
  onRecibido: () => void
}) {
  return (
    <OrdenCompraDocumentCard
      ordenId={ordenId}
      accent={accent}
      onClose={onClose}
      onUpdated={onRecibido}
    />
  )
}
