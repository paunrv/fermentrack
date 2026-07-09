'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type {
  ProofHubLensAction,
  ProofModeAction,
  ProofSubHub,
} from '@/lib/proof/proof-canvas-copy'
import type { ProofQuickAction } from '@/components/proof/ProofComposer'
import type { ProofCanvasCopySet } from '@/components/proof/ProofCanvasShell'

export type ProofHubLensCopy = {
  title: string
  aria: string
  back: string
}

function lensFromMessages(
  t: ReturnType<typeof useTranslations<'winemaker.canvas'>>,
  prefix: 'ticketLens' | 'bodegaLens' | 'agendaLens',
  ids: string[],
  extras?: Partial<Record<string, Partial<ProofHubLensAction>>>
): ProofHubLensAction[] {
  return ids.map(id => ({
    id,
    label: t(`${prefix}.${id}.label` as 'ticketLens.subir.label'),
    description: t(`${prefix}.${id}.description` as 'ticketLens.subir.description'),
    message: t(`${prefix}.${id}.message` as 'ticketLens.subir.message'),
    ...extras?.[id],
  }))
}

export function useWinemakerCanvasCopy() {
  const t = useTranslations('winemaker.canvas')

  const copies: ProofCanvasCopySet = useMemo(
    () => ({
      placeholder: t('placeholder'),
      welcome: t('welcome'),
      hint: t('hint'),
      conversationAria: t('conversationAria'),
      workspaceAria: t('workspaceAria'),
      modesAria: t('modesAria'),
      sendAria: t('sendAria'),
      suggestedRepliesAria: t('suggestedRepliesAria'),
      resultsAria: t('resultsAria'),
      deleteFailed: t('deleteFailed'),
      analyzing: [t('analyzingShort'), t('analyzingLong')] as const,
      ticketUploaded: (fileName: string) => t('ticketUploaded', { fileName }),
      ticketUploadFailed: t('ticketUploadFailed'),
      ticketFallbackPrompt: t('ticketFallbackPrompt'),
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
        label: t('modes.ticket.label'),
        description: t('modes.ticket.description'),
        message: '',
        ticketHub: true,
      },
      {
        label: t('modes.bodega.label'),
        description: t('modes.bodega.description'),
        message: '',
        wmBodegaHub: true,
      },
      {
        label: t('modes.agenda.label'),
        description: t('modes.agenda.description'),
        message: '',
        agendaHub: true,
      },
    ],
    [t]
  )

  const hubLenses: Partial<Record<ProofSubHub, ProofHubLensAction[]>> = useMemo(
    () => ({
      wm_ticket: lensFromMessages(t, 'ticketLens', ['subir', 'recientes', 'sin_lote', 'manual'], {
        subir: { pickTicketFile: true },
      }),
      wm_bodega: lensFromMessages(t, 'bodegaLens', ['activos', 'litros', 'gastos_mes', 'resumen']),
      wm_agenda: lensFromMessages(t, 'agendaLens', ['semana', 'barrica', 'embotellar', 'calendario'], {
        calendario: { href: '/dashboard/winemaker/agenda' },
      }),
    }),
    [t]
  )

  const hubLensCopy: Partial<Record<ProofSubHub, ProofHubLensCopy>> = useMemo(
    () => ({
      wm_ticket: {
        title: t('hubs.wm_ticket.title'),
        aria: t('hubs.wm_ticket.aria'),
        back: t('hubs.wm_ticket.back'),
      },
      wm_bodega: {
        title: t('hubs.wm_bodega.title'),
        aria: t('hubs.wm_bodega.aria'),
        back: t('hubs.wm_bodega.back'),
      },
      wm_agenda: {
        title: t('hubs.wm_agenda.title'),
        aria: t('hubs.wm_agenda.aria'),
        back: t('hubs.wm_agenda.back'),
      },
    }),
    [t]
  )

  const quickActions: ProofQuickAction[] = useMemo(
    () =>
      (['resumen', 'gastos', 'documentos', 'lotes'] as const).map(id => ({
        label: t(`quickActions.${id}.label`),
        message: t(`quickActions.${id}.message`),
      })),
    [t]
  )

  return { copies, modeActions, hubLenses, hubLensCopy, quickActions }
}
