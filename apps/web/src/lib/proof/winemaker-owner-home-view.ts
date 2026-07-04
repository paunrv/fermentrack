import type { ShellBreakpoint } from '@/lib/ui/breakpoints'

export type WinemakerOwnerHomeView = 'mobile' | 'desktop'

/** Owner `/dashboard` — desktop pipeline home only at ≥1024 (desktop tier). */
export function resolveWinemakerOwnerHomeView(breakpoint: ShellBreakpoint): WinemakerOwnerHomeView {
  return breakpoint === 'desktop' ? 'desktop' : 'mobile'
}
