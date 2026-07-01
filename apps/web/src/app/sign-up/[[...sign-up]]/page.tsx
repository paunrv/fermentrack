import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AuthLocaleBar } from '@/components/auth/AuthLocaleBar'

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
