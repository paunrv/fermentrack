'use client'

import type { ReactNode } from 'react'
import { ContentCard, PageFrame, PageHeader } from '@fermentrack/ui'

/**
 * Standard VU layout for ops pages (Fase 4 distributor · Fase 5 winemaker).
 * Title outside the card; primary work surface inside ContentCard.
 * Callers that share a mobile shell should branch on `breakpoint === 'mobile'`
 * and keep the prior padding / bottom-nav layout unchanged.
 */
export function VuOpsPage({
  title,
  description,
  actions,
  children,
  footer,
  narrow = false,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Narrow column (~640px), e.g. agenda. */
  narrow?: boolean
}) {
  return (
    <PageFrame narrow={narrow} style={{ overflow: 'auto' }}>
      <PageHeader title={title} description={description} actions={actions} />
      <ContentCard>{children}</ContentCard>
      {footer}
    </PageFrame>
  )
}
