import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AuthLocaleBar } from '@/components/auth/AuthLocaleBar'
import { createPublicPageMetadata } from '@/lib/i18n/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signUp.meta')
  return createPublicPageMetadata({
    pathname: '/sign-up',
    title: t('title'),
    description: t('description'),
    noIndex: true,
  })
}

export default async function SignUpPage() {
  const t = await getTranslations('auth.signUp')

  return (
    <AuthLocaleBar>
      <main
        style={{
          minHeight: '100vh',
          background: 'var(--ink)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: 'var(--fg-2)',
          fontSize: 14,
          fontFamily: 'var(--font-display)',
          padding: 24,
        }}
      >
        <p style={{ margin: 0 }}>{t('placeholder')}</p>
        <Link href="/sign-in" style={{ color: 'var(--copper)', textDecoration: 'none', fontSize: 13 }}>
          {t('backToSignIn')}
        </Link>
      </main>
    </AuthLocaleBar>
  )
}
