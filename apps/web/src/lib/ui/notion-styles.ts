import type { CSSProperties } from 'react'

/** Shared Notion-like styling — use across legacy and form pages */
export const font = 'var(--font-display)'

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--fg-2)',
  marginBottom: 6,
}

export const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--ink)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 10px',
  fontSize: 14,
  color: 'var(--fg-0)',
  outline: 'none',
  fontFamily: font,
}

export const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--ink)',
  color: 'var(--fg-0)',
  fontFamily: font,
}

export const cardStyle: CSSProperties = {
  background: 'var(--ink)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-md)',
  padding: 24,
}

export const sectionTitle: CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: 'var(--fg-0)',
  letterSpacing: '-0.02em',
  margin: 0,
}

export const btnPrimary: CSSProperties = {
  background: 'var(--fg-0)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: font,
}

export const btnSecondary: CSSProperties = {
  background: 'var(--ink)',
  color: 'var(--fg-0)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: font,
}

export const tableBorder: CSSProperties = {
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
}
