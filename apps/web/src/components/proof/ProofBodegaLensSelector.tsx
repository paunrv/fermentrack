'use client'

import type { ProofBodegaLensAction } from '@/lib/proof/proof-canvas-copy'
import { ProofHubLensSelector } from '@/components/proof/ProofHubLensSelector'

/** Wrapper legacy — siempre hub de bodega. */
export function ProofBodegaLensSelector({
  accent,
  actions,
  disabled,
  onSelect,
  onBack,
  compact,
}: {
  accent: string
  actions: ProofBodegaLensAction[]
  disabled?: boolean
  onSelect: (message: string) => void
  onBack?: () => void
  compact?: boolean
}) {
  return (
    <ProofHubLensSelector
      accent={accent}
      hub="bodega"
      actions={actions}
      disabled={disabled}
      onSelect={onSelect}
      onBack={onBack}
      compact={compact}
    />
  )
}
