import type { WmTicketVisionStatus } from '@/lib/proof/winemaker-ticket-vision'

export type ProofSuggestedReply = {
  label: string
  message: string
}

export type WinemakerTicketCopy = {
  allocationReplies: ProofSuggestedReply[]
  detectPhrases: { lot: string; winery: string }
  successQuestion: string
  upload: {
    skippedPdf: (p: { filename: string; total: string }) => string
    skippedPdfAgent: (p: { filename: string }) => string
    noApiKey: (p: { filename: string }) => string
    noApiKeyAgent: (p: { filename: string }) => string
    visionFailed: (p: { filename: string }) => string
    visionFailedAgent: (p: { filename: string }) => string
    skippedNotImage: (p: { filename: string }) => string
    skippedNotImageAgent: (p: { filename: string }) => string
    unclassified: (p: { filename: string }) => string
    unclassifiedAgent: (p: { filename: string }) => string
    success: (p: {
      filename: string
      vendor: string
      summary: string
      total: string
      question: string
    }) => string
    successAgent: (p: { vendor: string; summary: string }) => string
    unnamedVendor: string
  }
}

type TicketTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string

export function createWinemakerTicketCopy(t: TicketTranslate): WinemakerTicketCopy {
  const successQuestion = t('upload.successQuestion')

  return {
    allocationReplies: [
      {
        label: t('allocationReplies.winery.label'),
        message: t('allocationReplies.winery.message'),
      },
      {
        label: t('allocationReplies.lot.label'),
        message: t('allocationReplies.lot.message'),
      },
    ],
    detectPhrases: {
      lot: t('allocationDetect.lotPhrase'),
      winery: t('allocationDetect.wineryPhrase'),
    },
    successQuestion,
    upload: {
      skippedPdf: p => t('upload.skippedPdf', p),
      skippedPdfAgent: p => t('upload.skippedPdfAgent', p),
      noApiKey: p => t('upload.noApiKey', p),
      noApiKeyAgent: p => t('upload.noApiKeyAgent', p),
      visionFailed: p => t('upload.visionFailed', p),
      visionFailedAgent: p => t('upload.visionFailedAgent', p),
      skippedNotImage: p => t('upload.skippedNotImage', p),
      skippedNotImageAgent: p => t('upload.skippedNotImageAgent', p),
      unclassified: p => t('upload.unclassified', p),
      unclassifiedAgent: p => t('upload.unclassifiedAgent', p),
      success: p => t('upload.success', p),
      successAgent: p => t('upload.successAgent', p),
      unnamedVendor: t('upload.unnamedVendor'),
    },
  }
}

function normDetectText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function inferTicketAllocationReplies(
  content: string,
  copy: WinemakerTicketCopy
): ProofSuggestedReply[] | undefined {
  const t = normDetectText(content)
  const lot = normDetectText(copy.detectPhrases.lot)
  const winery = normDetectText(copy.detectPhrases.winery)
  if (t.includes(lot) && t.includes(winery)) {
    return copy.allocationReplies
  }
  return undefined
}

export function buildTicketUploadMessage(
  input: {
    filename: string
    contentType: string
    visionStatus: WmTicketVisionStatus
    classified: boolean
    supplierName: string | null
    summaryLabel: string
    total?: string
  },
  copy: WinemakerTicketCopy
): { mensaje: string; agentQuery: string; suggestedReplies?: ProofSuggestedReply[] } {
  const { filename, contentType, visionStatus, classified, supplierName, summaryLabel, total = '' } =
    input
  const u = copy.upload

  if (visionStatus === 'skipped_pdf' || contentType === 'application/pdf') {
    return {
      mensaje: u.skippedPdf({ filename, total }),
      agentQuery: u.skippedPdfAgent({ filename }),
    }
  }

  if (visionStatus === 'no_api_key') {
    return {
      mensaje: u.noApiKey({ filename }),
      agentQuery: u.noApiKeyAgent({ filename }),
    }
  }

  if (visionStatus === 'api_error' || visionStatus === 'parse_error') {
    return {
      mensaje: u.visionFailed({ filename }),
      agentQuery: u.visionFailedAgent({ filename }),
    }
  }

  if (visionStatus === 'skipped_not_image') {
    return {
      mensaje: u.skippedNotImage({ filename }),
      agentQuery: u.skippedNotImageAgent({ filename }),
    }
  }

  if (!classified) {
    return {
      mensaje: u.unclassified({ filename }),
      agentQuery: u.unclassifiedAgent({ filename }),
    }
  }

  const vendor = supplierName?.trim() || u.unnamedVendor
  const summary = summaryLabel ? ` — ${summaryLabel}` : ''

  return {
    mensaje: u.success({
      filename,
      vendor,
      summary,
      total,
      question: copy.successQuestion,
    }),
    agentQuery: u.successAgent({ vendor, summary: summaryLabel }),
    suggestedReplies: copy.allocationReplies,
  }
}
