'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { fmtMoney, parseDateOnlyLocal } from '@/lib/proof/format'
import { uniqueCategoriasOrdenCompraItems } from '@/lib/proof/categoria-liquido'
import { CategoriaLiquidoBadge } from '@/components/proof/CategoriaLiquidoBadge'
import {
  pendienteIngresoUnidades,
  type ItemOrdenCompraDistribuidorRow,
  type OrdenCompraConCxP,
  type OrdenCompraDistribuidorWithItems,
  type PagoProveedorRow,
} from '@/lib/supabase/distribuidor'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
const FG = 'var(--fg-0)'

type OrdenInput = OrdenCompraDistribuidorWithItems | OrdenCompraConCxP
type CardEstado = 'en_transito' | 'recibida' | 'problema'

const ESTADO_STYLE = {
  en_transito: {
    dot: 'var(--warn)',
    border: 'color-mix(in srgb, var(--warn) 13%, transparent)',
    line: 'var(--warn)',
  },
  recibida: {
    dot: 'var(--ok)',
    border: 'color-mix(in srgb, var(--ok) 13%, transparent)',
    line: 'var(--ok)',
  },
  problema: {
    dot: 'var(--crit)',
    border: 'color-mix(in srgb, var(--crit) 13%, transparent)',
    line: 'var(--crit)',
  },
} as const

function isConCxP(orden: OrdenInput): orden is OrdenCompraConCxP {
  return 'cxp' in orden && orden.cxp != null
}

function hasDiscrepancia(items: ItemOrdenCompraDistribuidorRow[]): boolean {
  return items.some(
    i => i.cantidad_recibida != null && i.cantidad_recibida !== i.cantidad_ordenada
  )
}

function resolveCardEstado(orden: OrdenInput): CardEstado {
  if (orden.estado === 'cancelada' || hasDiscrepancia(orden.items_orden_compra_distribuidor ?? [])) {
    return 'problema'
  }
  if (orden.estado === 'recibida' || orden.estado === 'parcial') {
    return 'recibida'
  }
  return 'en_transito'
}

function buildConcepto(items: ItemOrdenCompraDistribuidorRow[], emptyProductsLabel: string): string {
  if (items.length === 0) return emptyProductsLabel
  if (items.length === 1) {
    const it = items[0]!
    if (it.cantidad_ordenada > 1) {
      return `${it.cantidad_ordenada} ${it.producto_nombre}`
    }
    return it.producto_nombre
  }
  return items.map(i => i.producto_nombre).join(' · ')
}

function fmtApertura(iso: string, locale: AppLocale): string {
  return parseDateOnlyLocal(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })
}

function ordinalPago(n: number, locale: AppLocale): string {
  if (locale.startsWith('es')) {
    const map = ['1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo']
    return map[n - 1] ?? `${n}º`
  }
  const map = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']
  return map[n - 1] ?? `${n}th`
}

function fmtPagoFecha(fecha: string, locale: AppLocale): string {
  return parseDateOnlyLocal(fecha).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })
}

function montoOrden(orden: OrdenInput): number {
  const cxp = isConCxP(orden) ? orden.cxp : null
  if (cxp) return Number(cxp.monto_total)
  if (Number(orden.total_acordado) > 0) return Number(orden.total_acordado)
  const items = orden.items_orden_compra_distribuidor ?? []
  return items.reduce((s, i) => s + Number(i.subtotal ?? i.cantidad_ordenada * i.costo_unitario), 0)
}

export function OrdenCompraCanvasCard({
  orden,
  selected = false,
  onClick,
  onConfirmIngreso,
  confirmingIngreso = false,
  accent = 'var(--fg-0)',
}: {
  orden: OrdenInput
  accent?: string
  selected?: boolean
  onClick: () => void
  onConfirmIngreso?: (ordenId: string) => void
  confirmingIngreso?: boolean
}) {
  const t = useTranslations('distributor.compras.card')
  const locale = useLocale() as AppLocale
  const cardEstado = resolveCardEstado(orden)
  const style = ESTADO_STYLE[cardEstado]
  const items = orden.items_orden_compra_distribuidor ?? []
  const categorias = uniqueCategoriasOrdenCompraItems(items)
  const concepto = buildConcepto(items, t('emptyProducts'))
  const cxp = isConCxP(orden) ? orden.cxp : null
  const pagos: PagoProveedorRow[] = cxp?.pagos ?? []
  const liquidado = cxp != null && Number(cxp.saldo_pendiente) <= 0
  const statusLineColor =
    cardEstado === 'problema'
      ? ESTADO_STYLE.problema.line
      : liquidado && cardEstado === 'recibida'
        ? ESTADO_STYLE.recibida.line
        : style.line

  const pagoLabel =
    cardEstado === 'en_transito' || !cxp
      ? t('paymentTotal')
      : liquidado
        ? t('paymentSettled')
        : t('paymentBalance')
  const pagoValor =
    cardEstado === 'en_transito' || !cxp
      ? montoOrden(orden)
      : liquidado
        ? Number(cxp.monto_total)
        : Number(cxp.saldo_pendiente)

  const borderColor = selected ? FG : style.border
  const pendienteIngreso = pendienteIngresoUnidades(items)
  const puedeConfirmarIngreso =
    ['pendiente', 'parcial'].includes(orden.estado) &&
    pendienteIngreso > 0 &&
    onConfirmIngreso != null

  return (
    <div
      style={{
        width: '100%',
        textAlign: 'left',
        background: selected ? 'var(--panel-2)' : 'var(--surface-card)',
        border: selected ? `1.5px solid ${FG}` : `0.5px solid ${borderColor}`,
        borderRadius: 12,
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s ease',
      }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Orden ${orden.numero_orden}${selected ? ', seleccionado' : ''}`}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
      <div style={{ padding: '14px 14px 10px' }}>
        <div
          style={{
            fontSize: 9,
            fontFamily: MONO,
            color: 'var(--fg-3)',
            letterSpacing: '0.04em',
            marginBottom: 6,
          }}
        >
          {orden.numero_orden} · {orden.proveedor_nombre || 'Proveedor'}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: FG,
            lineHeight: 1.3,
            marginBottom: 6,
          }}
        >
          {concepto}
        </div>
        {categorias.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {categorias.map(cat => (
              <CategoriaLiquidoBadge key={cat} categoria={cat} size="xs" />
            ))}
          </div>
        ) : null}
        <div style={{ fontSize: 10, fontFamily: MONO, color: 'var(--fg-3)' }}>
          {fmtApertura(orden.created_at, locale)}
        </div>
      </div>

      <div
        style={{
          padding: '10px 14px 15px',
          borderTop: '0.5px solid var(--panel-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span
            className={cardEstado === 'problema' ? 'oc-card-dot-pulse' : undefined}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: style.dot,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontFamily: MONO,
              color: style.dot,
              letterSpacing: '0.02em',
            }}
          >
            {t(`status.${cardEstado}`)}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: MONO,
              color: pagoLabel === t('paymentSettled') ? 'var(--ok)' : 'var(--fg-3)',
            }}
          >
            {pagoLabel}
          </span>
          <span
            style={{
              fontSize: 12,
              fontFamily: MONO,
              fontWeight: 600,
              color: FG,
            }}
          >
            {fmtMoney(pagoValor)}
          </span>
        </div>

        {pagos.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {pagos.map((p, i) => (
              <div
                key={p.id}
                style={{
                  fontSize: 10,
                  fontFamily: MONO,
                  color: 'var(--fg-3)',
                }}
              >
                {t('paymentLine', { ordinal: ordinalPago(i + 1, locale), amount: fmtMoney(Number(p.monto)), date: fmtPagoFecha(p.fecha_pago, locale) })}
              </div>
            ))}
          </div>
        )}
      </div>
      </button>

      {puedeConfirmarIngreso ? (
        <div style={{ padding: '0 14px 14px' }}>
          <button
            type="button"
            disabled={confirmingIngreso}
            onClick={e => {
              e.stopPropagation()
              onConfirmIngreso(orden.id)
            }}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: 'none',
              background: accent,
              color: 'var(--ink)',
              fontSize: 11,
              fontWeight: 600,
              cursor: confirmingIngreso ? 'wait' : 'pointer',
              opacity: confirmingIngreso ? 0.7 : 1,
              fontFamily: 'var(--font-display)',
            }}
          >
            {confirmingIngreso
              ? t('confirmingInbound')
              : t('confirmInbound', { count: pendienteIngreso.toLocaleString(locale) })}
          </button>
        </div>
      ) : null}

      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: statusLineColor,
        }}
      />

      <style>{`
        @keyframes oc-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }
        .oc-card-dot-pulse {
          animation: oc-dot-pulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
