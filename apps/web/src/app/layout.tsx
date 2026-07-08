import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import '@fermentrack/ui/styles.css'
import './globals.css'
import { Providers } from './providers'
import { getSiteUrl } from '@/lib/i18n/site'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.site')
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: t('title'),
      template: '%s | PROOF',
    },
    description: t('description'),
    icons: {
      icon: '/favicon.ico',
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
