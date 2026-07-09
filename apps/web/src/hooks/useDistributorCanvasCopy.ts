'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type {
  ProofHubLensAction,
  ProofModeAction,
  ProofSubHub,
} from '@/lib/proof/proof-canvas-copy'
import type { ProofCanvasCopySet } from '@/components/proof/ProofCanvasShell'
import type { ProofHubLensCopy } from '@/hooks/useWinemakerCanvasCopy'

function lensFromMessages(
  t: ReturnType<typeof useTranslations<'distributor.canvas'>>,
  prefix: 'compraLens' | 'ventaLens' | 'bodegaLens',
  ids: string[]
): ProofHubLensAction[] {
  return ids.map(id => ({
    id,
    label: t(`${prefix}.${id}.label` as 'compraLens.nueva.label'),
    description: t(`${prefix}.${id}.description` as 'compraLens.nueva.description'),
    message: t(`${prefix}.${id}.message` as 'compraLens.nueva.message'),
  }))
}

export function useDistributorCanvasCopy() {
  const t = useTranslations('distributor.canvas')

  const copies: ProofCanvasCopySet = useMemo(
    () => ({
      placeholder: t('placeholder'),
      welcome: t('welcome'),
      hint: t('hint'),
      conversationAria: t('conversationAria'),
      modesAria: t('modesAria'),
      sendAria: t('sendAria'),
      suggestedRepliesAria: t('suggestedRepliesAria'),
      resultsAria: t('resultsAria'),
      deleteFailed: t('deleteFailed'),
      analyzing: [t('analyzingShort'), t('analyzingLong')] as const,
      errors: {
        timeout: t('errors.timeout'),
        noResponse: t('errors.noResponse'),
        general: t('errors.general'),
        emptyResults: t('errors.emptyResults'),
      },
    }),
    [t]
  )

  const modeActions: ProofModeAction[] = useMemo(
    () => [
      {
        label: t('modes.compra.label'),
        description: t('modes.compra.description'),
        message: '',
        compraHub: true,
      },
      {
        label: t('modes.venta.label'),
        description: t('modes.venta.description'),
        message: '',
        ventaHub: true,
      },
      {
        label: t('modes.bodega.label'),
        description: t('modes.bodega.description'),
        message: '',
        bodegaHub: true,
      },
    ],
    [t]
  )

  const hubLenses: Partial<Record<ProofSubHub, ProofHubLensAction[]>> = useMemo(
    () => ({
      compra: lensFromMessages(t, 'compraLens', ['nueva', 'en_curso', 'ultima', 'pagar']),
      venta: lensFromMessages(t, 'ventaLens', ['nuevo', 'en_curso', 'cobrar']),
      bodega: lensFromMessages(t, 'bodegaLens', ['fisica', 'ingreso', 'pagar']),
    }),
    [t]
  )

  const hubLensCopy: Partial<Record<ProofSubHub, ProofHubLensCopy>> = useMemo(
    () => ({
      compra: {
        title: t('hubs.compra.title'),
        aria: t('hubs.compra.aria'),
        back: t('hubs.compra.back'),
      },
      venta: {
        title: t('hubs.venta.title'),
        aria: t('hubs.venta.aria'),
        back: t('hubs.venta.back'),
      },
      bodega: {
        title: t('hubs.bodega.title'),
        aria: t('hubs.bodega.aria'),
        back: t('hubs.bodega.back'),
      },
    }),
    [t]
  )

  return { copies, modeActions, hubLenses, hubLensCopy }
}
