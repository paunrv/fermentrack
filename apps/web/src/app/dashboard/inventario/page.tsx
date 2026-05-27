'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchSkus, rpcSyncAllSkusForScope } from '@/lib/supabase'
import { mapSkuRowToSKU } from '@/lib/proof/sku-state'
import type { EstadoSKU } from '@/lib/proof/types'
import { fmtBottles, fmtMoney } from '@/lib/proof/format'
import { StatusBadge } from '@/components/proof/StatusBadge'
import { StockBar } from '@/components/proof/StockBar'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'

type Vista = 'sku' | 'bodega' | 'riesgo'
type Filtro = 'todos' | 'quiebre' | 'sin_rotar' | 'con_deuda' | 'sobrevendido'

const CATEGORIA_LABEL: Record<string, string> = {
  tequila: 'Tequila',
  vino: 'Vino',
  mezcal: 'Mezcal',
  cerveza: 'Cerveza',
  destilado: 'Destilado',
  gin: 'Gin',
  otro: 'Otro',
}

export default function InventarioPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [skuRows, setSkuRows] = useState<Awaited<ReturnType<typeof fetchSkus>>>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [vista, setVista] = useState<Vista>('sku')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  async function loadSkus() {
    if (!scope) return
    setLoading(true)
    try {
      const data = await fetchSkus(supabase, scope)
      setSkuRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSkus()
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  const skus = useMemo(() => skuRows.map(mapSkuRowToSKU), [skuRows])
  const needsSync = !loading && skus.length === 0

  async function onSyncCatalog() {
    if (!scope) return
    setSyncing(true)
    try {
      await rpcSyncAllSkusForScope(supabase, scope.clerk_id, scope.profile_type_v2)
      await loadSkus()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const filtered = useMemo(() => {
    return skus.filter(s => {
      if (filtro === 'quiebre') return s.estado === 'quiebre' || s.estado === 'bajo'
      if (filtro === 'sin_rotar') return s.diasSinMovimiento > 60
      if (filtro === 'con_deuda') return s.deudaAsociada > 0
      if (filtro === 'sobrevendido') return s.estado === 'sobrevendido'
      return true
    })
  }, [skus, filtro])

  const kpis = useMemo(() => {
    const valor = skus.reduce((a, s) => a + s.stockTotal * s.costoUnitario, 0)
    const quiebre = skus.filter(s => s.estado === 'quiebre').length
    const sinRotar = skus.filter(s => s.diasSinMovimiento > 60).length
    const deuda = skus.reduce((a, s) => a + s.deudaAsociada, 0)
    const muertoCapital = skus
      .filter(s => s.estado === 'muerto')
      .reduce((a, s) => a + s.stockTotal * s.costoUnitario, 0)
    return { valor, quiebre, sinRotar, deuda, muertoCapital }
  }, [skus])

  const proofMsg =
    vista === 'riesgo'
      ? `Capital inmovilizado ~${fmtMoney(kpis.muertoCapital)} en SKUs muertos. Prioriza salida antes de nuevo pedido.`
      : `Inventario valorado en ${fmtMoney(kpis.valor)}. ${kpis.quiebre} SKU${kpis.quiebre === 1 ? '' : 's'} en quiebre.`

  return (
    <div style={{ padding: '28px 28px 100px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {needsSync && (
          <div
            style={{
              marginBottom: 20,
              padding: '16px 18px',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--gold)',
              background: 'var(--gold-soft)',
            }}
          >
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--fg-0)', lineHeight: 1.5 }}>
              Sincroniza tu catálogo para activar el inventario PROOF
            </p>
            <button
              type="button"
              onClick={() => void onSyncCatalog()}
              disabled={syncing}
              style={{
                padding: '10px 16px',
                background: 'var(--gold)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: 12,
                fontWeight: 600,
                cursor: syncing ? 'wait' : 'pointer',
              }}
            >
              {syncing ? 'Sincronizando…' : 'Sincronizar catálogo'}
            </button>
          </div>
        )}

        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                margin: '0 0 6px',
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--fg-0)',
                letterSpacing: '-0.02em',
              }}
            >
              Inventario
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
              Stock vivo — disponible vs reservado (tabla skus)
            </p>
          </div>
          <Link
            href="/dashboard/recepcion"
            style={{
              padding: '10px 16px',
              background: 'var(--gold)',
              color: 'var(--ink)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Entrada foto
          </Link>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <Kpi label="Valor inventario" value={loading ? '…' : fmtMoney(kpis.valor)} />
          <Kpi label="En quiebre" value={loading ? '…' : String(kpis.quiebre)} tone={kpis.quiebre ? 'var(--crit)' : undefined} />
          <Kpi label="Sin rotar +60d" value={loading ? '…' : String(kpis.sinRotar)} />
          <Kpi label="Deuda asociada" value={loading ? '…' : fmtMoney(kpis.deuda)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(
            [
              ['sku', 'Por SKU'],
              ['bodega', 'Por bodega'],
              ['riesgo', 'Por riesgo'],
            ] as const
          ).map(([id, label]) => (
            <Tab key={id} active={vista === id} onClick={() => setVista(id)}>
              {label}
            </Tab>
          ))}
        </div>

        {vista === 'sku' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {(
                [
                  ['todos', 'Todos'],
                  ['quiebre', 'Quiebre'],
                  ['sin_rotar', 'Sin rotar'],
                  ['con_deuda', 'Con deuda'],
                  ['sobrevendido', 'Sobrevendido'],
                ] as const
              ).map(([id, label]) => (
                <Tab key={id} small active={filtro === id} onClick={() => setFiltro(id)}>
                  {label}
                </Tab>
              ))}
            </div>

            <div
              style={{
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-card)',
                overflow: 'hidden',
                background: 'var(--panel)',
              }}
            >
              <div
                className="mono"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 90px 80px 160px 70px 80px 90px 100px',
                  gap: 8,
                  padding: '10px 14px',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-3)',
                  borderBottom: '1px solid var(--hairline)',
                  overflowX: 'auto',
                }}
              >
                <span>SKU</span>
                <span>Producto</span>
                <span>Categoría</span>
                <span>Bodega</span>
                <span>Stock</span>
                <span>Rotación</span>
                <span>Días</span>
                <span>Margen</span>
                <span>Estado</span>
              </div>

              {loading ? (
                <div style={{ padding: 32, color: 'var(--fg-3)', fontSize: 13 }}>Cargando…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 12px', color: 'var(--fg-2)' }}>
                    {needsSync
                      ? 'Sin SKUs PROOF. Sincroniza tu catálogo arriba.'
                      : 'Sin resultados para este filtro.'}
                  </p>
                </div>
              ) : (
                filtered.map(s => {
                  const href = s.distProductId
                    ? `/dashboard/productos/${s.distProductId}`
                    : '/dashboard/inventario'
                  return (
                    <Link
                      key={s.id}
                      href={href}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px 1fr 90px 80px 160px 70px 80px 90px 100px',
                        gap: 8,
                        padding: '12px 14px',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--hairline)',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
                        {s.id.slice(0, 8)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>{s.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s.productor}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--fg-2)' }}>
                        {CATEGORIA_LABEL[s.categoria] || s.categoria}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s.bodega}</span>
                      <StockBar
                        disponible={s.stockDisponible}
                        total={s.stockTotal}
                        reservado={s.stockReservado}
                        pedidos={s.pedidosReservados}
                      />
                      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-2)' }}>
                        {s.rotacion30d}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>
                        {s.diasSinMovimiento || '—'}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--gold)' }}>
                        {s.margenPorcentaje}%
                      </span>
                      <StatusBadge estado={s.estado as EstadoSKU} diasSinMovimiento={s.diasSinMovimiento} />
                    </Link>
                  )
                })
              )}
            </div>
          </>
        )}

        {vista === 'bodega' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {['Principal', 'En tránsito'].map(bodega => {
              const items = skus.filter(s =>
                bodega === 'En tránsito' ? s.estado === 'en_transito' : s.bodega === bodega
              )
              return (
                <div
                  key={bodega}
                  style={{
                    padding: 18,
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-card)',
                    background: 'var(--panel)',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--fg-0)', marginBottom: 12 }}>{bodega}</div>
                  {items.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>Sin SKUs</p>
                  ) : (
                    items.slice(0, 5).map(s => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderTop: '1px solid var(--hairline)',
                          fontSize: 13,
                        }}
                      >
                        <span>{s.nombre}</span>
                        <span className="mono" style={{ color: 'var(--fg-2)' }}>
                          {fmtBottles(s.stockDisponible)} bts
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}

        {vista === 'riesgo' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <RiesgoBlock
              title="Capital inmovilizado (muertos)"
              value={fmtMoney(kpis.muertoCapital)}
              tone="var(--fg-2)"
            />
            <RiesgoBlock title="Quiebres" value={String(kpis.quiebre)} tone="var(--crit)" />
            <RiesgoBlock
              title="Sobrevendidos"
              value={String(skus.filter(s => s.estado === 'sobrevendido').length)}
              tone="var(--purple)"
            />
            <RiesgoBlock title="Deuda en inventario lento" value={fmtMoney(kpis.deuda)} tone="var(--warn)" />
          </div>
        )}
      </div>

      <ConnectedProofAIBar
        pantalla="inventario"
        vista={vista}
        contexto={{ kpis, skuCount: skus.length, filtro, needsSync }}
        fallback={{ mensaje: proofMsg, accionLabel: 'Analizar con PROOF' }}
      />
    </div>
  )
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--panel)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em', marginBottom: 6 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: tone || 'var(--fg-0)' }}>
        {value}
      </div>
    </div>
  )
}

function Tab({
  children,
  active,
  small,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  small?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: small ? '6px 12px' : '8px 14px',
        fontSize: small ? 11 : 12,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--gold)' : 'var(--fg-2)',
        background: active ? 'var(--gold-soft)' : 'transparent',
        border: `1px solid ${active ? 'var(--gold)' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function RiesgoBlock({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: string
}) {
  return (
    <div
      style={{
        padding: 18,
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-card)',
        background: 'var(--panel)',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 8 }}>{title}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: tone }}>
        {value}
      </div>
    </div>
  )
}
