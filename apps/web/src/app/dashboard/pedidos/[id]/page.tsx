'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchSkus,
  fetchPedidoWithItems,
  fetchRemisionByPedidoId,
  replacePedidoItems,
  rpcConfirmarPedido,
  subscribeSkuStock,
  type SkuRow,
  type PedidoWithItems,
  type RemisionDistribuidorRow,
  type EstadoPedido,
} from '@/lib/supabase'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'
import { PedidoTomaDetalle } from '@/components/proof/PedidoTomaDetalle'
import { RemisionPedidoActions } from '@/components/proof/RemisionPedidoActions'
import { PedidoFulfillmentActions } from '@/components/proof/PedidoFulfillmentActions'
import { parseTomaPedidoNotas } from '@/lib/proof/toma-pedido-client'
import { fmtBottles, fmtMoney } from '@/lib/proof/format'

type CartLine = {
  sku_id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  disponible_al_crear: number
}

function priceForTier(
  sku: SkuRow,
  tier: 'regular' | 'mayoreo' | 'especial'
): number {
  return Number(sku.precio_venta)
}

export default function PedidoComposerPage() {
  const params = useParams()
  const router = useRouter()
  const pedidoId = params.id as string
  const { scope } = useProfile()
  const supabase = useSupabase()

  const [pedido, setPedido] = useState<PedidoWithItems | null>(null)
  const [skus, setSkus] = useState<SkuRow[]>([])
  const [lines, setLines] = useState<CartLine[]>([])
  const [addSkuId, setAddSkuId] = useState('')
  const [addQty, setAddQty] = useState('12')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remision, setRemision] = useState<RemisionDistribuidorRow | null>(null)

  const skuMap = useMemo(() => new Map(skus.map(s => [s.id, s])), [skus])

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      fetchPedidoWithItems(supabase, pedidoId),
      scope ? fetchSkus(supabase, scope) : Promise.resolve([]),
    ])
    setPedido(p)
    setSkus(s)
    if (p?.estado === 'entregado' && scope) {
      const r = await fetchRemisionByPedidoId(supabase, pedidoId, scope).catch(() => null)
      setRemision(r)
    } else {
      setRemision(null)
    }
    if (p?.items_pedido?.length) {
      setLines(
        p.items_pedido.map(it => ({
          sku_id: it.sku_id,
          nombre: it.nombre,
          cantidad: it.cantidad,
          precio_unitario: Number(it.precio_unitario),
          disponible_al_crear: it.disponible_al_crear,
        }))
      )
    }
  }, [supabase, pedidoId, scope?.user_id, scope?.profile_type_v2])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    load()
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pedidoId, scope?.user_id, scope?.profile_type_v2, load])

  useEffect(() => {
    if (!scope) return
    return subscribeSkuStock(supabase, scope, payload => {
      setSkus(prev =>
        prev.map(s =>
          s.id === payload.id
            ? {
                ...s,
                stock_total: payload.stock_total,
                stock_reservado: payload.stock_reservado,
                stock_disponible: payload.stock_disponible,
                estado: payload.estado,
              }
            : s
        )
      )
    })
  }, [supabase, scope?.user_id, scope?.profile_type_v2])

  const editable = pedido?.estado === 'borrador'

  const linesWithStock = useMemo(() => {
    return lines.map(line => {
      const sku = skuMap.get(line.sku_id)
      const disponible = sku?.stock_disponible ?? 0
      const over = line.cantidad > disponible
      return { ...line, disponible, over }
    })
  }, [lines, skuMap])

  const hasOverstock = linesWithStock.some(l => l.over)
  const total = linesWithStock.reduce((a, l) => a + l.cantidad * l.precio_unitario, 0)

  const proofMessage = hasOverstock
    ? 'Hay ítems sin stock suficiente. Ajusta cantidades o espera entrada antes de confirmar.'
    : lines.length === 0
      ? 'Agrega botellas al pedido. El stock se reserva solo al confirmar.'
      : `Listo para confirmar · ${fmtBottles(lines.reduce((a, l) => a + l.cantidad, 0))} botellas · ${fmtMoney(total)}`

  function addLine() {
    const sku = skuMap.get(addSkuId)
    if (!sku) return
    const qty = Math.max(1, parseInt(addQty, 10) || 1)
    const tier = (pedido?.clients?.price_tier as 'regular' | 'mayoreo' | 'especial') || 'regular'
    const price = priceForTier(sku, tier)

    setLines(prev => {
      const idx = prev.findIndex(l => l.sku_id === sku.id)
      if (idx >= 0) {
        const next = [...prev]
        const row = next[idx]!
        next[idx] = { ...row, cantidad: row.cantidad + qty }
        return next
      }
      return [
        ...prev,
        {
          sku_id: sku.id,
          nombre: sku.nombre,
          cantidad: qty,
          precio_unitario: price,
          disponible_al_crear: sku.stock_disponible,
        },
      ]
    })
    setAddSkuId('')
    setAddQty('12')
  }

  function updateQty(skuId: string, cantidad: number) {
    setLines(prev =>
      prev.map(l => (l.sku_id === skuId ? { ...l, cantidad: Math.max(1, cantidad) } : l))
    )
  }

  function removeLine(skuId: string) {
    setLines(prev => prev.filter(l => l.sku_id !== skuId))
  }

  async function saveDraft() {
    if (!editable) return
    setSaving(true)
    setError(null)
    try {
      await replacePedidoItems(supabase, pedidoId, lines)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function confirmar() {
    if (!editable || hasOverstock || lines.length === 0) return
    setConfirming(true)
    setError(null)
    try {
      await replacePedidoItems(supabase, pedidoId, lines)
      const updated = await rpcConfirmarPedido(supabase, pedidoId)
      setPedido(prev => (prev ? { ...prev, ...updated, estado: updated.estado as EstadoPedido } : prev))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, color: 'var(--fg-3)' }}>Cargando compositor…</div>
    )
  }

  if (!pedido) {
    return (
      <div style={{ padding: 48 }}>
        <p>Pedido no encontrado.</p>
        <Link href="/dashboard/pedidos">Volver</Link>
      </div>
    )
  }

  const tomaNotas = parseTomaPedidoNotas(pedido.notas)
  if (tomaNotas) {
    return (
      <PedidoTomaDetalle
        pedido={pedido}
        toma={tomaNotas}
        remision={remision}
        onEntregado={() => void load()}
      />
    )
  }

  return (
    <div style={{ padding: '28px 28px 100px', maxWidth: 720, margin: '0 auto' }}>
      <Link href="/dashboard/pedidos" style={{ fontSize: 12, color: 'var(--fg-3)', textDecoration: 'none' }}>
        ← Pedidos
      </Link>

      <header style={{ margin: '16px 0 24px' }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 6 }}>
          {pedido.numero}
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: 'var(--fg-0)' }}>
          Compositor
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)' }}>
          {pedido.clients?.name || 'Cliente'}
          {pedido.etiqueta_nombre ? ` · ${pedido.etiqueta_nombre}` : ''} · Entrega{' '}
          {pedido.fecha_entrega} ·{' '}
          <span style={{ color: pedido.estado === 'borrador' ? 'var(--warn)' : 'var(--ok)' }}>
            {pedido.estado}
          </span>
        </p>
      </header>

      {editable && (
        <section
          style={{
            padding: 16,
            marginBottom: 20,
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--panel)',
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Agregar SKU
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 8 }}>
            <select value={addSkuId} onChange={e => setAddSkuId(e.target.value)} style={fieldStyle}>
              <option value="">Producto…</option>
              {skus.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {fmtBottles(s.stock_disponible)} disp.
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={addQty}
              onChange={e => setAddQty(e.target.value)}
              style={fieldStyle}
              className="mono"
            />
            <button type="button" onClick={addLine} disabled={!addSkuId} style={btnSecondary}>
              +
            </button>
          </div>
        </section>
      )}

      <section style={{ marginBottom: 20 }}>
        {linesWithStock.length === 0 ? (
          <p style={{ color: 'var(--fg-3)', fontSize: 14 }}>Sin ítems en el pedido.</p>
        ) : (
          <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-card)' }}>
            {linesWithStock.map((line, i) => (
              <div
                key={line.sku_id}
                style={{
                  padding: '14px 16px',
                  borderBottom:
                    i < linesWithStock.length - 1 ? '1px solid var(--hairline)' : 'none',
                  borderLeft: line.over ? '2px solid var(--crit)' : '2px solid transparent',
                  background: line.over ? 'var(--crit-soft)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{line.nombre}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                      Disp. {fmtBottles(line.disponible)} bts
                      {line.over && (
                        <span style={{ color: 'var(--crit)', marginLeft: 8 }}>SIN STOCK</span>
                      )}
                    </div>
                  </div>
                  {editable ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        min={1}
                        value={line.cantidad}
                        onChange={e => updateQty(line.sku_id, parseInt(e.target.value, 10) || 1)}
                        className="mono"
                        style={{
                          ...fieldStyle,
                          width: 72,
                          color: line.over ? 'var(--crit)' : 'var(--fg-0)',
                          fontWeight: 600,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(line.sku_id)}
                        style={{ ...btnSecondary, padding: '6px 10px' }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {line.cantidad} bts
                    </span>
                  )}
                </div>
                <div
                  className="mono"
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: 'var(--fg-2)',
                    textAlign: 'right',
                  }}
                >
                  {fmtMoney(line.cantidad * line.precio_unitario)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 14, color: 'var(--fg-2)' }}>Total</span>
        <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>
          {fmtMoney(total)}
        </span>
      </div>

      {error && (
        <p style={{ color: 'var(--crit)', fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      <div style={{ marginBottom: 16 }}>
        <PedidoFulfillmentActions
          pedidoId={pedidoId}
          numero={pedido.numero}
          estado={pedido.estado}
          accent="var(--gold)"
          fullWidth
          onUpdated={() => void load()}
        />
      </div>

      <RemisionPedidoActions
        pedidoId={pedidoId}
        estado={pedido.estado}
        initialRemision={
          remision
            ? {
                numero: remision.numero_remision,
                hasPdf: Boolean(remision.pdf_url?.trim()),
                downloadUrl: null,
              }
            : null
        }
      />

      {editable && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={saveDraft} disabled={saving} style={btnSecondary}>
            {saving ? 'Guardando…' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={confirming || hasOverstock || lines.length === 0}
            style={{
              ...ctaStyle,
              opacity: confirming || hasOverstock || lines.length === 0 ? 0.5 : 1,
            }}
          >
            {confirming ? 'Confirmando…' : 'Confirmar pedido'}
          </button>
        </div>
      )}

      <ConnectedProofAIBar
        pantalla="pedidos"
        vista="compositor"
        profileType="distributor"
        hints={{
          pantalla: {
            pedidoId,
            estado: pedido?.estado,
            hasOverstock,
            lineCount: lines.length,
            total,
          },
        }}
        fallback={{
          mensaje: proofMessage,
          accionLabel: hasOverstock ? 'Ver inventario' : 'Preguntar a PROOF',
          accionHref: '/dashboard/inventario',
        }}
      />
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  padding: '8px 10px',
  background: 'var(--canvas)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--fg-0)',
  fontSize: 13,
}

const ctaStyle: React.CSSProperties = {
  padding: '12px 18px',
  background: 'var(--gold)',
  border: 'none',
  color: 'var(--ink)',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '10px 14px',
  background: 'var(--panel)',
  border: '1px solid var(--line)',
  color: 'var(--fg-1)',
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}
