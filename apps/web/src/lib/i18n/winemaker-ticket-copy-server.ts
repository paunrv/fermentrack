import { getTranslations } from 'next-intl/server'
import {
  createWinemakerTicketCopy,
  type WinemakerTicketCopy,
} from '@/lib/proof/winemaker-ticket-copy'

export async function getWinemakerTicketCopy(): Promise<WinemakerTicketCopy> {
  const t = await getTranslations('winemaker.ticketOcr')
  return createWinemakerTicketCopy(t)
}
