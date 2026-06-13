'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard/error]', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          textAlign: 'center',
          background: 'var(--ink)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '32px 24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--fg-0)', fontWeight: 500 }}>
          Algo falló al cargar el dashboard
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
          {error.message || 'Error desconocido'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            fontSize: 14,
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--fg-0)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
