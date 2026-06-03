'use client'

export const dynamic = 'force-dynamic'

import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { DestiladorSkeleton } from '@/components/destilador/PipelineHeader'

export default function DestiladorVentasPage() {
  const { loading, ok } = useDestiladorScope()

  if (loading || !ok) {
    return (
      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
        <DestiladorSkeleton />
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 12px', fontSize: 26, fontWeight: 700 }}>Ventas</h1>
      <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>
        Pedidos, por cobrar y entrega con escaneo de cajas — siguiente iteración.
      </p>
    </div>
  )
}
