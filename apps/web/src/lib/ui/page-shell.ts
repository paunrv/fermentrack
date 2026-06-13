import type { CSSProperties } from 'react'

/** Standard page padding; extra bottom on mobile for optional AI bar (tab bar handled by layout). */
export function pagePadding(opts?: {
  withAiBar?: boolean
  isMobile?: boolean
}): CSSProperties {
  const bottom = opts?.withAiBar ? (opts?.isMobile ? 88 : 100) : opts?.isMobile ? 8 : 48

  return {
    padding: opts?.isMobile ? `16px 16px ${bottom}px` : `28px 28px ${bottom}px`,
    maxWidth: 960,
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
