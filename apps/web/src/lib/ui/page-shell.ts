import type { CSSProperties } from 'react'
import type { ShellBreakpoint } from '@/lib/ui/breakpoints'

function resolveBreakpoint(opts?: {
  breakpoint?: ShellBreakpoint
  isMobile?: boolean
}): ShellBreakpoint {
  if (opts?.breakpoint) return opts.breakpoint
  return opts?.isMobile ? 'mobile' : 'desktop'
}

/** Standard page padding; extra bottom on mobile for optional AI bar (tab bar handled by layout). */
export function pagePadding(opts?: {
  withAiBar?: boolean
  breakpoint?: ShellBreakpoint
  /** @deprecated use breakpoint */
  isMobile?: boolean
}): CSSProperties {
  const bp = resolveBreakpoint(opts)
  const bottom = opts?.withAiBar
    ? bp === 'mobile'
      ? 88
      : bp === 'tablet'
        ? 92
        : 100
    : bp === 'mobile'
      ? 8
      : bp === 'tablet'
        ? 32
        : 48

  const horizontal = bp === 'mobile' ? 16 : bp === 'tablet' ? 20 : 28
  const top = bp === 'mobile' ? 16 : bp === 'tablet' ? 22 : 28

  return {
    padding: `${top}px ${horizontal}px ${bottom}px`,
    maxWidth: bp === 'tablet' ? 880 : 960,
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  }
}

export const MOBILE_PAGE_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 12,
}

export const DESKTOP_FORM_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 12,
}

/** Subpáginas del dashboard — padding tiered; opcional espacio para bottom nav winemaker. */
export function dashboardPageShell(
  breakpoint: ShellBreakpoint,
  options?: { withBottomNav?: boolean; maxWidth?: number }
): CSSProperties {
  const horizontal = breakpoint === 'mobile' ? 16 : breakpoint === 'tablet' ? 20 : 28
  const top = breakpoint === 'mobile' ? 16 : breakpoint === 'tablet' ? 22 : 24
  const bottom =
    options?.withBottomNav && breakpoint === 'mobile'
      ? 'calc(16px + var(--proof-bottom-nav))'
      : breakpoint === 'mobile'
        ? 16
        : breakpoint === 'tablet'
          ? 32
          : 48

  const maxWidth = breakpoint === 'mobile' ? undefined : (options?.maxWidth ?? 960)

  return {
    width: '100%',
    maxWidth,
    margin: maxWidth ? '0 auto' : undefined,
    boxSizing: 'border-box',
    minWidth: 0,
    padding: `${top}px ${horizontal}px ${bottom}`,
  }
}
