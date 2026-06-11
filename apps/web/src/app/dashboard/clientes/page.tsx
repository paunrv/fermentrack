'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { crearCliente, obtenerClientes } from '@/app/actions/clientes'
import type { ClienteConSaldo } from '@/lib/supabase/distribuidor'
import { fmtMoney } from '@/lib/proof/format'
import ClientesLegacyPage from './ClientesLegacyPage'

const DIAS_CREDITO_OPTIONS = [
  { value: 0, label: 'Contado' },
  { value: 15, label: '15 días' },
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
  { value: 90, label: '90 días' },
] as const

function creditoLabel(dias: number): string {
  return dias === 0 ? 'Contado' : `${dias} días`
}

function ClientesDistribuidorPage() {
  const { scope } = useProfile()
  const [rows, setRows] = useState<ClienteConSaldo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [diasCredito, setDiasCredito] = useState(0)
  const [notas, setNotas] = useState('')

  async function load() {
    if (!scope) return
    setError(null)
    try {
      const data = await obtenerClientes({ profile_type_v2: scope.profile_type_v2 })
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar clientes')
    }
  }

  useEffect(() => {
    if (!scope) return
    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [scope?.clerk_id, scope?.profile_type_v2])

  function resetForm() {
    setNombre('')
    setTelefono('')
    setEmail('')
    setDiasCredito(0)
    setNotas('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !scope) return

    setSaving(true)
    setSaveError(null)
    try {
      await crearCliente({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        dias_credito: diasCredito,
        notas: notas.trim() || null,
        profile_type_v2: scope.profile_type_v2,
      })
      resetForm()
      setShowForm(false)
      await load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'No se pudo guardar el cliente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 960, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: 'var(--fg-0)' }}>
            Clientes
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
            Cartera comercial · crédito y saldos pendientes
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: '10px 16px',
            background: showForm ? 'transparent' : 'var(--gold)',
            color: 'var(--ink)',
            fontWeight: 600,
            fontSize: 12,
            border: showForm ? '1px solid var(--hairline)' : 'none',
            borderRadius: 'var(--radius-sm)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo cliente'}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-card)',
            padding: 20,
            marginBottom: 24,
            background: 'var(--panel)',
          }}
        >
          <h2
            className="eyebrow"
            style={{ margin: '0 0 16px', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
          >
            Nuevo cliente
          </h2>
          {saveError && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--danger, #b00020)' }}>
              {saveError}
            </p>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            <Field label="Nombre" span={2}>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                placeholder="Nombre comercial"
                style={inputStyle}
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="55 1234 5678"
                style={inputStyle}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contacto@cliente.com"
                style={inputStyle}
              />
            </Field>
            <Field label="Días de crédito">
              <select
                value={diasCredito}
                onChange={e => setDiasCredito(Number(e.target.value))}
                style={inputStyle}
              >
                {DIAS_CREDITO_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notas" span={2}>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Condiciones, preferencias..."
                style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving || !nombre.trim()}
            style={{
              marginTop: 16,
              padding: '10px 16px',
              background: 'var(--gold)',
              color: 'var(--ink)',
              fontWeight: 600,
              fontSize: 12,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar cliente'}
          </button>
        </form>
      )}

      {error && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--danger, #b00020)' }}>{error}</p>
      )}

      {loading ? (
        <p style={{ color: 'var(--fg-3)' }}>Cargando…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--fg-2)' }}>
          Sin clientes. Agrega el primero con &quot;+ Nuevo cliente&quot;.
        </p>
      ) : (
        <div
          style={{
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
          }}
        >
          <div
            className="mono"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 100px 120px 80px',
              gap: 8,
              padding: '10px 16px',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--fg-3)',
              borderBottom: '1px solid var(--hairline)',
            }}
          >
            <span>Nombre</span>
            <span>Teléfono</span>
            <span>Crédito</span>
            <span>Saldo</span>
            <span />
          </div>
          {rows.map((c, i) => (
            <Link
              key={c.id}
              href={`/dashboard/clientes/${c.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 100px 120px 80px',
                gap: 8,
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--hairline)' : 'none',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--fg-0)', fontSize: 14 }}>{c.nombre}</span>
              <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{c.telefono || '—'}</span>
              <Badge muted>{creditoLabel(c.dias_credito)}</Badge>
              <span className="mono" style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)' }}>
                {c.saldo_pendiente > 0 ? fmtMoney(c.saldo_pendiente) : '—'}
              </span>
              <span style={{ justifySelf: 'end' }}>
                {c.tiene_deuda_vencida && <Badge alert>Vencido</Badge>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClientesPage() {
  const { activeProfile } = useProfile()
  if (activeProfile?.profile_type_v2 === 'distributor') {
    return <ClientesDistribuidorPage />
  }
  return <ClientesLegacyPage />
}

function Field({
  label,
  children,
  span,
}: {
  label: string
  children: React.ReactNode
  span?: number
}) {
  return (
    <label style={{ display: 'block', gridColumn: span ? `span ${span}` : undefined }}>
      <span
        className="eyebrow"
        style={{
          display: 'block',
          marginBottom: 6,
          fontSize: 10,
          color: 'var(--fg-3)',
          letterSpacing: '0.12em',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function Badge({
  children,
  muted,
  alert,
}: {
  children: React.ReactNode
  muted?: boolean
  alert?: boolean
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderRadius: 'var(--radius-sm)',
        background: alert ? 'rgba(180, 40, 40, 0.12)' : muted ? 'var(--panel-2, #f5f4f0)' : 'var(--gold)',
        color: alert ? '#b42828' : 'var(--fg-1)',
        border: alert ? '1px solid rgba(180, 40, 40, 0.25)' : '1px solid var(--hairline)',
      }}
    >
      {children}
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 13,
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)',
  color: 'var(--fg-0)',
  outline: 'none',
}
