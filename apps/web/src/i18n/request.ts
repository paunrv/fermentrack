import { headers, cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import {
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  parseAppLocale,
} from '@/lib/i18n/request-locale'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = fromCookie
    ? parseAppLocale(fromCookie)
    : localeFromAcceptLanguage((await headers()).get('accept-language'))

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
