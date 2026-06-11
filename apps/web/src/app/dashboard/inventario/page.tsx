'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { crearSku, editarSku } from '@/app/actions/skus'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  CATEGORIA_LIQUIDO_OPTIONS,
  categoriaLiquidoLabel,
} from '@/lib/proof/categoria-liquido'
import { fetchSkus, rpcSyncAllSkusForScope } from '@/lib/supabase'
import { mapSkuRowToSKU } from '@/lib/proof/sku-state'
import type { EstadoSKU } from '@/lib/proof/types'
import { fmtBottles, fmtMoney } from '@/lib/proof/format'
import { StatusBadge } from '@/components/proof/StatusBadge'
import { StockBar } from '@/components/proof/StockBar'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'
import type { CategoriaLiquido } from '@/lib/supabase/distribuidor'

type Vista = 'sku' | 'bodega' | 'riesgo'
type Filtro = 'todos' | 'quiebre' | 'sin_rotar' | 'con_deuda' | 'sobrevendido'

export default function InventarioPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [skuRows, setSkuRows] = useState<Awaited<ReturnType<typeof fetchSkus>>>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [vista, setVista] = useState<Vista>('sku')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [categoriaLiquido, setCategoriaLiquido] = useState<CategoriaLiquido>('otro')
  const [precioVenta, setPrecioVenta] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  function resetForm() {
    setNombre('')
    setCategoriaLiquido('otro')
    setPrecioVenta('')
    setEditingId(null)
    setSaveError(null)
  }

  function openCreateForm() {
    resetForm()
    setVista('sku')
    setShowForm(true)
  }

  function openEditForm(skuId: string) {
    const sku = skuRows.find(r => r.id === skuId)
    if (!sku) return

    setEditingId(sku.id)
    setNombre(sku.nombre)
    setCategoriaLiquido(sku.categoria_liquido ?? 'otro')
    setPrecioVenta(String(sku.precio_venta ?? 0))
    setSaveError(null)
    setVista('sku')
    setShowForm(true)
  }

  useEffect(() => {
    if (!showForm) return
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [showForm, editingId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !scope) return

    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        nombre: nombre.trim(),
        categoria_liquido: categoriaLiquido,
        precio_venta: parseFloat(precioVenta) || 0,
        profile_type_v2: scope.profile_type_v2,
      }
      if (editingId) {
        await editarSku(editingId, payload)
      } else {
        await crearSku(payload)
      }
      resetForm()
      setShowForm(false)
      await loadSkus()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el SKU')
    } finally {
      setSaving(false)
    }
  }

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
  const skuRowById = useMemo(() => new Map(skuRows.map(r => [r.id, r])), [skuRows])
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => (showForm ? (resetForm(), setShowForm(false)) : openCreateForm())}
              style={{
                padding: '10px 16px',
                background: showForm ? 'transparent' : 'var(--gold)',
                color: showForm ? 'var(--fg-0)' : 'var(--ink)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                border: showForm ? '1px solid var(--hairline)' : 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              {showForm ? 'Cancelar' : '+ Nuevo SKU'}
            </button>
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
          </div>
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

            {showForm && (
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                style={{
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-card)',
                  padding: 20,
                  marginBottom: 16,
                  background: 'var(--panel)',
                }}
              >
                <h2
                  className="eyebrow"
                  style={{
                    margin: '0 0 16px',
                    fontSize: 10,
                    color: 'var(--fg-3)',
                    letterSpacing: '0.12em',
                  }}
                >
                  {editingId ? 'Editar SKU' : 'Nuevo SKU'}
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
                  <SkuField label="Nombre" span={2}>
                    <input
                      type="text"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      required
                      placeholder="Nombre comercial"
                      style={inputStyle}
                    />
                  </SkuField>
                  <SkuField label="Categoría">
                    <select
                      value={categoriaLiquido}
                      onChange={e => setCategoriaLiquido(e.target.value as CategoriaLiquido)}
                      required
                      style={inputStyle}
                    >
                      {CATEGORIA_LIQUIDO_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </SkuField>
                  <SkuField label="Precio venta">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={precioVenta}
                      onChange={e => setPrecioVenta(e.target.value)}
                      required
                      placeholder="0.00"
                      style={inputStyle}
                    />
                  </SkuField>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    type="submit"
                    disabled={saving || !nombre.trim()}
                    style={{
                      padding: '10px 16px',
                      background: 'var(--gold)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: saving ? 'wait' : 'pointer',
                      opacity: saving || !nombre.trim() ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear SKU'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm()
                      setShowForm(false)
                    }}
                    style={{
                      padding: '10px 16px',
                      background: 'transparent',
                      border: '1px solid var(--hairline)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--fg-2)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

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
                  gridTemplateColumns: '100px 1fr 90px 80px 160px 70px 80px 90px 100px 56px',
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
                <span />
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
                    : null
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px 1fr 90px 80px 160px 70px 80px 90px 100px 56px',
                        gap: 8,
                        padding: '12px 14px',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--hairline)',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
                        {s.id.slice(0, 8)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        {href ? (
                          <Link
                            href={href}
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--fg-0)',
                              textDecoration: 'none',
                            }}
                          >
                            {s.nombre}
                          </Link>
                        ) : (
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
                            {s.nombre}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s.productor}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--fg-2)' }}>
                        {categoriaLiquidoLabel(s.categoriaLiquido)}
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
                      <button
                        type="button"
                        disabled={!skuRowById.has(s.id)}
                        onClick={e => {
                          e.stopPropagation()
                          openEditForm(s.id)
                        }}
                        style={{
                          fontSize: 10,
                          color: 'var(--gold)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        Editar
                      </button>
                    </div>
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
        profileType="distributor"
        hints={{ pantalla: { kpis, skuCount: skus.length, filtro, needsSync } }}
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--panel-2)',
  color: 'var(--fg-0)',
}

function SkuField({
  label,
  children,
  span,
}: {
  label: string
  children: React.ReactNode
  span?: number
}) {
  return (
    <label style={{ gridColumn: span === 2 ? '1 / -1' : undefined }}>
      <div
        className="eyebrow"
        style={{
          fontSize: 9,
          color: 'var(--fg-3)',
          letterSpacing: '0.1em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </label>
  )
}
