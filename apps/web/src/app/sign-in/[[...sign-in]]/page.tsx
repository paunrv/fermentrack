import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AuthLocaleBar } from '@/components/auth/AuthLocaleBar'
import { SignInForm } from '@/components/auth/SignInForm'
import { createPublicPageMetadata } from '@/lib/i18n/metadata'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { createClient } from '@/lib/supabase/server'

type SignInPageProps = {
  searchParams?: { mode?: string; next?: string }
}

export async function generateMetadata({ searchParams }: SignInPageProps): Promise<Metadata> {
  const isSignUp = searchParams?.mode === 'signup'
  const t = await getTranslations(isSignUp ? 'auth.signUp.meta' : 'auth.signIn.meta')
  return createPublicPageMetadata({
    pathname: '/sign-in',
    title: t('title'),
    description: t('description'),
    noIndex: true,
  })
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const next = safeNextPath(searchParams?.next ?? null, '/dashboard')
    redirect(next)
  }

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
