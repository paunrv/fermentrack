'use client'

import { LandingLocaleToggle } from '@/components/proof/landing/LandingLocaleToggle'

type Props = {
  children: React.ReactNode
  variant?: 'light' | 'dark'
}

/** Locale switcher fixed top-right on auth / onboarding shells */
export function AuthLocaleBar({ children, variant = 'dark' }: Props) {
  return (
    <>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50 }}>
        <LandingLocaleToggle variant={variant} />
      </div>
      {children}
    </>
  )
}
