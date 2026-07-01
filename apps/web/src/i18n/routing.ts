import { defineRouting } from 'next-intl/routing'

export const LOCALES = ['es-MX', 'en-US'] as const
export type AppLocale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'es-MX'

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  /** Rutas sin prefijo `/en-US` — locale vía cookie + Accept-Language */
  localePrefix: 'never',
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
  },
})
