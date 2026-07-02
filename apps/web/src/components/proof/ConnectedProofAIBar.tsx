'use client'

import { useTranslations } from 'next-intl'
import { ProofAIBar } from './ProofAIBar'

/**
 * @deprecated Hosted LLM context bar — use external MCP agents via the connection hub.
 * Kept as a compact CTA on operational pages.
 */
export function ConnectedProofAIBar({
  fallback,
}: {
  pantalla?: string
  vista?: string
  profileType?: string
  hints?: unknown
  enabled?: boolean
  fallback?: { mensaje: string; accionLabel?: string; accionHref?: string }
  onActionClick?: () => void
}) {
  const t = useTranslations('connectionHub')

  return (
    <ProofAIBar
      message={fallback?.mensaje ?? t('bar.message')}
      actionLabel={fallback?.accionLabel ?? t('bar.action')}
      actionHref={fallback?.accionHref ?? '/dashboard'}
    />
  )
}
