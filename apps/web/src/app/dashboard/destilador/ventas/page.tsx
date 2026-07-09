'use client'

export const dynamic = 'force-dynamic'

import { useTranslations } from 'next-intl'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import { VuOpsPage } from '@/components/proof/VuOpsPage'

export default function DestiladorVentasPage() {
  const t = useTranslations('distiller.ventas')
  const { loading, ok } = useDestiladorScope()

  if (loading || !ok) {
    return (
      <VuOpsPage title={t('title')}>
        <DestiladorSkeleton />
      </VuOpsPage>
    )
  }

  return (
    <VuOpsPage title={t('title')}>
      <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 14 }}>{t('placeholder')}</p>
    </VuOpsPage>
  )
}
