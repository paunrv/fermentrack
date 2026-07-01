import type { AppLocale } from '@/i18n/routing'

export function formatDate(
  date: Date,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }
): string {
  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function formatNumber(
  value: number,
  locale: AppLocale,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatCurrencyMxn(amount: number, locale: AppLocale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}
