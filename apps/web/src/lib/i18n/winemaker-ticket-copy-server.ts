import { createTranslator } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { AppLocale } from '@/i18n/routing'
import {
  createWinemakerTicketCopy,
  type WinemakerTicketCopy,
} from '@/lib/proof/winemaker-ticket-copy'

export async function getWinemakerTicketCopyForLocale(
  locale: AppLocale
): Promise<WinemakerTicketCopy> {
  const messages = (await import(`../../../messages/${locale}.json`)).default
  const t = createTranslator({ locale, messages, namespace: 'winemaker.ticketOcr' })
  return createWinemakerTicketCopy(t)
}

export async function getWinemakerTicketCopy(): Promise<WinemakerTicketCopy> {
  const t = await getTranslations('winemaker.ticketOcr')
  return createWinemakerTicketCopy(t)
}
