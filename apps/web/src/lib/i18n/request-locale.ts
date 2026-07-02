import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALES, type AppLocale } from '@/i18n/routing'

export const LOCALE_COOKIE = 'NEXT_LOCALE'

export function parseAppLocale(raw: string | null | undefined): AppLocale {
  if (raw && LOCALES.includes(raw as AppLocale)) return raw as AppLocale
  return DEFAULT_LOCALE
}

export function getLocaleFromRequest(req: NextRequest, bodyLocale?: string | null): AppLocale {
  if (bodyLocale) return parseAppLocale(bodyLocale)
  return parseAppLocale(req.cookies.get(LOCALE_COOKIE)?.value)
}

export async function getRequestAppLocale(): Promise<AppLocale> {
  const store = await cookies()
  return parseAppLocale(store.get(LOCALE_COOKIE)?.value)
}

/** First matching language tag from Accept-Language (middleware parity without path rewrites). */
export function localeFromAcceptLanguage(header: string | null | undefined): AppLocale {
  if (!header) return DEFAULT_LOCALE
  for (const part of header.toLowerCase().split(',')) {
    const tag = part.trim().split(';')[0] ?? ''
    if (tag.startsWith('en')) return 'en-US'
    if (tag.startsWith('es')) return 'es-MX'
  }
  return DEFAULT_LOCALE
}
