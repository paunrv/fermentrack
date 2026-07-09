'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
import { PageFrame, PageHeader } from '@fermentrack/ui'
import { getProfileTheme } from '@/lib/proof/profile-theme'
import { fmtMoney } from '@/lib/proof/format'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

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
      <div style={{ flex: 1, height: '0.5px', background: 'var(--hairline)' }} />
      <span
        style={{
          fontSize: 9,
          color: 'var(--fg-3)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: MONO,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--hairline)' }} />
    </div>
  )
}

export default function CreditoPage() {
  const t = useTranslations('distributor.credito')
  const tCommon = useTranslations('distributor.common')
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
      setLoadError(err instanceof Error ? err.message : t('fetchError'))
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
    setCobroModal({
      cliente: nombre,
      mensaje: t('collection.fallbackMessage', {
        name: nombre,
        amount: fmtMoney(cliente.saldo_pendiente),
      }),
      loading: false,
    })
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
    <PageFrame style={{ overflow: 'auto', paddingBottom: 48 }}>
      <PageHeader title={t('title')} description={t('subtitle')} />

      {profileBlocked && (
        <div style={{ margin: '0 0 16px', padding: 16, fontSize: 13, color: 'var(--fg-3)' }}>
          {t('noProfile')}
        </div>
      )}

      {!profileBlocked && loadError && (
        <div
          style={{
            margin: '0 24px 16px',
            padding: '12px 16px',
            borderRadius: 10,
            border: '0.5px solid color-mix(in srgb, var(--crit) 35%, var(--hairline))',
            background: 'color-mix(in srgb, var(--crit) 8%, var(--surface-card))',
            fontSize: 12,
            color: 'var(--crit)',
            lineHeight: 1.5,
          }}
        >
          {t('loadError', { error: loadError })}
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
                background: 'var(--panel-2)',
                animation: 'proof-skeleton-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}

        {!showSkeleton && !profileBlocked && resumen && (
          <>
            <KpiCard
              label={t('kpis.toCollect')}
              value={fmtMoney(resumen.totalPorCobrar)}
              tone={resumen.totalPorCobrar > 0 ? accent : 'var(--fg-0)'}
            />
            <KpiCard
              label={t('kpis.overdueClients')}
              value={String(resumen.clientesVencidos)}
              tone={resumen.clientesVencidos > 0 ? 'var(--crit)' : 'var(--ok)'}
            />
            <KpiCard
              label={t('kpis.collectedThisMonth')}
              value={fmtMoney(resumen.cobradoEsteMes)}
              tone="var(--ok)"
            />
          </>
        )}
      </div>

      <CanvasDivider
        label={
          showSkeleton && !profileBlocked
            ? tCommon('loading')
            : t('dividerClients', { count: deudas.length })
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
                background: 'var(--panel-2)',
                animation: 'proof-skeleton-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}

        {!showSkeleton && !profileBlocked && deudas.length === 0 && (
          <p style={{ gridColumn: '1 / -1', color: 'var(--fg-3)', fontSize: 13, margin: 0 }}>
            {t('emptyBalances')}
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

      <p style={{ padding: '0 24px', margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>
        {t.rich('producerDebts', {
          link: chunks => (
            <Link href="/dashboard/productores" style={{ color: accent }}>
              {chunks}
            </Link>
          ),
        })}
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
              background: 'var(--surface-card)',
              borderRadius: 12,
              border: '0.5px solid var(--hairline)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {detalleLoading && !detalle ? (
              <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>{t('detail.loading')}</p>
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
                  {t('detail.title')}
                </div>
                <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: 'var(--fg-0)' }}>
                  {detalle.cliente_nombre}
                </h2>

                <SectionLabel>{t('detail.ordersWithBalance')}</SectionLabel>
                {detalle.cuentas.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--fg-3)' }}>{t('detail.noActiveAccounts')}</p>
                ) : (
                  detalle.cuentas.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 8,
                        border: '0.5px solid var(--hairline)',
                        background: 'var(--panel-2)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 10, fontFamily: MONO, color: accent }}>
                          {c.pedidos?.numero ?? tCommon('dash')}
                        </span>
                        <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 600 }}>
                          {fmtMoney(Number(c.saldo_pendiente))}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>
                        {t('detail.total', { amount: fmtMoney(Number(c.monto_total)) })}
                        {c.fecha_vencimiento ? ` · ${t('detail.due', { date: c.fecha_vencimiento })}` : ''}
                        {c.pedidos?.fecha_entrega
                          ? ` · ${t('detail.delivery', { date: c.pedidos.fecha_entrega })}`
                          : ''}
                      </div>
                    </div>
                  ))
                )}

                <SectionLabel>{t('detail.payments')}</SectionLabel>
                {detalle.pagos.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--fg-3)' }}>{t('detail.noPayments')}</p>
                ) : (
                  detalle.pagos.map(p => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '0.5px solid var(--hairline)',
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: 'var(--fg-3)' }}>
                        {p.fecha_pago} · {p.metodo}
                        {p.referencia ? ` · ${p.referencia}` : ''}
                      </span>
                      <span style={{ fontFamily: MONO, fontWeight: 600, color: 'var(--ok)' }}>
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
                    {t('detail.draftCollection')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetalle(null)
                      setSelectedCliente(null)
                    }}
                    style={btnSmall}
                  >
                    {t('detail.close')}
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
              background: 'var(--surface-card)',
              borderRadius: 12,
              border: '0.5px solid var(--hairline)',
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
              {t('collection.title', { client: cobroModal.cliente })}
            </div>
            {cobroModal.loading ? (
              <p style={{ color: 'var(--fg-3)' }}>{t('collection.drafting')}</p>
            ) : (
              <>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: MONO,
                    fontSize: 12,
                    color: 'var(--fg-0)',
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
                  {t('collection.copy')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </PageFrame>
  )
}

function KpiCard({
  label,
  value,
  tone = 'var(--fg-0)',
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--surface-card)',
        border: '0.5px solid var(--hairline)',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontFamily: MONO,
          letterSpacing: '0.08em',
          color: 'var(--fg-3)',
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
        color: 'var(--fg-3)',
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
  border: '0.5px solid var(--hairline)',
  background: 'var(--surface-card)',
  color: 'var(--fg-0)',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: MONO,
}
