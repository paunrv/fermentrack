import Link from 'next/link'
import { LANDING } from './landing-theme'

export function ProofLogoWordmark({
  size = 'md',
  variant = 'light',
}: {
  size?: 'sm' | 'md'
  variant?: 'light' | 'dark'
}) {
  const fontSize = size === 'sm' ? 14 : 16
  const textColor = variant === 'dark' ? LANDING.textOnDark : LANDING.text
  return (
    <span
      style={{
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontSize,
        color: textColor,
        fontFamily: 'var(--font-display)',
      }}
    >
      PR
      <span style={{ color: LANDING.brand }}>O</span>
      OF
    </span>
  )
}

export function ProofLogo() {
  return (
    <Link
      href="/"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        textDecoration: 'none',
      }}
    >
      <ProofLogoWordmark />
    </Link>
  )
}
