import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { AuthLocaleBar } from '@/components/auth/AuthLocaleBar'
import { SignInForm } from '@/components/auth/SignInForm'
import { createPublicPageMetadata } from '@/lib/i18n/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signIn.meta')
  return createPublicPageMetadata({
    pathname: '/sign-in',
    title: t('title'),
    description: t('description'),
    noIndex: true,
  })
}

export default function SignInPage() {
  return (
    <AuthLocaleBar>
      <main
        style={{
          minHeight: '100vh',
          background: 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'var(--font-display)',
        }}
      >
        <SignInForm />
      </main>
    </AuthLocaleBar>
  )
}
