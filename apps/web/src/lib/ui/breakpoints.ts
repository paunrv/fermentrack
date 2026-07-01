/** Matches globals.css and useBreakpoint — shell layout tiers. */
export const MOBILE_MAX = 767
export const TABLET_MAX = 1023

export type ShellBreakpoint = 'mobile' | 'tablet' | 'desktop'

export function resolveShellBreakpoint(width: number): ShellBreakpoint {
  if (width <= MOBILE_MAX) return 'mobile'
  if (width <= TABLET_MAX) return 'tablet'
  return 'desktop'
}

export function pageTitleFontSize(breakpoint: ShellBreakpoint): number {
  switch (breakpoint) {
    case 'mobile':
      return 22
    case 'tablet':
      return 24
    default:
      return 28
  }
}
