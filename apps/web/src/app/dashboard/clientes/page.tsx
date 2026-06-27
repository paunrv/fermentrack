'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { crearCliente, obtenerClientes } from '@/app/actions/clientes'
import type { ClienteConSaldo } from '@/lib/supabase/distribuidor'
import { fmtMoney } from '@/lib/proof/format'
import ClientesLegacyPage from './ClientesLegacyPage'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { pagePadding } from '@/lib/ui/page-shell'
import { CanvasHorizontalSection } from '@/components/proof/CanvasHorizontalSection'
import { ClienteRailCard } from '@/components/proof/ClienteRailCard'
import { KpiRailChip } from '@/components/proof/KpiRailChip'
import { CLIENTE_ACCENT } from '@/lib/proof/canvas-accents'

const DIAS_CREDITO_OPTIONS = [
  { value: 0, label: 'Contado' },
  { value: 15, label: '15 días' },
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
  { value: 90, label: '90 días' },
] as const

function ClientesDistribuidorPage() {
  const { scope } = useProfile()
  const isMobile = useIsMobile()
  const [rows, setRows] = useState<ClienteConSaldo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
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
  }, [scope?.user_id, scope?.profile_type_v2])

  function resetForm() {
    setNombre('')
    setTelefono('')
    setEmail('')
    setDireccion('')
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
        direccion: direccion.trim() || null,
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

  const conSaldo = useMemo(() => rows.filter(c => c.saldo_pendiente > 0), [rows])
  const vencidos = useMemo(() => rows.filter(c => c.tiene_deuda_vencida), [rows])
  const alCorriente = useMemo(
    () => rows.filter(c => c.saldo_pendiente <= 0 && !c.tiene_deuda_vencida),
    [rows]
  )
  const carteraTotal = useMemo(
    () => rows.reduce((sum, c) => sum + c.saldo_pendiente, 0),
    [rows]
  )

  return (
    <div style={pagePadding({ isMobile })}>
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
          <h1 style={{ margin: '0 0 6px', fontSize: isMobile ? 22 : 28, fontWeight: 700, color: 'var(--fg-0)' }}>
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
            className="proof-form-grid--responsive"
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
            <Field label="Dirección" span={2}>
              <textarea
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                placeholder="Calle, colonia, ciudad"
                style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
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

      <div className="proof-canvas-stack">
        <CanvasHorizontalSection
          accent={CLIENTE_ACCENT}
          title="Resumen"
          subtitle={loading ? 'Cargando…' : `${rows.length} cliente${rows.length !== 1 ? 's' : ''}`}
          loading={loading}
          itemWidth={132}
          skeletonCount={3}
        >
          <KpiRailChip label="Clientes" value={String(rows.length)} />
          <KpiRailChip label="Cartera pendiente" value={fmtMoney(carteraTotal)} tone={CLIENTE_ACCENT} />
          <KpiRailChip
            label="Con saldo vencido"
            value={String(vencidos.length)}
            tone={vencidos.length ? 'var(--crit)' : undefined}
          />
        </CanvasHorizontalSection>

        <CanvasHorizontalSection
          accent={CLIENTE_ACCENT}
          title="Con saldo"
          subtitle={`${conSaldo.length} cliente${conSaldo.length !== 1 ? 's' : ''}`}
          emptyMessage="Ningún cliente con saldo pendiente."
          loading={loading}
          itemWidth={172}
        >
          {conSaldo.map(c => (
            <ClienteRailCard key={c.id} cliente={c} />
          ))}
        </CanvasHorizontalSection>

        <CanvasHorizontalSection
          accent={CLIENTE_ACCENT}
          title="Al corriente"
          subtitle={`${alCorriente.length} cliente${alCorriente.length !== 1 ? 's' : ''}`}
          emptyMessage={rows.length === 0 ? 'Sin clientes. Agrega el primero con "+ Nuevo cliente".' : 'Todos tienen saldo pendiente.'}
          loading={loading}
          itemWidth={172}
        >
          {alCorriente.map(c => (
            <ClienteRailCard key={c.id} cliente={c} />
          ))}
        </CanvasHorizontalSection>
      </div>
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
