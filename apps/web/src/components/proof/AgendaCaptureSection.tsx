'use client'

import { useRef, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { useOrganization } from '@/context/OrganizationContext'
import {
  WINEMAKER_ETAPA_KEYS,
  type WinemakerEtapaKey,
} from '@/lib/proof/winemaker-etapa'

type UploadKind = 'whiteboard' | 'lab' | 'bodega'

async function uploadCapture(
  file: File,
  opts: {
    organizationId: string
    captureKind: UploadKind
    etapa: WinemakerEtapaKey
  }
): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  form.append('organizationId', opts.organizationId)
  form.append('captureKind', opts.captureKind)
  form.append('etapa', opts.etapa)

  const res = await fetch('/api/winemaker/documentos', { method: 'POST', body: form })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'No se pudo subir el archivo')
  }
}

export function AgendaCaptureSection() {
  const t = useTranslations('winemaker.agenda.capture')
  const tEtapa = useTranslations('winemaker.etapa')
  const { activeOrg } = useOrganization()
  const [etapa, setEtapa] = useState<WinemakerEtapaKey>('fermentacion')
  const [uploading, setUploading] = useState<UploadKind | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const whiteboardInputRef = useRef<HTMLInputElement>(null)
  const labInputRef = useRef<HTMLInputElement>(null)
  const bodegaInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(kind: UploadKind, file: File | undefined) {
    if (!file || !activeOrg?.id) return

    setUploading(kind)
    setError(null)
    setMessage(null)

    try {
      const resolvedEtapa =
        kind === 'lab' ? 'analisis' : kind === 'bodega' ? 'bodega' : etapa
      await uploadCapture(file, {
        organizationId: activeOrg.id,
        captureKind: kind,
        etapa: resolvedEtapa,
      })
      setMessage(t('success'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setUploading(null)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
      <section
        style={{
          padding: 16,
          borderRadius: 12,
          border: '0.5px solid var(--border)',
          background: 'var(--bg-1)',
        }}
      >
        <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{t('whiteboardTitle')}</h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: 'var(--fg-2)' }}>
          {t('whiteboardHint')}
        </p>

        <p
          style={{
            margin: '0 0 8px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
          }}
        >
          {t('categoryLabel')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {WINEMAKER_ETAPA_KEYS.map(key => {
            const active = etapa === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setEtapa(key)}
                aria-pressed={active}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: active
                    ? '1px solid var(--proof-accent, #7c5cbf)'
                    : '1px solid var(--border)',
                  background: active
                    ? 'color-mix(in srgb, var(--proof-accent, #7c5cbf) 12%, var(--bg-2))'
                    : 'var(--bg-2)',
                  color: active ? 'var(--proof-accent, #7c5cbf)' : 'var(--fg-1)',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {tEtapa(key)}
              </button>
            )
          })}
        </div>

        <input
          ref={whiteboardInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={e => void handleFile('whiteboard', e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={!activeOrg?.id || uploading !== null}
          onClick={() => whiteboardInputRef.current?.click()}
          style={primaryButtonStyle}
        >
          {uploading === 'whiteboard' ? t('uploading') : t('whiteboardCta')}
        </button>
      </section>

      <section
        style={{
          padding: 16,
          borderRadius: 12,
          border: '0.5px solid var(--border)',
          background: 'var(--bg-1)',
        }}
      >
        <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{t('resultsTitle')}</h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: 'var(--fg-2)' }}>
          {t('resultsHint')}
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          <input
            ref={labInputRef}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={e => void handleFile('lab', e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={!activeOrg?.id || uploading !== null}
            onClick={() => labInputRef.current?.click()}
            style={secondaryButtonStyle}
          >
            {uploading === 'lab' ? t('uploading') : t('labCta')}
          </button>

          <input
            ref={bodegaInputRef}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={e => void handleFile('bodega', e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={!activeOrg?.id || uploading !== null}
            onClick={() => bodegaInputRef.current?.click()}
            style={secondaryButtonStyle}
          >
            {uploading === 'bodega' ? t('uploading') : t('bodegaCta')}
          </button>
        </div>
      </section>

      {message ? (
        <p role="status" style={{ margin: 0, fontSize: 13, color: 'var(--ok)' }}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--crit)' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

const primaryButtonStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--proof-accent, #7c5cbf)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg-2)',
  color: 'var(--fg-0)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
