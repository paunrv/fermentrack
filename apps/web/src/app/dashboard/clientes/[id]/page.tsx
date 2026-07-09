'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { editarCliente, obtenerCliente } from '@/app/actions/clientes'
import type { ClienteDetalle, EstadoPago } from '@/lib/supabase/distribuidor'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { fmtDateOnly, fmtMoney } from '@/lib/proof/format'

const DIAS_CREDITO_VALUES = [0, 15, 30, 60, 90] as const

export default function ClienteDetallePage() {
  const t = useTranslations('distributor.clientes.detail')
  const tList = useTranslations('distributor.clientes')
  const tEstado = useTranslations('distributor.pedidoEstado')
  const tPago = useTranslations('distributor.estadoPago')
  const tCommon = useTranslations('distributor.common')
  const params = useParams()
  const clienteId = String(params.id ?? '')
  const { scope } = useProfile()
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deudaOpen, setDeudaOpen] = useState(true)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [diasCredito, setDiasCredito] = useState(0)
  const [notas, setNotas] = useState('')

  function creditoLabel(dias: number): string {
    return dias === 0 ? tList('creditTerms.cash') : tList('creditTerms.days', { days: dias })
  }

  async function load() {
    if (!scope || !clienteId) return
    setError(null)
    try {
      const data = await obtenerCliente(clienteId, { profile_type_v2: scope.profile_type_v2 })
      setCliente(data)
      if (data) {
        setNombre(data.nombre)
        setTelefono(data.telefono || '')
        setEmail(data.email || '')
        setDireccion(data.direccion || '')
        setDiasCredito(data.dias_credito)
        setNotas(data.notas || '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loadError'))
    }
  }

  useEffect(() => {
    if (!scope || !clienteId) return
    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [scope?.user_id, scope?.profile_type_v2, clienteId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!scope || !clienteId || !nombre.trim()) return

    setSaving(true)
    setSaveError(null)
    try {
      await editarCliente(clienteId, {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        direccion: direccion.trim() || null,
        dias_credito: diasCredito,
        notas: notas.trim() || null,
        profile_type_v2: scope.profile_type_v2,
      })
      setEditing(false)
      await load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const backLink = (
    <Link
      href="/dashboard/clientes"
      style={{ fontSize: 12, color: 'var(--fg-3)', textDecoration: 'none' }}
    >
      {t('back')}
    </Link>
  )

  if (loading) {
    return (
      <VuOpsPage title={tCommon('loading')} actions={backLink}>
        <p style={{ margin: 0, color: 'var(--fg-3)', fontSize: 13 }}>{tCommon('loading')}</p>
      </VuOpsPage>
    )
  }

  if (error || !cliente) {
    return (
      <VuOpsPage title={t('notFound')} actions={backLink}>
        <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 13 }}>
          {error || t('notFound')}
        </p>
      </VuOpsPage>
    )
  }

  return (
    <VuOpsPage
      title={cliente.nombre}
      description={
        <span className="mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>
          {creditoLabel(cliente.dias_credito)}
          {cliente.saldo_pendiente > 0
            ? t('balance', { amount: fmtMoney(cliente.saldo_pendiente) })
            : t('current')}
          {cliente.tiene_deuda_vencida ? t('overdueDebt') : ''}
        </span>
      }
      actions={
        <>
          {backLink}
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                color: 'var(--fg-0)',
                fontWeight: 600,
                fontSize: 12,
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-sm)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {t('edit')}
            </button>
          )}
        </>
      }
    >
      {editing ? (
        <form
          onSubmit={handleSave}
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
            {t('editTitle')}
          </h2>
          {saveError && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--crit)' }}>
              {saveError}
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <Field label={tList('fields.name')} span={2}>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                style={inputStyle}
              />
            </Field>
            <Field label={t('fields.phone')}>
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label={t('fields.email')}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label={t('fields.address')} span={2}>
              <textarea
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                placeholder={tList('fields.addressPlaceholder')}
                style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              />
            </Field>
            <Field label={tList('fields.creditDays')}>
              <select
                value={diasCredito}
                onChange={e => setDiasCredito(Number(e.target.value))}
                style={inputStyle}
              >
                {DIAS_CREDITO_VALUES.map(value => (
                  <option key={value} value={value}>
                    {creditoLabel(value)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('fields.notes')} span={2}>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="submit"
              disabled={saving || !nombre.trim()}
              style={ctaStyle}
            >
              {saving ? tList('saving') : tCommon('save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setSaveError(null)
                setNombre(cliente.nombre)
                setTelefono(cliente.telefono || '')
                setEmail(cliente.email || '')
                setDireccion(cliente.direccion || '')
                setDiasCredito(cliente.dias_credito)
                setNotas(cliente.notas || '')
              }}
              style={{
                ...ctaStyle,
                background: 'transparent',
                border: '1px solid var(--hairline)',
              }}
            >
              {tList('cancel')}
            </button>
          </div>
        </form>
      ) : (
        <Section title={t('sections.data')}>
          <DataRow label={t('fields.phone')} value={cliente.telefono || tCommon('dash')} />
          <DataRow label={t('fields.email')} value={cliente.email || tCommon('dash')} />
          <DataRow label={t('fields.address')} value={cliente.direccion || tCommon('dash')} />
          <DataRow label={t('fields.credit')} value={creditoLabel(cliente.dias_credito)} />
          <DataRow label={t('fields.notes')} value={cliente.notas || tCommon('dash')} />
        </Section>
      )}

      <Section title={t('sections.orders')}>
        {cliente.pedidos.length === 0 ? (
          <Empty>{t('emptyOrders')}</Empty>
        ) : (
          cliente.pedidos.map((p, i) => (
            <Link
              key={p.id}
              href={`/dashboard/pedidos/${p.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 16px',
                borderBottom: i < cliente.pedidos.length - 1 ? '1px solid var(--hairline)' : 'none',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div>
                <span className="mono" style={{ fontSize: 12, color: 'var(--gold)' }}>
                  {p.numero}
                </span>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                  {(tEstado as (key: string) => string)(p.estado) || p.estado}
                  {p.fecha_entrega ? t('delivery', { date: fmtDateOnly(p.fecha_entrega) }) : ''}
                </div>
              </div>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--fg-0)', fontSize: 13 }}>
                {fmtMoney(Number(p.total))}
              </span>
            </Link>
          ))
        )}
      </Section>

      <section style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setDeudaOpen(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            margin: '0 0 10px',
            padding: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <h2
            className="eyebrow"
            style={{ margin: 0, fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
          >
            {t('sections.debt')}
            {cliente.pagos.length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--fg-2)' }}>
                ({cliente.pagos.length})
              </span>
            )}
          </h2>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
            {deudaOpen ? '▾' : '▸'}
          </span>
        </button>
        {deudaOpen && (
          <div
            style={{
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-card)',
              overflow: 'hidden',
            }}
          >
            {cliente.pagos.length === 0 ? (
              <Empty>{t('emptyPayments')}</Empty>
            ) : (
              cliente.pagos.map((p, i) => {
                const pedidoLabel =
                  p.pedidos_vinculados.length > 0
                    ? p.pedidos_vinculados
                        .map(v => v.pedido_numero || v.pedido_id.slice(0, 8))
                        .join(', ')
                    : tCommon('dash')
                const pagoEstado = (tPago as (key: EstadoPago) => string)(p.estado) || p.estado
                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: i < cliente.pagos.length - 1 ? '1px solid var(--hairline)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
                          {fmtMoney(Number(p.monto))}
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              padding: '3px 6px',
                              borderRadius: 'var(--radius-sm)',
                              background:
                                p.estado === 'vencido'
                                  ? 'rgba(180, 40, 40, 0.12)'
                                  : 'var(--panel-2)',
                              color: p.estado === 'vencido' ? 'var(--crit)' : 'var(--fg-2)',
                              border: '1px solid var(--hairline)',
                            }}
                          >
                            {pagoEstado}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                          {t('orderRef', { ref: pedidoLabel })}
                          {p.fecha_vencimiento
                            ? t('due', { date: fmtDateOnly(p.fecha_vencimiento) })
                            : ''}
                        </div>
                      </div>
                      {p.imagen_comprobante_url && (
                        <a
                          href={p.imagen_comprobante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--gold)',
                            textDecoration: 'none',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t('viewReceipt')}
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </section>
    </VuOpsPage>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        className="eyebrow"
        style={{ margin: '0 0 10px', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
      >
        {title}
      </h2>
      <div
        style={{
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--hairline)',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--fg-3)' }}>{label}</span>
      <span style={{ color: 'var(--fg-0)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, padding: 16, fontSize: 13, color: 'var(--fg-3)' }}>{children}</p>
  )
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

const ctaStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: 'var(--gold)',
  color: 'var(--ink)',
  fontWeight: 600,
  fontSize: 12,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}
