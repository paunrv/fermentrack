'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchCreditoResumen,
  fetchDeudasProductores,
  fetchCuentasClientes,
  fetchAlertasCreditoCriticas,
  marcarDeudaPagada,
  type DeudaProductorRow,
  type CuentaClienteWithClient,
  type AlertaCreditoCritica,
  type CreditoResumen,
} from '@/lib/supabase'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'
import { fmtMoney } from '@/lib/proof/format'

type Vista = 'resumen' | 'les_debo' | 'me_deben'

const ESTADO_DEUDA_LABEL: Record<string, string> = {
  al_corriente: 'AL CORRIENTE',
  proximo: 'PRÓXIMO',
  vencido: 'VENCIDO',
  en_negociacion: 'EN NEGOCIACIÓN',
  pagado: 'PAGADO',
}

export default function CreditoPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [vista, setVista] = useState<Vista>('resumen')
  const [resumen, setResumen] = useState<CreditoResumen | null>(null)
  const [deudas, setDeudas] = useState<DeudaProductorRow[]>([])
  const [cuentas, setCuentas] = useState<CuentaClienteWithClient[]>([])
  const [alertas, setAlertas] = useState<AlertaCreditoCritica[]>([])
  const [loading, setLoading] = useState(true)
  const [cobroModal, setCobroModal] = useState<{
    cliente: string
    mensaje: string
    loading: boolean
  } | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setLoading(true)
    try {
      const [r, d, c, a] = await Promise.all([
        fetchCreditoResumen(supabase, scope),
        fetchDeudasProductores(supabase, scope),
        fetchCuentasClientes(supabase, scope),
        fetchAlertasCreditoCriticas(supabase, scope),
      ])
      setResumen(r)
      setDeudas(d)
      setCuentas(c.filter(x => Number(x.saldo_pendiente) > 0))
      setAlertas(a)
    } finally {
      setLoading(false)
    }
  }, [scope, supabase])

  useEffect(() => {
    void load()
  }, [load])

  async function onMarcarPagado(id: string) {
    await marcarDeudaPagada(supabase, id)
    await load()
  }

  async function onRedactarCobro(cuenta: CuentaClienteWithClient) {
    const nombre = cuenta.clients?.name || 'Cliente'
    setCobroModal({ cliente: nombre, mensaje: '', loading: true })
    try {
      const res = await fetch('/api/credito/redactar-cobro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNombre: nombre,
          monto: Number(cuenta.saldo_pendiente),
          diasVencido: cuenta.dias_vencido,
          pedidoNumero: cuenta.pedido_activo_hoy ? 'HOY' : null,
        }),
      })
      const data = await res.json()
      setCobroModal({ cliente: nombre, mensaje: data.mensaje || '', loading: false })
    } catch {
      setCobroModal({
        cliente: nombre,
        mensaje: `Hola ${nombre}, te escribo por el saldo pendiente de ${fmtMoney(Number(cuenta.saldo_pendiente))}. ¿Podemos coordinar pago esta semana?`,
        loading: false,
      })
    }
  }

  const proofContext = useMemo(() => {
    const urgente = deudas.find(d => d.estado === 'vencido')
    const riesgo = cuentas.find(c => c.pedido_activo_hoy && c.dias_vencido > 0)
    return {
      vista,
      resumen,
      deudasCount: deudas.length,
      cuentasCount: cuentas.length,
      deudaUrgente: urgente
        ? { productor: urgente.productor, monto: urgente.monto, fecha: urgente.fecha_vencimiento }
        : null,
      clienteRiesgo: riesgo
        ? {
            nombre: riesgo.clients?.name,
            monto: riesgo.saldo_pendiente,
            dias: riesgo.dias_vencido,
          }
        : null,
    }
  }, [vista, resumen, deudas, cuentas])

  const posicionSemanal =
    (resumen?.cobrosEsperadosSemana ?? 0) - (resumen?.venceSemana ?? 0)

  return (
    <div style={{ padding: '28px 28px 100px', maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: 'var(--fg-0)' }}>
          Crédito
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
          Flujo real desde deudas_productores y cuentas_clientes.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {(
          [
            ['resumen', 'Resumen'],
            ['les_debo', 'Les debo'],
            ['me_deben', 'Me deben'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setVista(id)}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid',
              borderColor: vista === id ? 'var(--gold)' : 'var(--hairline)',
              background: vista === id ? 'var(--copper-glow)' : 'var(--panel)',
              color: vista === id ? 'var(--gold)' : 'var(--fg-2)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--fg-3)' }}>Cargando crédito…</p>
      ) : (
        <>
          {vista === 'resumen' && resumen && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <Kpi label="Me deben clientes" value={fmtMoney(resumen.meDeben)} />
                <Kpi label="Les debo productores" value={fmtMoney(resumen.lesDebo)} />
                <Kpi
                  label="Posición neta"
                  value={fmtMoney(resumen.posicionNeta)}
                  tone={resumen.posicionNeta < 0 ? 'var(--crit)' : 'var(--ok)'}
                />
              </div>

              <section
                style={{
                  padding: 18,
                  border: '1px solid',
                  borderColor: posicionSemanal < 0 ? 'var(--crit)' : 'var(--hairline)',
                  background: posicionSemanal < 0 ? 'var(--crit-soft)' : 'var(--panel)',
                  borderRadius: 'var(--radius-card)',
                  marginBottom: 20,
                }}
              >
                <div className="eyebrow" style={{ marginBottom: 12 }}>
                  Timing esta semana
                </div>
                <Row label="Vence esta semana (productores)" value={`−${fmtMoney(resumen.venceSemana)}`} />
                <Row
                  label="Cobros esperados (estimado)"
                  value={`+${fmtMoney(resumen.cobrosEsperadosSemana)}`}
                />
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--hairline)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 13 }}>Posición neta esta semana</span>
                  <span
                    className="mono"
                    style={{
                      fontWeight: 600,
                      color: posicionSemanal < 0 ? 'var(--crit)' : 'var(--ok)',
                    }}
                  >
                    {posicionSemanal < 0 ? '−' : '+'}
                    {fmtMoney(Math.abs(posicionSemanal))}
                  </span>
                </div>
              </section>

              {alertas.map(a => (
                <article
                  key={a.cuenta_id}
                  style={{
                    borderLeft: '2px solid var(--crit)',
                    background: 'var(--crit-soft)',
                    padding: 16,
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--fg-0)', marginBottom: 4 }}>
                    {a.cliente_nombre} — {a.dias_vencido} días sin pagar{' '}
                    {fmtMoney(a.saldo_pendiente)}
                  </div>
                  {a.pedido_numero && (
                    <p className="mono" style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--fg-2)' }}>
                      Pedido activo {a.pedido_numero} para HOY
                    </p>
                  )}
                </article>
              ))}
            </>
          )}

          {vista === 'les_debo' && (
            <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-card)' }}>
              {deudas.length === 0 ? (
                <p style={{ padding: 16, color: 'var(--fg-3)' }}>Sin deudas activas a productores.</p>
              ) : (
                deudas.map((d, i) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderBottom: i < deudas.length - 1 ? '1px solid var(--hairline)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{d.productor}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                        Vence {d.fecha_vencimiento} · {d.tipo}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--warn)' }}>
                      {ESTADO_DEUDA_LABEL[d.estado] || d.estado}
                    </span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {fmtMoney(Number(d.monto))}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMarcarPagado(d.id)}
                      style={btnSmall}
                    >
                      Pagado
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {vista === 'me_deben' && (
            <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-card)' }}>
              {cuentas.length === 0 ? (
                <p style={{ padding: 16, color: 'var(--fg-3)' }}>Sin saldos pendientes de clientes.</p>
              ) : (
                cuentas.map((c, i) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderBottom: i < cuentas.length - 1 ? '1px solid var(--hairline)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{c.clients?.name || 'Cliente'}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                        {c.dias_vencido > 0 ? `${c.dias_vencido} días vencido` : 'Al día'}
                      </div>
                    </div>
                    {c.pedido_activo_hoy && (
                      <span className="mono" style={{ fontSize: 10, color: 'var(--warn)' }}>
                        PEDIDO HOY
                      </span>
                    )}
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {fmtMoney(Number(c.saldo_pendiente))}
                    </span>
                    <button type="button" onClick={() => onRedactarCobro(c)} style={btnSmall}>
                      Redactar cobro
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {cobroModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 30,
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
              background: 'var(--panel)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--hairline)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Cobro · {cobroModal.cliente}
            </div>
            {cobroModal.loading ? (
              <p>Redactando…</p>
            ) : (
              <>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--fg-1)',
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
        vista={vista}
        contexto={proofContext}
        fallback={{
          mensaje:
            vista === 'resumen'
              ? 'Revisa flujo semanal antes de confirmar más pedidos a crédito.'
              : vista === 'les_debo'
                ? 'Prioriza vencimientos de productores esta semana.'
                : 'Cobra antes de entregar si hay deuda vencida.',
          accionLabel: vista === 'me_deben' ? 'Redactar cobro' : 'Ver más',
        }}
        onActionClick={
          vista === 'me_deben' && cuentas[0]
            ? () => onRedactarCobro(cuentas[0]!)
            : undefined
        }
      />
    </div>
  )
}

function Kpi({ label, value, tone = 'var(--fg-0)' }: { label: string; value: string; tone?: string }) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--panel)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: tone }}>
        {value}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 8,
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--fg-2)' }}>{label}</span>
      <span className="mono">{value}</span>
    </div>
  )
}

const btnSmall: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  padding: '6px 10px',
  border: '1px solid var(--line)',
  background: 'var(--canvas)',
  color: 'var(--fg-0)',
  borderRadius: 6,
  cursor: 'pointer',
}
