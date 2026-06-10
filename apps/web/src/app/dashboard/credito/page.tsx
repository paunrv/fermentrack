'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchCreditoCxCResumen,
  fetchDeudasPorCliente,
  fetchDetalleClienteCredito,
  type CreditoCxCResumen,
  type DeudaClienteAgregada,
  type ClienteCreditoDetalle,
} from '@/lib/supabase'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'
import { CANVAS_BG } from '@/lib/proof/profile-theme'
import { fmtMoney } from '@/lib/proof/format'

const ACCENT = '#C2410C'
const CARD_BG = '#fff'
const BORDER = '#E8E6E0'
const FG = '#1A1A1A'
const FG_MUTED = '#666'
const FG_LIGHT = '#AAA'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

function diasVencido(fecha: string | null): number {
  if (!fecha) return 0
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  if (fecha >= today) return 0
  const a = new Date(`${fecha}T12:00:00`)
  const b = new Date(`${today}T12:00:00`)
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000))
}

export default function CreditoPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [resumen, setResumen] = useState<CreditoCxCResumen | null>(null)
  const [deudas, setDeudas] = useState<DeudaClienteAgregada[]>([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState<ClienteCreditoDetalle | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [cobroModal, setCobroModal] = useState<{
    cliente: string
    mensaje: string
    loading: boolean
  } | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setLoading(true)
    try {
      const [r, d] = await Promise.all([
        fetchCreditoCxCResumen(supabase, scope),
        fetchDeudasPorCliente(supabase, scope),
      ])
      setResumen(r)
      setDeudas(d)
    } finally {
      setLoading(false)
    }
  }, [scope, supabase])

  useEffect(() => {
    void load()
  }, [load])

  async function onAbrirDetalle(cliente: DeudaClienteAgregada) {
    if (!scope) return
    setDetalleLoading(true)
    setDetalle(null)
    try {
      const d = await fetchDetalleClienteCredito(supabase, cliente.cliente_nombre, scope)
      setDetalle(d)
    } finally {
      setDetalleLoading(false)
    }
  }

  async function onRedactarCobro(cliente: DeudaClienteAgregada) {
    const nombre = cliente.cliente_nombre
    setCobroModal({ cliente: nombre, mensaje: '', loading: true })
    try {
      const res = await fetch('/api/credito/redactar-cobro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNombre: nombre,
          monto: cliente.saldo_pendiente,
          diasVencido: diasVencido(cliente.fecha_vencimiento),
          pedidoNumero: null,
        }),
      })
      const data = await res.json()
      setCobroModal({ cliente: nombre, mensaje: data.mensaje || '', loading: false })
    } catch {
      setCobroModal({
        cliente: nombre,
        mensaje: `Hola ${nombre}, te escribo por el saldo pendiente de ${fmtMoney(cliente.saldo_pendiente)}. ¿Podemos coordinar pago esta semana?`,
        loading: false,
      })
    }
  }

  const proofContext = useMemo(
    () => ({
      total_por_cobrar: resumen?.totalPorCobrar ?? 0,
      clientes_vencidos: resumen?.clientesVencidos ?? 0,
      cobrado_este_mes: resumen?.cobradoEsteMes ?? 0,
      deudasCount: deudas.length,
      clienteRiesgo: deudas.find(d => d.estado === 'vencido') ?? null,
    }),
    [resumen, deudas]
  )

  const primerVencido = deudas.find(d => d.estado === 'vencido')

  return (
    <div
      style={{
        minHeight: '100vh',
        background: CANVAS_BG,
        color: FG,
        padding: '28px 28px 100px',
        maxWidth: 960,
        margin: '0 auto',
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: FG }}>
          Crédito
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: FG_MUTED }}>
          Cuentas por cobrar desde pedidos entregados.
        </p>
      </header>

      {loading ? (
        <p style={{ color: FG_LIGHT, fontSize: 13 }}>Cargando crédito…</p>
      ) : (
        <>
          {resumen && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
                marginBottom: 24,
              }}
            >
              <Kpi
                label="Total por cobrar"
                value={fmtMoney(resumen.totalPorCobrar)}
                tone={resumen.totalPorCobrar > 0 ? ACCENT : FG}
              />
              <Kpi
                label="Clientes con deuda vencida"
                value={String(resumen.clientesVencidos)}
                tone={resumen.clientesVencidos > 0 ? '#E24B4A' : '#4CAF7D'}
              />
              <Kpi
                label="Cobrado este mes"
                value={fmtMoney(resumen.cobradoEsteMes)}
                tone="#4CAF7D"
              />
            </div>
          )}

          <div
            style={{
              fontSize: 9,
              fontFamily: MONO,
              letterSpacing: '0.08em',
              color: FG_LIGHT,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            Deudas por cliente
          </div>

          <div
            style={{
              border: `0.5px solid ${BORDER}`,
              borderRadius: 12,
              background: CARD_BG,
              overflow: 'hidden',
            }}
          >
            {deudas.length === 0 ? (
              <p style={{ padding: 20, color: FG_LIGHT, fontSize: 13, margin: 0 }}>
                Sin saldos pendientes de clientes.
              </p>
            ) : (
              deudas.map((d, i) => (
                <button
                  key={d.cliente_nombre}
                  type="button"
                  onClick={() => void onAbrirDetalle(d)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    border: 'none',
                    borderBottom: i < deudas.length - 1 ? `0.5px solid ${BORDER}` : 'none',
                    background: CARD_BG,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${ACCENT}06`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = CARD_BG
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: FG }}>{d.cliente_nombre}</div>
                    <div style={{ fontSize: 10, fontFamily: MONO, color: FG_MUTED, marginTop: 2 }}>
                      {d.cuentas_count} pedido{d.cuentas_count !== 1 ? 's' : ''}
                      {d.fecha_vencimiento ? ` · vence ${d.fecha_vencimiento}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontFamily: MONO, color: FG_MUTED }}>
                    {fmtMoney(d.monto_total)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: MONO,
                      fontWeight: 600,
                      color: FG,
                    }}
                  >
                    {fmtMoney(d.saldo_pendiente)}
                  </span>
                  <EstadoBadge estado={d.estado} />
                </button>
              ))
            )}
          </div>

          <p style={{ marginTop: 16, fontSize: 11, color: FG_LIGHT }}>
            Deudas a productores en{' '}
            <Link href="/dashboard/productores" style={{ color: ACCENT }}>
              Productores
            </Link>
            .
          </p>
        </>
      )}

      {(detalleLoading || detalle) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 30,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
          }}
          onClick={() => {
            setDetalle(null)
            setDetalleLoading(false)
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              maxHeight: '85vh',
              overflow: 'auto',
              padding: 20,
              background: CARD_BG,
              borderRadius: 12,
              border: `0.5px solid ${BORDER}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {detalleLoading && !detalle ? (
              <p style={{ color: FG_MUTED, fontSize: 13 }}>Cargando detalle…</p>
            ) : detalle ? (
              <>
                <div
                  style={{
                    fontSize: 9,
                    fontFamily: MONO,
                    color: ACCENT,
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}
                >
                  DETALLE CLIENTE
                </div>
                <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: FG }}>
                  {detalle.cliente_nombre}
                </h2>

                <SectionLabel>Pedidos con saldo</SectionLabel>
                {detalle.cuentas.length === 0 ? (
                  <p style={{ fontSize: 12, color: FG_MUTED }}>Sin cuentas activas.</p>
                ) : (
                  detalle.cuentas.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 8,
                        border: `0.5px solid ${BORDER}`,
                        background: '#FAFAF8',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 10, fontFamily: MONO, color: ACCENT }}>
                          {c.pedidos?.numero ?? '—'}
                        </span>
                        <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 600 }}>
                          {fmtMoney(Number(c.saldo_pendiente))}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: FG_MUTED, marginTop: 4 }}>
                        Total {fmtMoney(Number(c.monto_total))}
                        {c.fecha_vencimiento ? ` · vence ${c.fecha_vencimiento}` : ''}
                        {c.pedidos?.fecha_entrega ? ` · entrega ${c.pedidos.fecha_entrega}` : ''}
                      </div>
                      <EstadoBadge
                        estado={
                          c.estado === 'vencida' ||
                          (c.fecha_vencimiento != null &&
                            c.fecha_vencimiento <
                              new Date().toLocaleDateString('en-CA', {
                                timeZone: 'America/Mexico_City',
                              }))
                            ? 'vencido'
                            : 'al_dia'
                        }
                        small
                      />
                    </div>
                  ))
                )}

                <SectionLabel>Pagos registrados</SectionLabel>
                {detalle.pagos.length === 0 ? (
                  <p style={{ fontSize: 12, color: FG_MUTED }}>Sin pagos registrados.</p>
                ) : (
                  detalle.pagos.map(p => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: `0.5px solid ${BORDER}`,
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: FG_MUTED }}>
                        {p.fecha_pago} · {p.metodo}
                        {p.referencia ? ` · ${p.referencia}` : ''}
                      </span>
                      <span style={{ fontFamily: MONO, fontWeight: 600, color: '#4CAF7D' }}>
                        +{fmtMoney(Number(p.monto))}
                      </span>
                    </div>
                  ))
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const agg = deudas.find(x => x.cliente_nombre === detalle.cliente_nombre)
                      if (agg) void onRedactarCobro(agg)
                    }}
                    style={btnSmall}
                  >
                    Redactar cobro
                  </button>
                  <button type="button" onClick={() => setDetalle(null)} style={btnSmall}>
                    Cerrar
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {cobroModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 40,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
          }}
          onClick={() => setCobroModal(null)}
        >
          <div
            style={{
              maxWidth: 420,
              width: '100%',
              padding: 20,
              background: CARD_BG,
              borderRadius: 12,
              border: `0.5px solid ${BORDER}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 9,
                fontFamily: MONO,
                color: ACCENT,
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              COBRO · {cobroModal.cliente}
            </div>
            {cobroModal.loading ? (
              <p style={{ color: FG_MUTED }}>Redactando…</p>
            ) : (
              <>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: MONO,
                    fontSize: 12,
                    color: FG,
                    margin: '0 0 12px',
                  }}
                >
                  {cobroModal.mensaje}
                </pre>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(cobroModal.mensaje)}
                  style={btnSmall}
                >
                  Copiar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ConnectedProofAIBar
        pantalla="credito"
        vista="me_deben"
        profileType="distributor"
        hints={{ pantalla: proofContext }}
        fallback={{
          mensaje:
            resumen && resumen.clientesVencidos > 0
              ? `${resumen.clientesVencidos} cliente(s) con deuda vencida. Cobra antes de entregar.`
              : 'Revisa saldos pendientes antes de confirmar más pedidos a crédito.',
          accionLabel: primerVencido ? 'Redactar cobro' : 'Ver deudas',
        }}
        onActionClick={
          primerVencido ? () => void onRedactarCobro(primerVencido) : undefined
        }
      />
    </div>
  )
}

function Kpi({
  label,
  value,
  tone = FG,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div
      style={{
        padding: 14,
        background: CARD_BG,
        border: `0.5px solid ${BORDER}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontFamily: MONO,
          letterSpacing: '0.08em',
          color: FG_LIGHT,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: MONO, color: tone }}>
        {value}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontFamily: MONO,
        letterSpacing: '0.08em',
        color: FG_LIGHT,
        textTransform: 'uppercase',
        margin: '16px 0 8px',
      }}
    >
      {children}
    </div>
  )
}

function EstadoBadge({
  estado,
  small,
}: {
  estado: 'al_dia' | 'vencido'
  small?: boolean
}) {
  const vencido = estado === 'vencido'
  return (
    <span
      style={{
        fontSize: small ? 9 : 10,
        fontFamily: MONO,
        fontWeight: 600,
        color: vencido ? '#E24B4A' : '#4CAF7D',
        letterSpacing: '0.04em',
      }}
    >
      {vencido ? 'VENCIDO' : 'AL DÍA'}
    </span>
  )
}

const btnSmall: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  padding: '6px 10px',
  border: `0.5px solid ${BORDER}`,
  background: CARD_BG,
  color: FG,
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: MONO,
}
