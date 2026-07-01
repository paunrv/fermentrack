'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  createWinemakerTicketCopy,
  type WinemakerTicketCopy,
} from '@/lib/proof/winemaker-ticket-copy'

export function useWinemakerTicketCopy(): WinemakerTicketCopy {
  const t = useTranslations('winemaker.ticketOcr')
  return useMemo(() => createWinemakerTicketCopy(t), [t])
}
