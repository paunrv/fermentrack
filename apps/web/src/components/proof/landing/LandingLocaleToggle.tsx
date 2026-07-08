'use client'

import { LocaleToggle } from '@/components/i18n/LocaleToggle'

type Variant = 'light' | 'dark'

export function LandingLocaleToggle({ variant = 'light' }: { variant?: Variant }) {
  return <LocaleToggle variant={variant === 'dark' ? 'landing-dark' : 'landing-light'} />
}
