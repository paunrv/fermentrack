import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALES, type AppLocale } from '@/i18n/routing'

const LOCALE_COOKIE = 'NEXT_LOCALE'

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
