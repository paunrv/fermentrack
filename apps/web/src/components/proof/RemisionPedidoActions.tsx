'use client'

import { useState } from 'react'
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
      setError(e instanceof Error ? e.message : 'No se pudo generar la remisión')
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
      setError(e instanceof Error ? e.message : 'Error al obtener remisión')
    } finally {
      setLoading(false)
    }
  }

  const btnStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '10px 16px',
    borderRadius: 8,
    border: '0.5px solid #E8E6E0',
    background: '#fff',
    color: '#1A1A1A',
    cursor: loading ? 'wait' : 'pointer',
    fontWeight: 500,
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginBottom: 8 }}>
        REMISIÓN DE SALIDA
      </div>
      {remision?.hasPdf && remision.downloadUrl ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#666' }}>{remision.numero}</span>
          <button
            type="button"
            style={{ ...btnStyle, borderColor: '#C2410C', color: '#C2410C' }}
            disabled={loading}
            onClick={() => void handleDownload()}
          >
            Descargar remisión
          </button>
          <button type="button" style={btnStyle} disabled={loading} onClick={() => void handleGenerar()}>
            Regenerar PDF
          </button>
        </div>
      ) : (
        <button
          type="button"
          style={{ ...btnStyle, borderColor: '#C2410C', color: '#C2410C' }}
          disabled={loading}
          onClick={() => void handleGenerar()}
        >
          {loading ? 'Generando…' : 'Generar remisión'}
        </button>
      )}
      {error && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--crit, #E24B4A)' }}>{error}</p>
      )}
    </div>
  )
}
