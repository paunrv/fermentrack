'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@fermentrack/ui'
import {
  ExistenciaConsumptionBar,
  formatExistenciaUnitsLabel,
} from '@/components/proof/ExistenciaConsumptionBar'
import { useSupabase } from '@/hooks/useSupabase'
import { RegistrarSalidaForm } from '@/components/proof/RegistrarSalidaForm'
import {
  filterFinishedGoodsInventory,
  fetchFinishedGoodsInventory,
  type FinishedGoodsInventoryFilters,
  type FinishedGoodsInventoryView,
} from '@/lib/proof/finished-goods-inventory'

type WinemakerBodegaInventoryProps = {
  organizationId: string
  numeracionEnabled: boolean
  canWrite: boolean
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '6px 12px',
        borderRadius: 999,
        border: active
          ? '1px solid var(--proof-accent, #6940A5)'
          : '1px solid var(--hairline)',
        background: active ? 'color-mix(in srgb, var(--proof-accent) 12%, var(--panel))' : 'var(--panel)',
        color: active ? 'var(--fg-0)' : 'var(--fg-2)',
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

export function WinemakerBodegaInventory({
  organizationId,
  numeracionEnabled,
  canWrite,
}: WinemakerBodegaInventoryProps) {
  const supabase = useSupabase()
  const t = useTranslations('winemaker.bodega')
  const [rawView, setRawView] = useState<FinishedGoodsInventoryView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FinishedGoodsInventoryFilters>({})
  const [openSalidaId, setOpenSalidaId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const view = await fetchFinishedGoodsInventory(supabase, organizationId)
      setRawView(view)
    } catch {
      setError(t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [organizationId, supabase, t])

  useEffect(() => {
    void load()
  }, [load])

  const view = useMemo(
    () => (rawView ? filterFinishedGoodsInventory(rawView, filters) : null),
    [rawView, filters]
  )

  const toggleAnada = (anada: number) => {
    setFilters(prev => ({
      ...prev,
      anada: prev.anada === anada ? null : anada,
    }))
  }

  const toggleFormato = (formato: string) => {
    setFilters(prev => ({
      ...prev,
      formato: prev.formato === formato ? null : formato,
    }))
  }

  const clearFilters = () => setFilters({})

  const hasActiveFilters = filters.anada != null || Boolean(filters.formato)

  if (loading) {
    return <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>{t('loading')}</p>
  }

  if (error) {
    return <p style={{ fontSize: 14, color: 'var(--crit)' }}>{error}</p>
  }

  if (!view || view.groups.length === 0) {
    const emptyKey =
      rawView && rawView.groups.length > 0 && hasActiveFilters ? 'emptyFiltered' : 'empty'
    return (
      <div
        style={{
          marginTop: 8,
          padding: 24,
          borderRadius: 12,
          border: '1px dashed var(--hairline)',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>{t(emptyKey)}</p>
        {emptyKey === 'empty' ? (
          <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--fg-3)' }}>
            {t('emptyHint')}{' '}
            <Link href="/dashboard" style={{ color: 'var(--proof-accent, #6940A5)' }}>
              {t('emptyLink')}
            </Link>
          </p>
        ) : (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--proof-accent, #6940A5)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {t('clearFilters')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(rawView?.filterOptions.anadas.length ?? 0) > 0 ||
      (rawView?.filterOptions.formatos.length ?? 0) > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rawView!.filterOptions.anadas.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8 }}>
                {t('filterAnada')}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {rawView!.filterOptions.anadas.map(anada => (
                  <FilterChip
                    key={anada}
                    active={filters.anada === anada}
                    label={String(anada)}
                    onClick={() => toggleAnada(anada)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {rawView!.filterOptions.formatos.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8 }}>
                {t('filterFormato')}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {rawView!.filterOptions.formatos.map(formato => (
                  <FilterChip
                    key={formato}
                    active={filters.formato === formato}
                    label={formato}
                    onClick={() => toggleFormato(formato)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                alignSelf: 'flex-start',
                fontSize: 12,
                color: 'var(--fg-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {t('clearFilters')}
            </button>
          ) : null}
        </div>
      ) : null}

      {view.groups.map(group => (
        <section
          key={group.id}
          style={{
            border: '1px solid var(--hairline)',
            borderRadius: 12,
            background: 'var(--panel)',
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 16px',
              borderBottom: '1px solid var(--hairline)',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{group.nombre}</h2>
            <span style={{ fontSize: 12, color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}>
              {t('groupTotal', { count: group.totalDisponibles })}
            </span>
          </header>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {group.existencias.map(row => (
              <ExistenciaInventoryItem
                key={row.id}
                row={row}
                canWrite={canWrite}
                numeracionEnabled={numeracionEnabled}
                salidaOpen={openSalidaId === row.id}
                onOpenSalida={() => setOpenSalidaId(row.id)}
                onCloseSalida={() => setOpenSalidaId(null)}
                onSalidaSuccess={() => {
                  setOpenSalidaId(null)
                  void load()
                }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function ExistenciaInventoryItem({
  row,
  canWrite,
  numeracionEnabled,
  salidaOpen,
  onOpenSalida,
  onCloseSalida,
  onSalidaSuccess,
}: {
  row: ExistenciaInventoryRow
  canWrite: boolean
  numeracionEnabled: boolean
  salidaOpen: boolean
  onOpenSalida: () => void
  onCloseSalida: () => void
  onSalidaSuccess: () => void
}) {
  const t = useTranslations('winemaker.bodega')

  const unitsLabel = formatExistenciaUnitsLabel(row.stock, row.botellasPorCaja, {
    botellas: count => t('unitsBotellas', { count }),
    fullCases: (botellas, cajas, porCaja) => t('unitsFullCases', { botellas, cajas, porCaja }),
    brokenCases: (cajas, sueltas) => t('unitsBrokenCases', { cajas, sueltas }),
  })

  return (
    <li
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
          {t('rowMeta', {
            anada: row.anada,
            formato: row.formato,
            lote: row.loteOrigen,
          })}
        </div>
        {row.lowStock ? <Badge variant="warning">{t('lowStockBadge')}</Badge> : null}
      </div>

      <ExistenciaConsumptionBar
        producidas={row.stock.producidas}
        consumidas={row.stock.consumidas}
        disponibles={row.stock.disponibles}
        progressLabel={t('progress', {
          consumidas: row.stock.consumidas,
          producidas: row.stock.producidas,
          disponibles: row.stock.disponibles,
        })}
        unitsLabel={unitsLabel}
        lowStock={row.lowStock}
        lowStockLabel={t('lowStockBadge')}
      />

      {canWrite && row.stock.disponibles > 0 ? (
        salidaOpen ? (
          <RegistrarSalidaForm
            row={row}
            numeracionEnabled={numeracionEnabled}
            onSuccess={onSalidaSuccess}
            onCancel={onCloseSalida}
          />
        ) : (
          <button
            type="button"
            onClick={onOpenSalida}
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--hairline)',
              background: 'var(--panel)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--fg-0)',
            }}
          >
            {t('registerSalida')}
          </button>
        )
      ) : null}
    </li>
  )
}
