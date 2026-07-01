import type { CSSProperties } from 'react'
import { LANDING } from './landing-theme'

export const landingEyebrowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 24,
}

export const landingEyebrowTextStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  fontWeight: 500,
  color: LANDING.brand,
  letterSpacing: '0.02em',
}

export const landingEyebrowDotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: LANDING.brand,
  flexShrink: 0,
  boxShadow: `0 0 0 3px color-mix(in srgb, ${LANDING.brand} 25%, transparent)`,
}

export const landingSectionH2Style: CSSProperties = {
  margin: '0 0 20px',
  fontSize: 'clamp(26px, 3.5vw, 36px)',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  lineHeight: 1.15,
  color: LANDING.text,
}

export const landingBodyStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.7,
  color: LANDING.textSecondary,
  maxWidth: 640,
}
