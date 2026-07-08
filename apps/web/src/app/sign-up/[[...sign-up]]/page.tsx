import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
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

type SignUpPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = new URLSearchParams()
  params.set('mode', 'signup')

  const email = searchParams?.email
  if (typeof email === 'string' && email.trim()) params.set('email', email.trim())

  const next = searchParams?.next
  if (typeof next === 'string' && next.startsWith('/')) params.set('next', next)

  redirect(`/sign-in?${params.toString()}`)
}
