'use client'

import { useEffect, useState } from 'react'
import {
  MOBILE_MAX,
  TABLET_MAX,
  resolveShellBreakpoint,
  type ShellBreakpoint,
} from '@/lib/ui/breakpoints'

export { MOBILE_MAX, TABLET_MAX }
export type Breakpoint = ShellBreakpoint

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop')

  useEffect(() => {
    const mqMobile = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
    const mqTablet = window.matchMedia(`(max-width: ${TABLET_MAX}px)`)

    const sync = () => setBp(resolveShellBreakpoint(window.innerWidth))

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

export function useIsTablet(): boolean {
  return useBreakpoint() === 'tablet'
}

export function useIsDesktop(): boolean {
  return useBreakpoint() === 'desktop'
}
