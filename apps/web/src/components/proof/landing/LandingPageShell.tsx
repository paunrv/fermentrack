'use client'

import type { CSSProperties, ReactNode } from 'react'
import { LandingNav } from './LandingNav'
import { LandingFooter } from './LandingFooter'
import { LANDING } from './landing-theme'

export function LandingPageShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={
        {
          minHeight: '100vh',
          background: LANDING.bg,
          color: LANDING.text,
          ['--proof-brand']: LANDING.brand,
        } as CSSProperties
      }
    >
      <LandingNav />
      <main>{children}</main>
      <LandingFooter />
    </div>
  )
}
