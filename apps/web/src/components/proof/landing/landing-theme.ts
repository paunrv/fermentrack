import type { CSSProperties } from 'react'

/** Paleta global del website PROOF (landing). */
export const LANDING = {
  bg: '#FFFFFF',
  bgDark: '#0F0F0F',
  text: '#0F0F0F',
  textSecondary: '#6B6B6B',
  border: '#E5E5E5',
  brand: '#5BA3B8',
  footerLink: 'rgba(255, 255, 255, 0.45)',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255, 255, 255, 0.5)',
} as const

export const LANDING_PROFILE_COLORS = {
  winemaker: '#6940A5',
  brewer: '#CB912F',
  distiller: '#0F7B6C',
  distributor: '#D9730D',
} as const

export const landingBtnPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 20px',
  background: LANDING.bgDark,
  color: LANDING.textOnDark,
  border: `1px solid ${LANDING.bgDark}`,
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
}

export const landingBtnSecondary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 20px',
  background: 'transparent',
  color: LANDING.text,
  border: `1px solid ${LANDING.border}`,
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
}

export const landingBtnLogIn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 14px',
  background: 'transparent',
  color: LANDING.text,
  border: `1px solid ${LANDING.bgDark}`,
  borderRadius: 'var(--radius-sm)',
  fontSize: 12,
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
}
