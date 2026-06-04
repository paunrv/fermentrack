'use client'

import { useEffect } from 'react'
import { CANVAS_BG } from '@/lib/proof/profile-theme'

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
        background: CANVAS_BG,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          textAlign: 'center',
          background: '#fff',
          border: '0.5px solid #E8E6E0',
          borderRadius: 12,
          padding: '32px 24px',
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>
          Algo falló al cargar el dashboard
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: '#888', lineHeight: 1.5 }}>
          {error.message || 'Error desconocido'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            fontSize: 12,
            padding: '10px 18px',
            borderRadius: 8,
            border: '0.5px solid #E0DDD6',
            background: '#1A1A1A',
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
