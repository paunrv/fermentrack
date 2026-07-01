import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher'
import { formatCurrencyMxn, formatDate } from '@/lib/i18n/format'
import type { AppLocale } from '@/i18n/routing'

export default async function I18nPilotPage() {
  const locale = (await getLocale()) as AppLocale
  const t = await getTranslations('common.pilot')
  const today = new Date()
  const samplePrice = 1299

  return (
    <main
      style={{
        maxWidth: 560,
        margin: '48px auto',
        padding: '0 24px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>{t('title')}</h1>
      <p style={{ marginBottom: 24, color: '#444' }}>{t('greeting')}</p>

      <LocaleSwitcher className="mb-6" />

      <ul style={{ lineHeight: 1.8, marginTop: 24, paddingLeft: 20 }}>
        <li>{t('today', { date: formatDate(today, locale) })}</li>
        <li>{t('price', { price: formatCurrencyMxn(samplePrice, locale) })}</li>
        <li>
          <code>NEXT_LOCALE</code> = {locale}
        </li>
      </ul>

      <p style={{ marginTop: 32 }}>
        <Link href="/">{t('backHome')}</Link>
      </p>
    </main>
  )
}
