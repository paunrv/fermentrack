'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  generarRemisionPedidoAction,
  obtenerRemisionPedidoAction,
} from '@/app/actions/remisiones-distribuidor'

type RemisionState = {
  numero: string
  hasPdf: boolean
  downloadUrl: string | null
} | null

export function RemisionPedidoActions({
  pedidoId,
  estado,
  initialRemision,
}: {
  pedidoId: string
  estado: string
  initialRemision?: RemisionState
}) {
  const t = useTranslations('distributor.remisiones.actions')
  const [remision, setRemision] = useState<RemisionState>(initialRemision ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (estado !== 'entregado') return null

  async function handleGenerar() {
    setLoading(true)
    setError(null)
    try {
      const result = await generarRemisionPedidoAction(pedidoId)
      setRemision({
        numero: result.numero,
        hasPdf: true,
        downloadUrl: result.downloadUrl,
      })
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.generateFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    setLoading(true)
    setError(null)
    try {
      const row = await obtenerRemisionPedidoAction(pedidoId)
      if (!row?.downloadUrl) {
        await handleGenerar()
        return
      }
      setRemision({
        numero: row.numero,
        hasPdf: row.hasPdf,
        downloadUrl: row.downloadUrl,
      })
      window.open(row.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const btnStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '10px 16px',
    borderRadius: 8,
    border: '0.5px solid var(--hairline)',
    background: 'var(--surface-card)',
    color: 'var(--fg-0)',
    cursor: loading ? 'wait' : 'pointer',
    fontWeight: 500,
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'monospace', marginBottom: 8 }}>
        {t('eyebrow')}
      </div>
      {remision?.hasPdf && remision.downloadUrl ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{remision.numero}</span>
          <button
            type="button"
            style={{ ...btnStyle, borderColor: 'var(--proof-accent)', color: 'var(--proof-accent)' }}
            disabled={loading}
            onClick={() => void handleDownload()}
          >
            {t('download')}
          </button>
          <button type="button" style={btnStyle} disabled={loading} onClick={() => void handleGenerar()}>
            {t('regenerate')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          style={{ ...btnStyle, borderColor: 'var(--proof-accent)', color: 'var(--proof-accent)' }}
          disabled={loading}
          onClick={() => void handleGenerar()}
        >
          {loading ? t('generating') : t('generate')}
        </button>
      )}
      {error && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--crit)' }}>{error}</p>
      )}
    </div>
  )
}
