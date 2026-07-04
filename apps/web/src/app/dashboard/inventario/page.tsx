'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { crearSku, editarSku } from '@/app/actions/skus'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  CATEGORIA_LIQUIDO_OPTIONS,
} from '@/lib/proof/categoria-liquido'
import { fetchSkus } from '@/lib/supabase'
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
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { pageTitleFontSize } from '@/lib/ui/breakpoints'
import { pagePadding } from '@/lib/ui/page-shell'
import type { SKU } from '@/lib/proof/types'

type Filtro = 'todos' | 'quiebre' | 'sin_rotar' | 'con_deuda' | 'sobrevendido'

const FILTRO_IDS: Filtro[] = ['todos', 'quiebre', 'sin_rotar', 'con_deuda', 'sobrevendido']

export default function InventarioPage() {
  const t = useTranslations('distributor.inventario')
  const tCommon = useTranslations('distributor.common')
  const tCat = useTranslations('distributor.liquidCategories')
  const { scope } = useProfile()
  const supabase = useSupabase()
  const breakpoint = useBreakpoint()
  const [skuRows, setSkuRows] = useState<Awaited<ReturnType<typeof fetchSkus>>>([])
  const [loading, setLoading] = useState(true)
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
      setSaveError(err instanceof Error ? err.message : t('saveError'))
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
  }, [scope?.user_id, scope?.profile_type_v2, supabase])

  const skus = useMemo(() => skuRows.map(mapSkuRowToSKU), [skuRows])
  const skuRowById = useMemo(() => new Map(skuRows.map(r => [r.id, r])), [skuRows])
  const isEmpty = !loading && skus.length === 0

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

  const filtroOptions = useMemo(
    () => FILTRO_IDS.map(id => ({ id, label: t(`filters.${id}`) })),
    [t]
  )

  const proofMsg = t('aiFallback', {
    value: fmtMoney(kpis.valor),
    quiebre: kpis.quiebre,
    deadCapital: fmtMoney(kpis.muertoCapital),
  })

  return (
    <div style={pagePadding({ withAiBar: true, breakpoint })}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {isEmpty && (
          <div
            style={{
              marginBottom: 20,
              padding: '16px 18px',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--hairline)',
              background: 'var(--panel)',
            }}
          >
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--fg-0)', lineHeight: 1.5 }}>
              {t('empty.noSkus')}
            </p>
            <Link
              href="/dashboard/productos/nueva"
              style={{
                display: 'inline-block',
                padding: '10px 16px',
                background: 'var(--gold)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {t('empty.createFirstSku')}
            </Link>
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
              {t('title')}
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>{t('subtitle')}</p>
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
              {showForm ? tCommon('cancel') : t('newSku')}
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
              {tCommon('receivingPhoto')}
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
              {editingId ? t('editSku') : t('newSku').replace(/^\+\s*/, '')}
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
              <SkuField label={t('fields.name')} span={2}>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                  placeholder={t('fields.namePlaceholder')}
                  style={inputStyle}
                />
              </SkuField>
              <SkuField label={t('fields.category')}>
                <select
                  value={categoriaLiquido}
                  onChange={e => setCategoriaLiquido(e.target.value as CategoriaLiquido)}
                  required
                  style={inputStyle}
                >
                  {CATEGORIA_LIQUIDO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {tCat(o.value)}
                    </option>
                  ))}
                </select>
              </SkuField>
              <SkuField label={t('fields.salePrice')}>
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
                {saving ? tCommon('saving') : editingId ? tCommon('saveChanges') : t('createSku')}
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
                {tCommon('cancel')}
              </button>
            </div>
          </form>
        )}

        <div className="proof-canvas-stack">
          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title={t('sections.summary')}
            subtitle={loading ? tCommon('loading') : t('sections.skuCount', { count: skus.length })}
            loading={loading}
            itemWidth={132}
            skeletonCount={4}
          >
            <KpiRailChip label={t('kpis.inventoryValue')} value={fmtMoney(kpis.valor)} />
            <KpiRailChip
              label={t('kpis.inShortage')}
              value={String(kpis.quiebre)}
              tone={kpis.quiebre ? 'var(--crit)' : undefined}
            />
            <KpiRailChip label={t('kpis.noRotation60d')} value={String(kpis.sinRotar)} />
            <KpiRailChip label={t('kpis.associatedDebt')} value={fmtMoney(kpis.deuda)} />
          </CanvasHorizontalSection>

          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title={t('sections.catalog')}
            subtitle={t('sections.catalogFiltered', { filtered: filtered.length, total: skus.length })}
            toolbar={
              <HorizontalChipRail options={filtroOptions} value={filtro} onChange={setFiltro} />
            }
            emptyMessage={isEmpty ? t('empty.noSkus') : t('empty.noFilterResults')}
            loading={loading}
            itemWidth={176}
            skeletonCount={3}
          >
            {filtered.map(s => (
              <InventarioSkuRailCard
                key={s.id}
                sku={s}
                href={`/dashboard/productos/${s.id}`}
                canEdit={skuRowById.has(s.id)}
                onEdit={() => openEditForm(s.id)}
              />
            ))}
          </CanvasHorizontalSection>

          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title={t('sections.mainWarehouse')}
            subtitle={t('sections.warehouseCount', { count: bodegaPrincipal.length })}
            emptyMessage={t('empty.mainWarehouse')}
            loading={loading}
            itemWidth={160}
          >
            {bodegaPrincipal.map(s => (
              <BodegaSkuRailCard key={s.id} sku={s} />
            ))}
          </CanvasHorizontalSection>

          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title={t('sections.inTransit')}
            subtitle={t('sections.warehouseCount', { count: bodegaTransito.length })}
            emptyMessage={t('empty.inTransit')}
            loading={loading}
            itemWidth={160}
          >
            {bodegaTransito.map(s => (
              <BodegaSkuRailCard key={s.id} sku={s} />
            ))}
          </CanvasHorizontalSection>

          <CanvasHorizontalSection
            accent={INVENTARIO_ACCENT}
            title={t('sections.risk')}
            subtitle={t('sections.riskSubtitle')}
            loading={loading}
            itemWidth={148}
            skeletonCount={4}
          >
            <RiesgoRailChip title={t('risk.deadCapital')} value={fmtMoney(kpis.muertoCapital)} tone="var(--fg-2)" />
            <RiesgoRailChip title={t('risk.shortages')} value={String(kpis.quiebre)} tone="var(--crit)" />
            <RiesgoRailChip title={t('risk.oversold')} value={String(sobrevendidos)} tone="var(--purple)" />
            <RiesgoRailChip title={t('risk.slowDebt')} value={fmtMoney(kpis.deuda)} tone="var(--warn)" />
          </CanvasHorizontalSection>
        </div>
      </div>

      <ConnectedProofAIBar
        pantalla="inventario"
        profileType="distributor"
        hints={{ pantalla: { kpis, skuCount: skus.length, filtro, isEmpty } }}
        fallback={{ mensaje: proofMsg, accionLabel: tCommon('analyzeWithProof') }}
      />
    </div>
  )
}

function BodegaSkuRailCard({ sku }: { sku: SKU }) {
  const t = useTranslations('distributor.stockBar')
  return (
    <div className="proof-rail-card">
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', lineHeight: 1.3 }}>{sku.nombre}</div>
      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{sku.bodega}</div>
      <div className="mono" style={{ marginTop: 'auto', fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>
        {fmtBottles(sku.stockDisponible)} {t('bottlesUnit')}
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
