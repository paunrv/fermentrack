'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { useOrganization } from '@/context/OrganizationContext'
import {
  WINEMAKER_ETAPA_KEYS,
  type WinemakerEtapaKey,
} from '@/lib/proof/winemaker-etapa'

type UploadKind = 'whiteboard' | 'lab' | 'bodega'
type SheetStep = 'menu' | 'whiteboard'

async function uploadCapture(
  file: File,
  opts: {
    organizationId: string
    captureKind: UploadKind
    etapa: WinemakerEtapaKey
    documentDate?: string
  }
): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  form.append('organizationId', opts.organizationId)
  form.append('captureKind', opts.captureKind)
  form.append('etapa', opts.etapa)
  if (opts.documentDate) form.append('documentDate', opts.documentDate)

  const res = await fetch('/api/winemaker/documentos', { method: 'POST', body: form })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'UPLOAD_FAILED')
  }
}

export function AgendaCaptureSheet({
  open,
  onClose,
  onUploaded,
  defaultEtapa = 'fermentacion',
  /** Calendar day `YYYY-MM-DD` — stored as document_date. Defaults to today on server. */
  documentDate,
}: {
  open: boolean
  onClose: () => void
  onUploaded?: () => void
  defaultEtapa?: WinemakerEtapaKey
  documentDate?: string
}) {
  const t = useTranslations('winemaker.agenda.capture')
  const tEtapa = useTranslations('winemaker.etapa')
  const { activeOrg } = useOrganization()
  const [step, setStep] = useState<SheetStep>('menu')
  const [etapa, setEtapa] = useState<WinemakerEtapaKey>(defaultEtapa)
  const [uploading, setUploading] = useState<UploadKind | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const whiteboardInputRef = useRef<HTMLInputElement>(null)
  const labInputRef = useRef<HTMLInputElement>(null)
  const bodegaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setStep('menu')
      setMessage(null)
      setError(null)
      setUploading(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
        documentDate,
      })
      setMessage(t('success'))
      onUploaded?.()
      window.setTimeout(() => onClose(), 700)
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      setError(raw && raw !== 'UPLOAD_FAILED' ? raw : t('error'))
    } finally {
      setUploading(null)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'grid',
        placeItems: 'end center',
        padding: 16,
      }}
    >
      <button
        type="button"
        aria-label={t('closeAria')}
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          padding: 0,
          margin: 0,
          background: 'rgba(55, 53, 47, 0.4)',
          cursor: 'pointer',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('sheetAria')}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          border: '0.5px solid var(--hairline)',
          background: 'var(--surface-card)',
          padding: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
        }}
      >
        {step === 'menu' ? (
          <>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>{t('title')}</h2>
            <div style={{ display: 'grid', gap: 8 }}>
              <CaptureChoice
                title={t('whiteboard')}
                hint={t('whiteboardHint')}
                disabled={!activeOrg?.id || uploading !== null}
                onClick={() => setStep('whiteboard')}
              />
              <input
                ref={labInputRef}
                type="file"
                accept="image/*,application/pdf"
                hidden
                onChange={e => void handleFile('lab', e.target.files?.[0])}
              />
              <CaptureChoice
                title={uploading === 'lab' ? t('uploading') : t('lab')}
                hint={t('labHint')}
                disabled={!activeOrg?.id || uploading !== null}
                onClick={() => labInputRef.current?.click()}
              />
              <input
                ref={bodegaInputRef}
                type="file"
                accept="image/*,application/pdf"
                hidden
                onChange={e => void handleFile('bodega', e.target.files?.[0])}
              />
              <CaptureChoice
                title={uploading === 'bodega' ? t('uploading') : t('bodega')}
                hint={t('bodegaHint')}
                disabled={!activeOrg?.id || uploading !== null}
                onClick={() => bodegaInputRef.current?.click()}
              />
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep('menu')}
              style={{
                margin: '0 0 12px',
                padding: 0,
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                color: 'var(--fg-3)',
                cursor: 'pointer',
              }}
            >
              {t('back')}
            </button>
            <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{t('whiteboard')}</h2>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.45 }}>
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
              {WINEMAKER_ETAPA_KEYS.filter(k => k !== 'bodega').map(key => {
                const active = etapa === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEtapa(key)}
                    aria-pressed={active}
                    style={{
                      padding: '7px 11px',
                      borderRadius: 999,
                      border: active
                        ? '1px solid var(--proof-accent)'
                        : '1px solid var(--hairline)',
                      background: active
                        ? 'color-mix(in srgb, var(--proof-accent) 12%, var(--surface-card))'
                        : 'var(--panel-2)',
                      color: active ? 'var(--proof-accent)' : 'var(--fg-1)',
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
          </>
        )}

        {message ? (
          <p role="status" style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ok)' }}>
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--crit)' }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function CaptureChoice({
  title,
  hint,
  disabled,
  onClick,
}: {
  title: string
  hint: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        width: '100%',
        padding: '12px 14px',
        borderRadius: 10,
        border: '0.5px solid var(--hairline)',
        background: 'var(--panel-2)',
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>{title}</span>
      <span style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.4 }}>{hint}</span>
    </button>
  )
}

const primaryButtonStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--proof-accent)',
  color: 'var(--ink)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
