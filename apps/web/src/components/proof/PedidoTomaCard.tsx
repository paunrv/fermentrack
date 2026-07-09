'use client'

import type { SkuRow } from '@/lib/supabase/distribuidor'
import { fmtBottles, fmtMoney } from '@/lib/proof/format'

export type TomaLine = {
  sku_id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  disponible_al_crear: number
}

type Props = {
  numero: string
  clienteName: string
  etiquetaName: string
  estado: 'borrador' | 'confirmado' | string
  skus: SkuRow[]
  lines: TomaLine[]
  addSkuId: string
  addQty: string
  saving: boolean
  confirming: boolean
  onAddSkuId: (id: string) => void
  onAddQty: (qty: string) => void
  onAddLine: () => void
  onUpdateQty: (skuId: string, cantidad: number) => void
  onRemoveLine: (skuId: string) => void
  onSave: () => void
  onConfirm: () => void
}

export function PedidoTomaCard({
  numero,
  clienteName,
  etiquetaName,
  estado,
  skus,
  lines,
  addSkuId,
  addQty,
  saving,
  confirming,
  onAddSkuId,
  onAddQty,
  onAddLine,
  onUpdateQty,
  onRemoveLine,
  onSave,
  onConfirm,
}: Props) {
  const editable = estado === 'borrador'
  const skuMap = new Map(skus.map(s => [s.id, s]))

  const linesView = lines.map(line => {
    const sku = skuMap.get(line.sku_id)
    const disponible = sku?.stock_disponible ?? 0
    const over = line.cantidad > disponible
    return { ...line, disponible, over }
  })

  const hasOverstock = linesView.some(l => l.over)
  const total = linesView.reduce((a, l) => a + l.cantidad * l.precio_unitario, 0)
  const botellas = linesView.reduce((a, l) => a + l.cantidad, 0)

  return (
    <article
      style={{
        border: '1px solid var(--hairline)',
        borderRadius: 12,
        background: 'var(--panel)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 4 }}>
            {numero}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-0)' }}>{clienteName}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginTop: 2 }}>
            {etiquetaName}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: estado === 'confirmado' ? 'var(--ok)' : 'var(--warn)',
          }}
        >
          {estado}
        </span>
      </header>

      {editable && (
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid var(--hairline)',
            background: 'var(--canvas)',
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Agregar producto
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 44px', gap: 8 }}>
            <select
              value={addSkuId}
              onChange={e => onAddSkuId(e.target.value)}
              style={fieldStyle}
            >
              <option value="">SKU o producto…</option>
              {skus.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {fmtBottles(s.stock_disponible)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={addQty}
              onChange={e => onAddQty(e.target.value)}
              style={fieldStyle}
              className="mono"
            />
            <button type="button" onClick={onAddLine} disabled={!addSkuId} style={btnSmall}>
              +
            </button>
          </div>
          {skus.length === 0 && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
              Sin SKUs para «{etiquetaName}». Asigna la etiqueta en inventario o agrega productos al
              catálogo.
            </p>
          )}
        </div>
      )}

      <div style={{ padding: '8px 0' }}>
        {linesView.length === 0 ? (
          <p style={{ margin: 0, padding: '12px 16px', fontSize: 13, color: 'var(--fg-3)' }}>
            Sin productos — agrega arriba
          </p>
        ) : (
          linesView.map((line, i) => (
            <div
              key={line.sku_id}
              style={{
                padding: '10px 16px',
                borderBottom:
                  i < linesView.length - 1 ? '1px solid var(--hairline)' : 'none',
                borderLeft: line.over ? '2px solid var(--crit)' : '2px solid transparent',
                background: line.over ? 'var(--crit-soft)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{line.nombre}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>
                    Disp. {fmtBottles(line.disponible)}
                    {line.over && <span style={{ color: 'var(--crit)', marginLeft: 6 }}>sin stock</span>}
                  </div>
                </div>
                {editable ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      min={1}
                      value={line.cantidad}
                      onChange={e => onUpdateQty(line.sku_id, parseInt(e.target.value, 10) || 1)}
                      className="mono"
                      style={{
                        ...fieldStyle,
                        width: 64,
                        fontWeight: 600,
                        color: line.over ? 'var(--crit)' : 'var(--fg-0)',
                      }}
                    />
                    <button type="button" onClick={() => onRemoveLine(line.sku_id)} style={btnSmall}>
                      ×
                    </button>
                  </div>
                ) : (
                  <span className="mono" style={{ fontWeight: 600 }}>
                    {line.cantidad}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <footer
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--hairline)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span className="mono" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
          {fmtBottles(botellas)} · {fmtMoney(total)}
        </span>
        {editable && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onSave} disabled={saving} style={btnSecondary}>
              {saving ? '…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming || hasOverstock || lines.length === 0}
              style={{
                ...btnPrimary,
                opacity: confirming || hasOverstock || lines.length === 0 ? 0.45 : 1,
              }}
            >
              {confirming ? '…' : 'Confirmar'}
            </button>
          </div>
        )}
      </footer>
    </article>
  )
}

const fieldStyle: React.CSSProperties = {
  padding: '8px 10px',
  background: 'var(--surface-card)',
  border: '1px solid var(--hairline)',
  borderRadius: 8,
  color: 'var(--fg-0)',
  fontSize: 13,
  width: '100%',
}

const btnSmall: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--panel)',
  cursor: 'pointer',
  fontSize: 14,
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'transparent',
  cursor: 'pointer',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  border: 'none',
  borderRadius: 8,
  background: 'var(--gold)',
  color: 'var(--ink)',
  cursor: 'pointer',
}
