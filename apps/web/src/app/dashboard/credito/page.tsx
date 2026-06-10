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
import { CreditoClienteCanvasCard } from '@/components/proof/CreditoClienteCanvasCard'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'
import { getProfileTheme } from '@/lib/proof/profile-theme'
import { fmtMoney } from '@/lib/proof/format'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

function diasVencido(fecha: string | null): number {
  if (!fecha) return 0
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  if (fecha >= today) return 0
  const a = new Date(`${fecha}T12:00:00`)
  const b = new Date(`${today}T12:00:00`)
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000))
}

function CanvasDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 24px',
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, height: '0.5px', background: '#E8E6E0' }} />
      <span
        style={{
          fontSize: 9,
          color: '#CCC',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: MONO,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: '0.5px', background: '#E8E6E0' }} />
    </div>
  )
}

export default function CreditoPage() {
  const { scope, profilesResolved, activeProfile, loading: profileLoading } = useProfile()
  const supabase = useSupabase()
  const accent = getProfileTheme(activeProfile?.profile_type_v2).accent
  const [resumen, setResumen] = useState<CreditoCxCResumen | null>(null)
  const [deudas, setDeudas] = useState<DeudaClienteAgregada[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null)
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
    setLoadError(null)
    try {
      const [r, d] = await Promise.all([
        fetchCreditoCxCResumen(supabase, scope),
        fetchDeudasPorCliente(supabase, scope),
      ])
      setResumen(r)
      setDeudas(d)
    } catch (err) {
      console.error('[credito] fetchCreditoCxCResumen / fetchDeudasPorCliente', err)
      setLoadError(err instanceof Error ? err.message : 'Error al cargar crédito')
    } finally {
      setLoading(false)
    }
  }, [scope, supabase])

  useEffect(() => {
    if (profileLoading) return
    if (!scope) {
      setLoading(false)
      return
    }
    void load()
  }, [load, scope, profileLoading])

  async function onAbrirDetalle(cliente: DeudaClienteAgregada) {
    if (!scope) return
    setSelectedCliente(cliente.cliente_nombre)
    setDetalleLoading(true)
    setDetalle(null)
    try {
      const d = await fetchDetalleClienteCredito(supabase, cliente.cliente_nombre, scope)
      setDetalle(d)
    } catch (err) {
      console.error('[credito] fetchDetalleClienteCredito', err)
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
    } catch (err) {
      console.error('[credito] redactar-cobro', err)
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
  const bootstrapping = profileLoading
  const showSkeleton = bootstrapping || loading
  const profileBlocked = profilesResolved && !profileLoading && !scope

  return (
    <div style={{ paddingBottom: 100, color: '#1A1A1A' }}>
      <div style={{ padding: '24px 24px 8px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1A1A1A' }}>
          Crédito
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
          Cuentas por cobrar desde pedidos entregados
        </p>
      </div>

      {profileBlocked && (
        <div style={{ margin: '0 24px 16px', padding: 16, fontSize: 13, color: '#888' }}>
          No hay perfil activo. Selecciona un perfil en ajustes.
        </div>
      )}

      {!profileBlocked && loadError && (
        <div
          style={{
            margin: '0 24px 16px',
            padding: '12px 16px',
            borderRadius: 10,
            border: '0.5px solid #E8B4B4',
            background: '#FFF5F5',
            fontSize: 12,
            color: '#8B2E2E',
            lineHeight: 1.5,
          }}
        >
          No pude cargar crédito: {loadError}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
          padding: '0 24px 16px',
        }}
      >
        {(showSkeleton && !profileBlocked) &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              style={{
                height: 72,
                borderRadius: 12,
                background: '#F4F2EE',
                animation: 'proof-skeleton-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}

        {!showSkeleton && !profileBlocked && resumen && (
          <>
            <KpiCard
              label="Por cobrar"
              value={fmtMoney(resumen.totalPorCobrar)}
              tone={resumen.totalPorCobrar > 0 ? accent : '#1A1A1A'}
            />
            <KpiCard
              label="Clientes vencidos"
              value={String(resumen.clientesVencidos)}
              tone={resumen.clientesVencidos > 0 ? '#E24B4A' : '#4CAF7D'}
            />
            <KpiCard
              label="Cobrado este mes"
              value={fmtMoney(resumen.cobradoEsteMes)}
              tone="#4CAF7D"
            />
          </>
        )}
      </div>

      <CanvasDivider
        label={
          showSkeleton && !profileBlocked
            ? 'Cargando…'
            : `${deudas.length} cliente${deudas.length !== 1 ? 's' : ''} con saldo`
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
          padding: '0 24px 24px',
        }}
      >
        {(showSkeleton && !profileBlocked) &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              style={{
                height: 140,
                borderRadius: 12,
                background: '#F4F2EE',
                animation: 'proof-skeleton-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}

        {!showSkeleton && !profileBlocked && deudas.length === 0 && (
          <p style={{ gridColumn: '1 / -1', color: '#AAA', fontSize: 13, margin: 0 }}>
            Sin saldos pendientes de clientes.
          </p>
        )}

        {!showSkeleton &&
          !profileBlocked &&
          deudas.map(d => (
            <CreditoClienteCanvasCard
              key={d.cliente_nombre}
              deuda={d}
              accent={accent}
              selected={selectedCliente === d.cliente_nombre}
              onClick={() => void onAbrirDetalle(d)}
            />
          ))}
      </div>

      <p style={{ padding: '0 24px', margin: 0, fontSize: 11, color: '#AAA' }}>
        Deudas a productores en{' '}
        <Link href="/dashboard/productores" style={{ color: accent }}>
          Productores
        </Link>
        .
      </p>

      <style>{`
        @keyframes proof-skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

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
            setSelectedCliente(null)
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
              background: '#fff',
              borderRadius: 12,
              border: '0.5px solid #E8E6E0',
            }}
            onClick={e => e.stopPropagation()}
          >
            {detalleLoading && !detalle ? (
              <p style={{ color: '#666', fontSize: 13 }}>Cargando detalle…</p>
            ) : detalle ? (
              <>
                <div
                  style={{
                    fontSize: 9,
                    fontFamily: MONO,
                    color: accent,
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}
                >
                  DETALLE CLIENTE
                </div>
                <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>
                  {detalle.cliente_nombre}
                </h2>

                <SectionLabel>Pedidos con saldo</SectionLabel>
                {detalle.cuentas.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#666' }}>Sin cuentas activas.</p>
                ) : (
                  detalle.cuentas.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 8,
                        border: '0.5px solid #E8E6E0',
                        background: '#FAFAF8',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 10, fontFamily: MONO, color: accent }}>
                          {c.pedidos?.numero ?? '—'}
                        </span>
                        <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 600 }}>
                          {fmtMoney(Number(c.saldo_pendiente))}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                        Total {fmtMoney(Number(c.monto_total))}
                        {c.fecha_vencimiento ? ` · vence ${c.fecha_vencimiento}` : ''}
                        {c.pedidos?.fecha_entrega ? ` · entrega ${c.pedidos.fecha_entrega}` : ''}
                      </div>
                    </div>
                  ))
                )}

                <SectionLabel>Pagos registrados</SectionLabel>
                {detalle.pagos.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#666' }}>Sin pagos registrados.</p>
                ) : (
                  detalle.pagos.map(p => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '0.5px solid #E8E6E0',
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: '#666' }}>
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
                  <button
                    type="button"
                    onClick={() => {
                      setDetalle(null)
                      setSelectedCliente(null)
                    }}
                    style={btnSmall}
                  >
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
              background: '#fff',
              borderRadius: 12,
              border: '0.5px solid #E8E6E0',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 9,
                fontFamily: MONO,
                color: accent,
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              COBRO · {cobroModal.cliente}
            </div>
            {cobroModal.loading ? (
              <p style={{ color: '#666' }}>Redactando…</p>
            ) : (
              <>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: MONO,
                    fontSize: 12,
                    color: '#1A1A1A',
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

function KpiCard({
  label,
  value,
  tone = '#1A1A1A',
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div
      style={{
        padding: 14,
        background: '#fff',
        border: '0.5px solid #E8E6E0',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontFamily: MONO,
          letterSpacing: '0.08em',
          color: '#AAA',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: MONO, color: tone }}>
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
        color: '#AAA',
        textTransform: 'uppercase',
        margin: '16px 0 8px',
      }}
    >
      {children}
    </div>
  )
}

const btnSmall: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  padding: '6px 10px',
  border: '0.5px solid #E8E6E0',
  background: '#fff',
  color: '#1A1A1A',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: MONO,
}
