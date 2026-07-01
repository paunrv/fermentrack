import { useLocale } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'

/** BCP 47 tag for Intl APIs and localeCompare */
export function intlLocaleTag(locale: AppLocale): string {
  return locale
}

export function useIntlLocaleTag(): string {
  return intlLocaleTag(useLocale() as AppLocale)
}

export function compareStrings(a: string, b: string, locale: AppLocale): number {
  return a.localeCompare(b, intlLocaleTag(locale))
}
