'use client'

import { useEffect, useState } from 'react'

/** Matches globals.css — mobile-first shell */
export const MOBILE_MAX = 767
export const TABLET_MAX = 1023

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

function resolveBreakpoint(width: number): Breakpoint {
  if (width <= MOBILE_MAX) return 'mobile'
  if (width <= TABLET_MAX) return 'tablet'
  return 'desktop'
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window !== 'undefined' ? resolveBreakpoint(window.innerWidth) : 'desktop'
  )

  useEffect(() => {
    const mqMobile = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
    const mqTablet = window.matchMedia(`(max-width: ${TABLET_MAX}px)`)

    const sync = () => setBp(resolveBreakpoint(window.innerWidth))

    sync()
    mqMobile.addEventListener('change', sync)
    mqTablet.addEventListener('change', sync)
    return () => {
      mqMobile.removeEventListener('change', sync)
      mqTablet.removeEventListener('change', sync)
    }
  }, [])

  return bp
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile'
}
