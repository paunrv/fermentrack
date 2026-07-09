'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { KpiConfigDrawer } from '@/components/proof/KpiConfigDrawer'
import { useKpiConfig } from '@/hooks/useKpiConfig'
import {
  corridaStats,
  loteEstadoColor,
  loteEstadoLabel,
  resolveDistillerKpi,
  resolveDistributorKpi,
  skuEstadoColor,
  skuEstadoLabel,
} from '@/lib/proof/canvas-kpi'
import { fmtLitros, fmtMoney, parseDateOnlyLocal } from '@/lib/proof/format'
import type { CorridaRow, LoteRow } from '@/lib/proof/destilador-types'
import {
  metricLabel,
  type KpiMetric,
  type ProfileType,
} from '@/lib/proof/kpi-metrics'
import type { DistMovementWithRefs } from '@/lib/supabase'
import { fetchMovimientosSku, fetchSkuById, type SkuRow } from '@/lib/supabase/distribuidor'
import { movimientoSkuToDistMovement } from '@/lib/proof/sku-dist-adapter'
import {
  fetchCorridasByLote,
  fetchLoteById,
  fetchMovimientosInventarioByLote,
  type MovimientoInventarioRow,
} from '@/lib/supabase/destilador'
import type { AppLocale } from '@/i18n/routing'
export interface LoteDetalleProps {
  loteId: string
  profileType: ProfileType
  accent: string
  onClose: () => void
}

interface DataPair {
  label: string
  value: string
}

interface TimelineEvent {
  id: string
  date: string
  detail: string
  tone: string
}

interface CollapsibleSectionData {
  id: string
  icon: React.ReactNode
  title: string
  preview: string
  pairs: DataPair[]
  highlight?: { label: string; value: string }
  progress?: { pct: number; color: string }
  timeline?: TimelineEvent[]
}

function fmtDate(d: string, locale: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    return parseDateOnlyLocal(d).toLocaleDateString(locale)
  }
  return new Date(d).toLocaleDateString(locale)
}

function fmtDateTime(d: string, locale: string): string {
  return new Date(d).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function movimientoTone(tipo: string): string {
  if (tipo.includes('entrada') || tipo.includes('recepcion')) return 'var(--ok)'
  if (tipo.includes('venta') || tipo.includes('salida')) return 'var(--info)'
  if (tipo.includes('merma')) return 'var(--crit)'
  return 'var(--fg-3)'
}

function distMovementTone(type: string): string {
  switch (type) {
    case 'entrada':
      return 'var(--ok)'
    case 'venta':
      return 'var(--info)'
    case 'merma':
      return 'var(--crit)'
    case 'donacion':
    case 'muestra':
      return 'var(--info)'
    default:
      return 'var(--fg-3)'
  }
}

function LoteDetalleSkeleton() {
  return (
    <div style={{ background: 'var(--surface-card)', borderBottom: '0.5px solid var(--hairline)' }}>
      <div style={{ padding: '28px 24px 24px' }}>
        <div
          style={{
            height: 10,
            width: 80,
            background: 'var(--panel-2)',
            borderRadius: 4,
            marginBottom: 12,
          }}
        />
        <div
          style={{
            height: 28,
            width: '60%',
            background: 'var(--panel-2)',
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 12,
            width: '45%',
            background: 'var(--panel-2)',
            borderRadius: 4,
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              padding: 20,
              borderRight: i < 2 ? '0.5px solid var(--hairline)' : undefined,
            }}
          >
            <div
              style={{
                height: 22,
                width: 48,
                background: 'var(--panel-2)',
                borderRadius: 4,
              }}
            />
            <div
              style={{
                height: 10,
                width: 64,
                background: 'var(--panel-2)',
                borderRadius: 4,
                marginTop: 8,
              }}
            />
          </div>
        ))}
      </div>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            padding: '16px 24px',
            borderBottom: '0.5px solid var(--hairline)',
          }}
        >
          <div
            style={{
              height: 14,
              width: '40%',
              background: 'var(--panel-2)',
              borderRadius: 4,
            }}
          />
        </div>
      ))}
    </div>
  )
}

function CollapsibleSection({
  section,
  accent,
}: {
  section: CollapsibleSectionData
  accent: string
}) {
  const [open, setOpen] = useState(false)
  const pairs = section.pairs

  return (
    <div style={{ background: 'var(--surface-card)', borderBottom: '0.5px solid var(--hairline)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--panel-2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ color: 'var(--fg-3)', display: 'flex', flexShrink: 0 }}>{section.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-0)' }}>{section.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 11,
              color: 'var(--fg-3)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {section.preview}
          </span>
          <TiChevronDown open={open} />
        </div>
      </button>
      <div
        style={{
          maxHeight: open ? 400 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
          padding: open ? '0 24px 20px' : '0 24px',
        }}
      >
        {pairs.map((pair, i) => (
          <div
            key={`${pair.label}-${i}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '8px 0',
              borderBottom: i < pairs.length - 1 ? '0.5px solid var(--panel-2)' : 'none',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{pair.label}</span>
            <span
              style={{
                fontSize: 13,
                color: 'var(--fg-0)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                textAlign: 'right',
              }}
            >
              {pair.value}
            </span>
          </div>
        ))}
        {section.progress != null && (
          <div style={{ marginTop: pairs.length > 0 ? 12 : 0 }}>
            <div
              style={{
                height: 4,
                background: 'var(--surface-muted, var(--panel))',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, section.progress.pct)}%`,
                  background: section.progress.color,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        )}
        {section.highlight && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginTop: 14,
              paddingTop: 12,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-0)' }}>
              {section.highlight.label}
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: accent,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {section.highlight.value}
            </span>
          </div>
        )}
        {section.timeline?.map((ev, i) => (
          <div
            key={ev.id}
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 0',
              borderBottom:
                i < (section.timeline?.length ?? 0) - 1 ? '0.5px solid var(--panel-2)' : 'none',
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: ev.tone,
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{ev.detail}</div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--fg-3)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  marginTop: 2,
                }}
              >
                {ev.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function KpiCell({
  value,
  label,
  accent,
  drawerOpen,
  onEditPencil,
  drawer,
  configureKpiLabel,
}: {
  value: string
  label: string
  accent: string
  drawerOpen: boolean
  onEditPencil: () => void
  drawer: React.ReactNode
  configureKpiLabel: string
}) {
  const [hover, setHover] = useState(false)
  const semantic =
    value.includes('%') && parseFloat(value) > 15
      ? 'var(--crit)'
      : value === '—' || value === '0'
        ? 'var(--fg-3)'
        : accent

  return (
    <div
      style={{
        padding: '16px 20px',
        position: 'relative',
        flex: 1,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 500,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          color: semantic,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>{label}</div>
      <button
        type="button"
        aria-label={configureKpiLabel}
        onClick={onEditPencil}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 14,
          height: 14,
          border: 'none',
          background: 'transparent',
          color: 'var(--fg-3)',
          cursor: 'pointer',
          opacity: hover || drawerOpen ? 1 : 0,
          transition: 'opacity 0.15s ease',
          padding: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <TiPencil />
      </button>
      {drawerOpen ? drawer : null}
    </div>
  )
}

type DetailT = ReturnType<typeof useTranslations>

function buildDistillerSections(
  lote: LoteRow,
  corridas: CorridaRow[],
  movimientos: MovimientoInventarioRow[],
  tDetail: DetailT,
  locale: string
): CollapsibleSectionData[] {
  const pv = lote.productos_viaje
  const stats = corridaStats(lote, corridas)
  const ultima = corridas.find(c => c.estado === 'completada')
  const botellasProd = corridas
    .filter(c => c.estado === 'completada')
    .reduce((a, c) => a + c.botellas_producidas, 0)
  const mermaTransitoL = pv?.merma_litros ?? 0
  const mermaTransitoPct =
    pv && Number(pv.litros_acordados) > 0
      ? ((100 * mermaTransitoL) / Number(pv.litros_acordados)).toFixed(1)
      : null
  const materiaPrima =
    pv && Number(pv.litros_acordados) > 0
      ? Number(pv.precio_por_litro) * Number(pv.litros_acordados)
      : null

  const corridaEvents: TimelineEvent[] = corridas.map(c => ({
    id: `corrida-${c.id}`,
    date: fmtDate(c.created_at, locale),
    detail: tDetail('timeline.corrida', {
      formato: c.formato_botella,
      estado: c.estado,
      botellas: c.botellas_producidas,
    }),
    tone: c.estado === 'completada' ? 'var(--ok)' : 'var(--info)',
  }))
  const movEvents: TimelineEvent[] = movimientos.map(m => ({
    id: m.id,
    date: fmtDateTime(m.timestamp, locale),
    detail: m.notas?.trim() || `${m.tipo} · ${m.metodo}`,
    tone: movimientoTone(m.tipo),
  }))
  const timeline = [...corridaEvents, ...movEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return [
    {
      id: 'origen',
      icon: <IconMapPin />,
      title: tDetail('sections.origen'),
      preview: `${lote.comunidad ?? lote.tipo_agave} · ${fmtDate(lote.fecha_recepcion, locale)}`,
      pairs: [
        { label: tDetail('fields.maestro'), value: lote.maestro ?? '—' },
        { label: tDetail('fields.comunidad'), value: lote.comunidad ?? '—' },
        { label: tDetail('fields.agave'), value: lote.tipo_agave },
        { label: tDetail('fields.fechaCompra'), value: fmtDate(lote.fecha_recepcion, locale) },
        {
          label: tDetail('fields.litrosAcordados'),
          value: pv ? fmtLitros(Number(pv.litros_acordados)) : '—',
        },
        { label: tDetail('fields.litrosRecibidos'), value: fmtLitros(stats.recibidos) },
        {
          label: tDetail('fields.mermaTransito'),
          value:
            mermaTransitoPct != null
              ? `${fmtLitros(mermaTransitoL)} · ${mermaTransitoPct}%`
              : fmtLitros(mermaTransitoL),
        },
        {
          label: tDetail('fields.precioLitro'),
          value: pv ? fmtMoney(Number(pv.precio_por_litro)) : '—',
        },
        {
          label: tDetail('fields.saldoPalenquero'),
          value:
            pv?.saldo_pendiente != null ? fmtMoney(Number(pv.saldo_pendiente)) : '—',
        },
      ],
    },
    {
      id: 'produccion',
      icon: <IconBottle />,
      title: tDetail('sections.produccion'),
      preview: tDetail('preview.produccion', {
        bottles: botellasProd,
        merma: stats.mermaPct.toFixed(1),
      }),
      pairs: [
        {
          label: tDetail('fields.fechaEmbotellado'),
          value: lote.fecha_embotellado_programada
            ? fmtDate(lote.fecha_embotellado_programada, locale)
            : ultima
              ? fmtDate(ultima.created_at, locale)
              : '—',
        },
        { label: tDetail('fields.formato'), value: ultima?.formato_botella ?? '—' },
        { label: tDetail('fields.abv'), value: lote.abv != null ? `${lote.abv}%` : '—' },
        { label: tDetail('fields.litrosEmbotellados'), value: fmtLitros(stats.embotellado) },
        {
          label: tDetail('fields.botellasProducidas'),
          value: ultima ? String(ultima.botellas_producidas) : '—',
        },
        {
          label: tDetail('fields.botellasDefectuosas'),
          value: ultima ? String(ultima.botellas_defectuosas) : '—',
        },
        { label: tDetail('fields.mermaPct'), value: `${stats.mermaPct.toFixed(1)}%` },
        { label: tDetail('fields.litrosGarrafon'), value: fmtLitros(stats.granel) },
        { label: tDetail('fields.modoEmbotellado'), value: ultima?.modo ?? '—' },
      ],
      progress: {
        pct: stats.mermaPct,
        color: stats.mermaPct > 15 ? 'var(--crit)' : 'var(--proof-accent)',
      },
    },
    {
      id: 'costo',
      icon: <IconReceipt />,
      title: tDetail('sections.costo'),
      preview:
        ultima?.costo_real_por_botella != null
          ? tDetail('preview.costoBotella', {
              amount: fmtMoney(Number(ultima.costo_real_por_botella)),
            })
          : '—',
      pairs: [
        {
          label: tDetail('fields.materiaPrima'),
          value: materiaPrima != null ? fmtMoney(materiaPrima) : '—',
        },
        {
          label: tDetail('fields.fleteProporcional'),
          value: pv?.flete_proporcional ? fmtMoney(Number(pv.flete_proporcional)) : '—',
        },
        { label: tDetail('fields.botellas'), value: '—' },
        { label: tDetail('fields.etiquetas'), value: '—' },
        {
          label: tDetail('fields.corrida'),
          value: ultima?.costo_corrida != null ? fmtMoney(Number(ultima.costo_corrida)) : '—',
        },
      ],
      highlight: ultima?.costo_real_por_botella
        ? {
            label: tDetail('fields.costoBotella'),
            value: fmtMoney(Number(ultima.costo_real_por_botella)),
          }
        : undefined,
    },
    {
      id: 'movimientos',
      icon: <IconHistory />,
      title: tDetail('sections.movimientos'),
      preview: tDetail('preview.movimientos', { count: timeline.length }),
      pairs: [],
      timeline,
    },
  ]
}

function buildDistributorSections(
  sku: SkuRow,
  movements: DistMovementWithRefs[],
  tSku: DetailT,
  locale: string
): CollapsibleSectionData[] {
  const timeline: TimelineEvent[] = movements.map(m => ({
    id: m.id,
    date: fmtDate(m.movement_date, locale),
    detail: `${m.movement_type} · ${m.cases} cj + ${m.loose_units} uds${
      m.clients?.name ? ` · ${m.clients.name}` : ''
    }`,
    tone: distMovementTone(m.movement_type),
  }))

  return [
    {
      id: 'producto',
      icon: <IconPackage />,
      title: tSku('sections.producto'),
      preview: sku.codigo,
      pairs: [
        { label: tSku('fields.sku'), value: sku.codigo },
        { label: tSku('fields.categoria'), value: sku.categoria },
        { label: tSku('fields.proveedor'), value: sku.productor },
        {
          label: tSku('fields.formato'),
          value: tSku('fields.formatoCaja', { count: sku.botellas_por_caja }),
        },
        { label: tSku('fields.unidadesCaja'), value: String(sku.botellas_por_caja) },
      ],
    },
    {
      id: 'inventario',
      icon: <IconArchive />,
      title: tSku('sections.inventario'),
      preview: tSku('preview.disponible', { count: sku.stock_disponible }),
      pairs: [
        { label: tSku('fields.stockTotal'), value: String(sku.stock_total) },
        { label: tSku('fields.disponible'), value: String(sku.stock_disponible) },
        { label: tSku('fields.reservado'), value: String(sku.stock_reservado) },
        { label: tSku('fields.bodega'), value: sku.bodega },
        {
          label: tSku('fields.ultimaEntrada'),
          value: sku.ultimo_movimiento ? fmtDate(sku.ultimo_movimiento, locale) : '—',
        },
        {
          label: tSku('fields.diasSinMovimiento'),
          value: String(sku.dias_sin_movimiento),
        },
      ],
      progress: {
        pct:
          sku.stock_minimo > 0
            ? Math.min(100, (100 * sku.stock_disponible) / sku.stock_minimo)
            : 100,
        color: sku.stock_disponible <= sku.stock_minimo ? 'var(--warn)' : 'var(--ok)',
      },
    },
    {
      id: 'precios',
      icon: <IconReceipt />,
      title: tSku('sections.precios'),
      preview: fmtMoney(sku.precio_venta),
      pairs: [
        { label: tSku('fields.costo'), value: fmtMoney(sku.costo_unitario) },
        { label: tSku('fields.precioVenta'), value: fmtMoney(sku.precio_venta) },
        {
          label: tSku('fields.margen'),
          value: `${Number(sku.margen_porcentaje).toFixed(0)}%`,
        },
        { label: tSku('fields.historial'), value: '—' },
      ],
      highlight: {
        label: tSku('fields.margen'),
        value: `${Number(sku.margen_porcentaje).toFixed(0)}%`,
      },
    },
    {
      id: 'movimientos',
      icon: <IconHistory />,
      title: tSku('sections.movimientos'),
      preview: tSku('preview.movimientos', { count: timeline.length }),
      pairs: [],
      timeline,
    },
  ]
}

export function LoteDetalle({ loteId, profileType, accent, onClose }: LoteDetalleProps) {
  const t = useTranslations('distiller.common')
  const tDetail = useTranslations('distiller.lotes.detail')
  const tSku = useTranslations('distiller.lotes.skuDetail')
  const locale = useLocale() as AppLocale
  const router = useRouter()
  const supabase = useSupabase()
  const { scope } = useProfile()
  const userId = scope?.user_id

  const [loading, setLoading] = useState(true)
  const [lote, setLote] = useState<LoteRow | null>(null)
  const [corridas, setCorridas] = useState<CorridaRow[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoInventarioRow[]>([])
  const [sku, setSku] = useState<SkuRow | null>(null)
  const [distMovements, setDistMovements] = useState<DistMovementWithRefs[]>([])

  const { config: kpiConfig, updateKpi, loading: kpiLoading } = useKpiConfig(
    profileType,
    loteId
  )
  const [kpiDrawerSlot, setKpiDrawerSlot] = useState<0 | 1 | 2 | null>(null)

  const load = useCallback(async () => {
    if (!userId && profileType === 'distiller') {
      setLoading(false)
      return
    }
    if (!scope && profileType === 'distributor') {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      if (profileType === 'distiller' && userId) {
        const [l, c, m] = await Promise.all([
          fetchLoteById(supabase, userId, loteId),
          fetchCorridasByLote(supabase, userId, loteId),
          fetchMovimientosInventarioByLote(supabase, userId, loteId),
        ])
        setLote(l)
        setCorridas(c)
        setMovimientos(m)
        setSku(null)
        setDistMovements([])
      } else if (profileType === 'distributor' && scope) {
        const s = await fetchSkuById(supabase, scope, loteId)
        setSku(s)
        setLote(null)
        setCorridas([])
        setMovimientos([])
        if (s) {
          const movs = await fetchMovimientosSku(supabase, {
            scope,
            skuId: s.id,
            limit: 25,
          })
          setDistMovements(movs.map(movimientoSkuToDistMovement))
        } else {
          setDistMovements([])
        }
      }
    } catch (e) {
      console.error('LoteDetalle load:', e)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, scope, profileType, loteId])

  useEffect(() => {
    void load()
  }, [load])

  const isDistiller = profileType === 'distiller'

  const kpiValues = useMemo(() => {
    return kpiConfig.map(c => {
      const value = isDistiller
        ? resolveDistillerKpi(c.metric as KpiMetric, lote, lote ? [lote] : [], corridas)
        : resolveDistributorKpi(c.metric as KpiMetric, sku, sku ? [sku] : [])
      return { ...c, value }
    })
  }, [kpiConfig, profileType, isDistiller, lote, corridas, sku])

  const sections = useMemo(() => {
    if (isDistiller && lote) return buildDistillerSections(lote, corridas, movimientos, tDetail, locale)
    if (!isDistiller && sku) return buildDistributorSections(sku, distMovements, tSku, locale)
    return []
  }, [isDistiller, lote, corridas, movimientos, sku, distMovements, tDetail, tSku, locale])

  const actions = useMemo(() => {
    if (isDistiller) {
      return [
        {
          label: tDetail('actions.bulkSale'),
          primary: false,
          onClick: () => router.push('/dashboard'),
        },
        {
          label: tDetail('actions.exportPdf'),
          primary: false,
          onClick: () => window.print(),
        },
        {
          label: tDetail('actions.sellBottles'),
          primary: true,
          onClick: () => router.push('/dashboard/destilador/ventas'),
        },
      ]
    }
    return [
      {
        label: tDetail('actions.viewMovements'),
        primary: false,
        onClick: () => router.push('/dashboard/movimientos'),
      },
      {
        label: tDetail('actions.exportPdf'),
        primary: false,
        onClick: () => window.print(),
      },
      {
        label: tDetail('actions.newOrder'),
        primary: true,
        onClick: () => router.push('/dashboard/pedidos/nuevo'),
      },
    ]
  }, [isDistiller, router, tDetail])

  if (loading) return <LoteDetalleSkeleton />

  const missing = isDistiller ? !lote : !sku
  if (missing) {
    return (
      <div
        style={{
          background: 'var(--surface-card)',
          borderBottom: '0.5px solid var(--hairline)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>{t('notFound.record')}</p>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 12,
            fontSize: 12,
            border: '0.5px solid var(--line)',
            borderRadius: 8,
            padding: '8px 16px',
            background: 'var(--surface-card)',
            cursor: 'pointer',
          }}
        >
          {t('close')}
        </button>
      </div>
    )
  }

  const estadoLabel = isDistiller
    ? loteEstadoLabel(lote!.estado)
    : skuEstadoLabel(sku!.estado)
  const estadoColor = isDistiller
    ? loteEstadoColor(lote!.estado)
    : skuEstadoColor(sku!.estado, accent)
  const nombre = isDistiller ? lote!.tipo_agave : sku!.nombre
  const subtitulo = isDistiller
    ? `${lote!.numero_lote} · ${lote!.maestro ?? '—'} · ${lote!.comunidad ?? '—'}`
    : `${sku!.codigo} · ${sku!.productor}`

  return (
    <div style={{ background: 'var(--surface-card)', borderBottom: '0.5px solid var(--hairline)' }}>
      <div
        style={{
          padding: '28px 24px 24px',
          borderBottom: '0.5px solid var(--hairline)',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeAria')}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 28,
            height: 28,
            border: '0.5px solid var(--line)',
            borderRadius: 8,
            background: 'var(--surface-card)',
            color: 'var(--fg-3)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: estadoColor,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              textTransform: 'uppercase',
              color: 'var(--fg-3)',
              letterSpacing: '0.08em',
            }}
          >
            {estadoLabel}
          </span>
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 500,
            color: 'var(--fg-0)',
            letterSpacing: '-0.02em',
            paddingRight: 36,
          }}
        >
          {nombre}
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 11,
            color: 'var(--fg-3)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {subtitulo}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {kpiValues.map((kpi, i) => (
          <div
            key={kpi.slot}
            style={{
              borderRight: i < kpiValues.length - 1 ? '0.5px solid var(--hairline)' : undefined,
            }}
          >
            <KpiCell
              value={kpiLoading ? '…' : kpi.value}
              label={metricLabel(profileType, kpi.metric as KpiMetric)}
              accent={accent}
              configureKpiLabel={tDetail('configureKpi')}
              drawerOpen={kpiDrawerSlot === kpi.slot}
              onEditPencil={() =>
                setKpiDrawerSlot(prev => (prev === kpi.slot ? null : (kpi.slot as 0 | 1 | 2)))
              }
              drawer={
                <KpiConfigDrawer
                  slot={kpi.slot}
                  profileType={profileType}
                  currentMetric={kpi.metric}
                  currentScope={kpi.scope}
                  accent={accent}
                  onSelect={(metric, scope) => {
                    void updateKpi(kpi.slot, metric, scope)
                  }}
                  onClose={() => setKpiDrawerSlot(null)}
                />
              }
            />
          </div>
        ))}
      </div>

      {sections.map(section => (
        <CollapsibleSection key={section.id} section={section} accent={accent} />
      ))}

      <div
        style={{
          background: 'var(--surface-card)',
          borderTop: '0.5px solid var(--hairline)',
          padding: '20px 24px',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        {actions.map(action => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            style={{
              fontSize: 12,
              borderRadius: 8,
              padding: '10px 14px',
              cursor: 'pointer',
              border: action.primary ? 'none' : '0.5px solid var(--line)',
              background: action.primary ? 'var(--fg-0)' : 'var(--surface-card)',
              color: action.primary ? 'var(--ink)' : 'var(--fg-2)',
              transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={e => {
              if (action.primary) {
                e.currentTarget.style.background = accent
                e.currentTarget.style.borderColor = accent
              } else {
                e.currentTarget.style.borderColor = 'var(--fg-3)'
                e.currentTarget.style.color = 'var(--fg-0)'
              }
            }}
            onMouseLeave={e => {
              if (action.primary) {
                e.currentTarget.style.background = 'var(--fg-0)'
                e.currentTarget.style.borderColor = 'transparent'
              } else {
                e.currentTarget.style.borderColor = 'var(--line)'
                e.currentTarget.style.color = 'var(--fg-2)'
              }
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TiChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--fg-3)"
      strokeWidth="2"
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.25s ease',
        flexShrink: 0,
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function TiPencil() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function IconMapPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
    </svg>
  )
}

export function IconBottle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2h4v4c0 1 1 2 1 3v11c0 1-1 2-3 2h-2c-2 0-3-1-3-2V9c0-1 1-2 1-3V2Z" />
    </svg>
  )
}

export function IconReceipt() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  )
}

export function IconHistory() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function IconPackage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22V12" />
      <path d="m4.5 9 7.5-4 7.5 4" />
      <path d="M4.5 9v11l7.5 4 7.5-4V9" />
    </svg>
  )
}

export function IconArchive() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  )
}
