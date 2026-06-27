'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  signedConstanciaFiscalUrl,
  uploadConstanciaFiscalPdf,
} from '@/lib/proof/storage-constancia-fiscal'
import { upsertProfile, type Profile } from '@/lib/supabase'
import { fetchMiInformacionProfile } from '@/lib/proof/profile-mi-informacion'
import {
  formatDatosCobroClipboard,
  resolveTitularCuenta,
} from '@/lib/proof/format-datos-cobro-clipboard'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!value.trim()) return
    try {
      await navigator.clipboard.writeText(value.trim())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!value.trim()}
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: '0.5px solid var(--hairline)',
        background: '#fff',
        fontSize: 11,
        fontWeight: 600,
        color: value.trim() ? 'var(--fg-0)' : 'var(--fg-4)',
        cursor: value.trim() ? 'pointer' : 'default',
        fontFamily: 'var(--font-display)',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? 'Copiado' : label}
    </button>
  )
}

export function ProofDatosCobroSheet({
  open,
  onClose,
  accent,
  profile,
  variant = 'sheet',
}: {
  open: boolean
  onClose: () => void
  accent: string
  profile: Profile | null
  /** sheet = panel lateral; strip = barra bajo header canvas */
  variant?: 'sheet' | 'strip'
}) {
  const supabase = useSupabase()
  const { reload, scope } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)

  const [dataProfile, setDataProfile] = useState<Profile | null>(null)

  const [titular, setTitular] = useState('')
  const [cuenta, setCuenta] = useState('')
  const [banco, setBanco] = useState('')
  const [constanciaPath, setConstanciaPath] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openingPdf, setOpeningPdf] = useState(false)

  const syncFromScope = useCallback(async () => {
    const scopeUserId = scope?.user_id ?? profile?.user_id
    if (!scopeUserId) {
      setDataProfile(profile)
      return
    }
    try {
      const row = await fetchMiInformacionProfile(supabase, scopeUserId)
      const resolved = row ?? profile
      setDataProfile(resolved)
      if (resolved) {
        setTitular(resolved.titular_cuenta ?? '')
        setCuenta(resolved.cuenta_deposito ?? '')
        setBanco(resolved.banco_deposito ?? '')
        setConstanciaPath(resolved.constancia_fiscal_path ?? null)
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar tu información')
    }
  }, [scope?.user_id, profile, supabase])

  useEffect(() => {
    if (!open) return
    void syncFromScope()
  }, [open, syncFromScope])

  const targetProfile = dataProfile ?? profile

  const handleSave = useCallback(async () => {
    if (!targetProfile?.user_id) return
    setSaving(true)
    setError(null)
    try {
      await upsertProfile(supabase, {
        user_id: targetProfile.user_id,
        profile_type_v2: targetProfile.profile_type_v2,
        profile_type: targetProfile.profile_type,
        username: targetProfile.username,
        onboarding_complete: targetProfile.onboarding_complete,
        is_super_user: targetProfile.is_super_user,
        extra_profiles: targetProfile.extra_profiles,
        email: targetProfile.email,
        cuenta_deposito: cuenta.trim() || null,
        banco_deposito: banco.trim() || null,
        titular_cuenta: titular.trim() || null,
        constancia_fiscal_path: constanciaPath,
      })
      await reload({ silent: true })
      await syncFromScope()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }, [targetProfile, supabase, titular, cuenta, banco, constanciaPath, reload, syncFromScope])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleUpload = async (file: File | undefined) => {
    if (!file || !targetProfile?.user_id) return
    setUploading(true)
    setError(null)
    try {
      const path = await uploadConstanciaFiscalPdf(supabase, targetProfile.user_id, file)
      setConstanciaPath(path)
      await upsertProfile(supabase, {
        user_id: targetProfile.user_id,
        profile_type_v2: targetProfile.profile_type_v2,
        profile_type: targetProfile.profile_type,
        username: targetProfile.username,
        onboarding_complete: targetProfile.onboarding_complete,
        is_super_user: targetProfile.is_super_user,
        extra_profiles: targetProfile.extra_profiles,
        email: targetProfile.email,
        cuenta_deposito: cuenta.trim() || null,
        banco_deposito: banco.trim() || null,
        titular_cuenta: titular.trim() || null,
        constancia_fiscal_path: path,
      })
      await reload({ silent: true })
      await syncFromScope()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el PDF')
    } finally {
      setUploading(false)
    }
  }

  const handleOpenConstancia = async () => {
    if (!constanciaPath) return
    setOpeningPdf(true)
    setError(null)
    try {
      const url = await signedConstanciaFiscalUrl(supabase, constanciaPath)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la constancia')
    } finally {
      setOpeningPdf(false)
    }
  }

  if (!open) return null

  const cuentaDisplay = cuenta.trim()
  const hasCuenta = cuentaDisplay.length > 0
  const titularDisplay = resolveTitularCuenta(titular, targetProfile?.username)
  const clipboardText = formatDatosCobroClipboard({
    titular,
    username: targetProfile?.username,
    banco,
    cuenta,
  })
  const canCopy = clipboardText.trim().length > 0

  const compactStrip = variant === 'strip'

  const inner = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: compactStrip ? 0 : 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: compactStrip ? 13 : 16,
              fontWeight: 600,
              color: 'var(--fg-0)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Mi información
          </h2>
          {!compactStrip ? (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                color: 'var(--fg-3)',
                lineHeight: 1.45,
                fontFamily: 'var(--font-display)',
              }}
            >
              Cuenta y constancia fiscal — listos para compartir con clientes.
            </p>
          ) : null}
        </div>
        {variant === 'sheet' ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 20,
              lineHeight: 1,
              color: 'var(--fg-3)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ×
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '0.5px solid var(--hairline)',
              background: '#fff',
              fontSize: 11,
              color: 'var(--fg-3)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >
            Ocultar
          </button>
        )}
      </div>

      {compactStrip ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 10,
          }}
        >
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 2 }}>Cuenta</div>
            {hasCuenta || titularDisplay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {titularDisplay ? (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-0)' }}>
                    {titularDisplay}
                  </span>
                ) : null}
                {hasCuenta ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    {banco.trim() ? (
                      <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{banco.trim()}</span>
                    ) : null}
                    <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 600 }}>
                      {cuentaDisplay}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Sin CLABE configurada</span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Sin cuenta configurada</span>
            )}
          </div>
          <CopyButton value={clipboardText} label="Copiar datos" />
          <button
            type="button"
            disabled={!constanciaPath || openingPdf}
            onClick={() => void handleOpenConstancia()}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: constanciaPath ? accent : 'var(--fg-5)',
              color: constanciaPath ? '#fff' : 'var(--fg-3)',
              fontSize: 11,
              fontWeight: 600,
              cursor: constanciaPath && !openingPdf ? 'pointer' : 'default',
              fontFamily: 'var(--font-display)',
            }}
          >
            {constanciaPath ? 'Constancia PDF' : 'Sin constancia'}
          </button>
        </div>
      ) : (
        <>
      <section style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
            marginBottom: 8,
            fontFamily: 'var(--font-display)',
          }}
        >
          Cuenta de depósito
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <input
            type="text"
            value={titular}
            onChange={e => setTitular(e.target.value)}
            placeholder={
              targetProfile?.username
                ? `Titular (vacío = ${targetProfile.username})`
                : 'Nombre del titular de la cuenta'
            }
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '0.5px solid var(--hairline)',
              fontSize: 13,
              fontFamily: 'var(--font-display)',
            }}
          />
          <input
            type="text"
            value={banco}
            onChange={e => setBanco(e.target.value)}
            placeholder="Banco (ej. BBVA)"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '0.5px solid var(--hairline)',
              fontSize: 13,
              fontFamily: 'var(--font-display)',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={cuenta}
              onChange={e => setCuenta(e.target.value)}
              placeholder="CLABE o número de cuenta"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: '0.5px solid var(--hairline)',
                fontSize: 13,
                fontFamily: MONO,
              }}
            />
            <CopyButton value={clipboardText} label="Copiar" />
          </div>
          {canCopy ? (
            <pre
              style={{
                margin: 0,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--fg-6)',
                fontSize: 11,
                lineHeight: 1.5,
                color: 'var(--fg-2)',
                fontFamily: 'var(--font-display)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {clipboardText}
            </pre>
          ) : null}
        </div>
      </section>

      <section style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
            marginBottom: 8,
            fontFamily: 'var(--font-display)',
          }}
        >
          Constancia fiscal
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            disabled={!constanciaPath || openingPdf}
            onClick={() => void handleOpenConstancia()}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: 'none',
              background: constanciaPath ? accent : 'var(--fg-5)',
              color: constanciaPath ? '#fff' : 'var(--fg-3)',
              fontSize: 12,
              fontWeight: 600,
              cursor: constanciaPath && !openingPdf ? 'pointer' : 'default',
              fontFamily: 'var(--font-display)',
            }}
          >
            {openingPdf ? 'Abriendo…' : constanciaPath ? 'Ver constancia PDF' : 'Sin constancia'}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: `0.5px solid ${accent}55`,
              background: `color-mix(in srgb, ${accent} 8%, #fff)`,
              color: accent,
              fontSize: 12,
              fontWeight: 600,
              cursor: uploading ? 'wait' : 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >
            {uploading ? 'Subiendo…' : constanciaPath ? 'Reemplazar PDF' : 'Subir PDF'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            e.target.value = ''
            void handleUpload(f)
          }}
        />
      </section>

      {error ? (
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8B2E2E' }}>{error}</p>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        style={{
          width: '100%',
          padding: '11px 16px',
          borderRadius: 10,
          border: 'none',
          background: accent,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: saving ? 'wait' : 'pointer',
          fontFamily: 'var(--font-display)',
        }}
      >
        {saving ? 'Guardando…' : 'Guardar datos'}
      </button>
        </>
      )}
    </>
  )

  if (variant === 'strip') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          zIndex: 29,
          background: '#fff',
          borderBottom: '1px solid var(--hairline)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          padding: '14px 24px',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>{inner}</div>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar panel"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          border: 'none',
          background: 'rgba(0,0,0,0.25)',
          cursor: 'pointer',
        }}
      />
      <aside
        role="dialog"
        aria-label="Mi información"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 41,
          width: 'min(100%, 380px)',
          height: '100%',
          background: '#fff',
          borderLeft: '0.5px solid var(--hairline)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
          padding: '20px 20px 24px',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {inner}
      </aside>
    </>
  )
}
