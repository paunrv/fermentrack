'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { crearSku, editarSku } from '@/app/actions/skus'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  CATEGORIA_LIQUIDO_OPTIONS,
} from '@/lib/proof/categoria-liquido'
import { fetchSkus, rpcSyncAllSkusForScope } from '@/lib/supabase'
import { mapSkuRowToSKU } from '@/lib/proof/sku-state'
import type { EstadoSKU } from '@/lib/proof/types'
import { fmtBottles, fmtMoney } from '@/lib/proof/format'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'
import { CanvasHorizontalSection } from '@/components/proof/CanvasHorizontalSection'
import { HorizontalChipRail } from '@/components/proof/HorizontalChipRail'
import { InventarioSkuRailCard } from '@/components/proof/InventarioSkuRailCard'
import { KpiRailChip } from '@/components/proof/KpiRailChip'
import { INVENTARIO_ACCENT } from '@/lib/proof/canvas-accents'
import type { CategoriaLiquido } from '@/lib/supabase/distribuidor'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { pagePadding } from '@/lib/ui/page-shell'
import type { SKU } from '@/lib/proof/types'

type Filtro = 'todos' | 'quiebre' | 'sin_rotar' | 'con_deuda' | 'sobrevendido'

const FILTRO_OPTIONS = [
  { id: 'todos' as const, label: 'Todos' },
  { id: 'quiebre' as const, label: 'Quiebre' },
  { id: 'sin_rotar' as const, label: 'Sin rotar' },
  { id: 'con_deuda' as const, label: 'Con deuda' },
  { id: 'sobrevendido' as const, label: 'Sobrevendido' },
]

export default function InventarioPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const isMobile = useIsMobile()
  const [skuRows, setSkuRows] = useState<Awaited<ReturnType<typeof fetchSkus>>>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
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

  const bodegaPrincipal = useMemo(
    () => skus.filter(s => s.bodega === 'Principal' && s.estado !== 'en_transito'),
    [skus]
  )
  const bodegaTransito = useMemo(() => skus.filter(s => s.estado === 'en_transito'), [skus])
  const sobrevendidos = useMemo(() => skus.filter(s => s.estado === 'sobrevendido').length, [skus])

  const proofMsg = `Inventario valorado en ${fmtMoney(kpis.valor)}. ${kpis.quiebre} SKU${kpis.quiebre === 1 ? '' : 's'} en quiebre. Capital inmovilizado ~${fmtMoney(kpis.muertoCapital)}.`

  return (
    <div style={pagePadding({ withAiBar: true, isMobile })}>
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

        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            style={{
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-card)',
              padding: 20,
              marginBottom: 20,
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
              className="proof-form-grid--responsive"
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

        <div className="proof-canvas-stack">
          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title="Resumen"
            subtitle={loading ? 'Cargando…' : `${skus.length} SKU${skus.length !== 1 ? 's' : ''} en catálogo`}
            loading={loading}
            itemWidth={132}
            skeletonCount={4}
          >
            <KpiRailChip label="Valor inventario" value={fmtMoney(kpis.valor)} />
            <KpiRailChip
              label="En quiebre"
              value={String(kpis.quiebre)}
              tone={kpis.quiebre ? 'var(--crit)' : undefined}
            />
            <KpiRailChip label="Sin rotar +60d" value={String(kpis.sinRotar)} />
            <KpiRailChip label="Deuda asociada" value={fmtMoney(kpis.deuda)} />
          </CanvasHorizontalSection>

          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title="Catálogo"
            subtitle={`${filtered.length} de ${skus.length} SKU${skus.length !== 1 ? 's' : ''}`}
            toolbar={
              <HorizontalChipRail options={FILTRO_OPTIONS} value={filtro} onChange={setFiltro} />
            }
            emptyMessage={
              needsSync
                ? 'Sin SKUs PROOF. Sincroniza tu catálogo arriba.'
                : 'Sin resultados para este filtro.'
            }
            loading={loading}
            itemWidth={176}
            skeletonCount={3}
          >
            {filtered.map(s => (
              <InventarioSkuRailCard
                key={s.id}
                sku={s}
                href={s.distProductId ? `/dashboard/productos/${s.distProductId}` : null}
                canEdit={skuRowById.has(s.id)}
                onEdit={() => openEditForm(s.id)}
              />
            ))}
          </CanvasHorizontalSection>

          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title="Bodega principal"
            subtitle={`${bodegaPrincipal.length} SKU${bodegaPrincipal.length !== 1 ? 's' : ''}`}
            emptyMessage="Sin SKUs en bodega principal."
            loading={loading}
            itemWidth={160}
          >
            {bodegaPrincipal.map(s => (
              <BodegaSkuRailCard key={s.id} sku={s} />
            ))}
          </CanvasHorizontalSection>

          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title="En tránsito"
            subtitle={`${bodegaTransito.length} SKU${bodegaTransito.length !== 1 ? 's' : ''}`}
            emptyMessage="Sin SKUs en tránsito."
            loading={loading}
            itemWidth={160}
          >
            {bodegaTransito.map(s => (
              <BodegaSkuRailCard key={s.id} sku={s} />
            ))}
          </CanvasHorizontalSection>

          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title="Riesgo"
            subtitle="Indicadores de capital y stock crítico"
            loading={loading}
            itemWidth={148}
            skeletonCount={4}
          >
            <RiesgoRailChip title="Capital inmovilizado" value={fmtMoney(kpis.muertoCapital)} tone="var(--fg-2)" />
            <RiesgoRailChip title="Quiebres" value={String(kpis.quiebre)} tone="var(--crit)" />
            <RiesgoRailChip title="Sobrevendidos" value={String(sobrevendidos)} tone="var(--purple)" />
            <RiesgoRailChip title="Deuda en lento" value={fmtMoney(kpis.deuda)} tone="var(--warn)" />
          </CanvasHorizontalSection>
        </div>
      </div>

      <ConnectedProofAIBar
        pantalla="inventario"
        profileType="distributor"
        hints={{ pantalla: { kpis, skuCount: skus.length, filtro, needsSync } }}
        fallback={{ mensaje: proofMsg, accionLabel: 'Analizar con PROOF' }}
      />
    </div>
  )
}

function BodegaSkuRailCard({ sku }: { sku: SKU }) {
  return (
    <div className="proof-rail-card">
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', lineHeight: 1.3 }}>{sku.nombre}</div>
      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{sku.bodega}</div>
      <div className="mono" style={{ marginTop: 'auto', fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>
        {fmtBottles(sku.stockDisponible)} bts
      </div>
    </div>
  )
}

function RiesgoRailChip({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: string
}) {
  return (
    <div className="proof-rail-card">
      <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{title}</div>
      <div className="mono" style={{ marginTop: 'auto', fontSize: 20, fontWeight: 700, color: tone }}>
        {value}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 16,
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
