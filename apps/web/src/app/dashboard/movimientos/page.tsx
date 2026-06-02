'use client'

import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchClients,
  fetchDistInventory,
  fetchDistMovements,
  createDistMovement,
  updateDistInventory,
  type Client,
  type DistInventoryRow,
  type DistMovementWithRefs,
  type ProductCategory,
} from '@/lib/supabase'

const font = "'Space Grotesk', sans-serif"

type SalidaType = 'venta' | 'donacion' | 'merma' | 'muestra'

const TYPE_LABELS: Record<SalidaType, string> = {
  venta: 'Venta',
  donacion: 'Donación',
  merma: 'Merma',
  muestra: 'Muestra',
}

const TYPE_BG: Record<SalidaType, string> = {
  venta: '#C0DD97',
  donacion: '#B5D4F4',
  merma: '#F4C0D1',
  muestra: '#FAC775',
}

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  cerveza: '#FAC775',
  vino: '#9FE1CB',
  destilado: '#F5C4B3',
}

const MERMA_REASONS = ['rota', 'vencida', 'dañada', 'otro'] as const
type MermaReason = (typeof MERMA_REASONS)[number]

const SALIDA_TYPES: SalidaType[] = ['venta', 'donacion', 'merma', 'muestra']

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: '#111',
  marginBottom: 6,
}

const input: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '3px solid #111',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: '#111',
  outline: 'none',
  fontFamily: font,
}

function formatMoney(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function priceForTier(
  product: DistInventoryRow,
  tier: Client['price_tier']
): number {
  if (tier === 'mayoreo') return Number(product.price_mayoreo)
  if (tier === 'especial') return Number(product.price_especial)
  return Number(product.price_regular)
}

function totalAvailable(row: DistInventoryRow): number {
  const inv = row.inventory
  if (!inv) return 0
  return inv.cases * row.bottles_per_case + inv.loose_units
}

export default function MovimientosPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [type, setType] = useState<SalidaType>('venta')
  const [inventory, setInventory] = useState<DistInventoryRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [movements, setMovements] = useState<DistMovementWithRefs[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [productId, setProductId] = useState('')
  const [cases, setCases] = useState('')
  const [looseUnits, setLooseUnits] = useState('')
  const [notes, setNotes] = useState('')

  const [clientId, setClientId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')

  const [recipient, setRecipient] = useState('')
  const [reason, setReason] = useState<MermaReason>('rota')
  const [event, setEvent] = useState('')

  const today = useMemo(() => todayISO(), [])

  const productMap = useMemo(
    () => Object.fromEntries(inventory.map(p => [p.id, p])),
    [inventory]
  )
  const clientMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c])),
    [clients]
  )

  const selectedProduct = productId ? productMap[productId] : null
  const selectedClient = clientId ? clientMap[clientId] : null

  const totalUnits = useMemo(() => {
    const c = parseInt(cases, 10) || 0
    const u = parseInt(looseUnits, 10) || 0
    if (!selectedProduct) return 0
    return c * selectedProduct.bottles_per_case + u
  }, [cases, looseUnits, selectedProduct])

  const computedTotal = useMemo(() => {
    const price = parseFloat(unitPrice) || 0
    return totalUnits * price
  }, [unitPrice, totalUnits])

  useEffect(() => {
    if (type !== 'venta') return
    if (!selectedProduct || !selectedClient) return
    const p = priceForTier(selectedProduct, selectedClient.price_tier)
    if (p > 0) setUnitPrice(String(p))
  }, [type, productId, clientId, selectedProduct, selectedClient])

  async function load() {
    const [inv, cls, movs] = await Promise.all([
      fetchDistInventory(supabase, scope ?? undefined),
      fetchClients(supabase, scope ?? undefined),
      fetchDistMovements(supabase, { date: today, scope: scope ?? undefined }),
    ])
    setInventory(inv)
    setClients(cls)
    setMovements(movs)
    if (inv.length && !productId && inv[0]) setProductId(inv[0].id)
    if (cls.length && !clientId && cls[0]) setClientId(cls[0].id)
  }

  useEffect(() => {
    if (!scope) return
    load().finally(() => setLoading(false))
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  function resetForm() {
    setCases('')
    setLooseUnits('')
    setNotes('')
    setRecipient('')
    setEvent('')
    setReason('rota')
    setUnitPrice('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) return
    const c = parseInt(cases, 10) || 0
    const u = parseInt(looseUnits, 10) || 0
    if (c <= 0 && u <= 0) return

    if (type === 'venta' && !clientId) return

    const requested = totalUnits
    const available = totalAvailable(selectedProduct)
    if (requested > available) {
      alert(
        `Solo hay ${available} unidades disponibles de ${selectedProduct.name}`
      )
      return
    }

    setSaving(true)
    try {
      const baseRecord = {
        product_id: selectedProduct.id,
        movement_type: type,
        cases: c,
        loose_units: u,
        movement_date: today,
        notes: notes.trim() || null,
        ...(scope
          ? { clerk_id: scope.clerk_id, profile_type_v2: scope.profile_type_v2 }
          : {}),
      }

      if (type === 'venta') {
        const price = parseFloat(unitPrice) || 0
        await createDistMovement(supabase, {
          ...baseRecord,
          client_id: clientId,
          unit_price: price,
          total_amount: requested * price,
          currency: selectedProduct.currency || 'MXN',
        })
      } else if (type === 'donacion') {
        await createDistMovement(supabase, {
          ...baseRecord,
          recipient: recipient.trim() || null,
        })
      } else if (type === 'merma') {
        await createDistMovement(supabase, {
          ...baseRecord,
          reason,
        })
      } else if (type === 'muestra') {
        await createDistMovement(supabase, {
          ...baseRecord,
          recipient: recipient.trim() || null,
          event: event.trim() || null,
        })
      }

      await updateDistInventory(
        supabase,
        selectedProduct.id,
        -c,
        -u,
        selectedProduct.bottles_per_case
      )

      resetForm()
      await load()
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => {
    let totalSold = 0
    let totalUnitsMoved = 0
    const byType: Record<SalidaType, { count: number; units: number; amount: number }> = {
      venta: { count: 0, units: 0, amount: 0 },
      donacion: { count: 0, units: 0, amount: 0 },
      merma: { count: 0, units: 0, amount: 0 },
      muestra: { count: 0, units: 0, amount: 0 },
    }
    movements.forEach(m => {
      if (m.movement_type === 'entrada') return
      const t = m.movement_type as SalidaType
      const bpc = m.dist_products?.bottles_per_case || 0
      const units = (m.cases || 0) * bpc + (m.loose_units || 0)
      totalUnitsMoved += units
      byType[t].count += 1
      byType[t].units += units
      if (t === 'venta' && m.total_amount) {
        totalSold += Number(m.total_amount)
        byType[t].amount += Number(m.total_amount)
      }
    })
    return { totalSold, totalUnitsMoved, byType }
  }, [movements])

  const ventaProducts = inventory.filter(p => totalAvailable(p) > 0)

  return (
    <div style={{ fontFamily: font, background: '#fff', minHeight: '100vh', padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-.04em',
            color: '#111',
            lineHeight: 1.1,
            marginBottom: 6,
          }}
        >
          Movimientos
        </h1>
        <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
          Salidas de bodega: ventas, donaciones, mermas y muestras
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          marginBottom: 24,
        }}
      >
        {SALIDA_TYPES.map(t => {
          const active = t === type
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t)
                resetForm()
              }}
              style={{
                padding: '16px 12px',
                border: '3px solid #111',
                marginLeft: -3,
                background: active ? '#111' : TYPE_BG[t],
                color: active ? '#fff' : '#111',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: font,
              }}
            >
              {TYPE_LABELS[t]}
            </button>
          )
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          border: '3px solid #111',
          padding: 24,
          marginBottom: 32,
          background: TYPE_BG[type],
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Registrar {TYPE_LABELS[type].toLowerCase()}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {type === 'venta' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Cliente</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                style={input}
                required
              >
                <option value="">Seleccionar cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — tier {c.price_tier}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Producto</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              style={input}
              required
            >
              <option value="">Seleccionar producto</option>
              {(type === 'venta' ? ventaProducts : inventory).map(p => {
                const avail = totalAvailable(p)
                return (
                  <option key={p.id} value={p.id} disabled={avail <= 0}>
                    {p.name} — {avail} uds disponibles
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label style={label}>Cajas</label>
            <input
              type="number"
              min={0}
              value={cases}
              onChange={e => setCases(e.target.value)}
              style={input}
              placeholder="0"
            />
          </div>
          <div>
            <label style={label}>Unidades sueltas</label>
            <input
              type="number"
              min={0}
              value={looseUnits}
              onChange={e => setLooseUnits(e.target.value)}
              style={input}
              placeholder="0"
            />
          </div>

          {type === 'venta' && (
            <>
              <div>
                <label style={label}>Precio unitario</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value)}
                  style={input}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label style={label}>Total</label>
                <div
                  style={{
                    ...input,
                    background: '#111',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {formatMoney(computedTotal, selectedProduct?.currency || 'MXN')}
                </div>
              </div>
            </>
          )}

          {type === 'donacion' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Destinatario</label>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                style={input}
                placeholder="Persona, organización o evento"
              />
            </div>
          )}

          {type === 'merma' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Motivo</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as MermaReason)}
                style={input}
                required
              >
                {MERMA_REASONS.map(r => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'muestra' && (
            <>
              <div>
                <label style={label}>A quién</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  style={input}
                  placeholder="Cliente potencial, periodista..."
                />
              </div>
              <div>
                <label style={label}>Evento / ocasión</label>
                <input
                  type="text"
                  value={event}
                  onChange={e => setEvent(e.target.value)}
                  style={input}
                  placeholder="Cata, feria, lanzamiento..."
                />
              </div>
            </>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={input}
              placeholder="Observaciones"
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="submit"
            disabled={saving || !selectedProduct || totalUnits <= 0}
            style={{
              padding: '12px 20px',
              background: '#111',
              color: '#fff',
              border: '3px solid #111',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.5 : 1,
              fontFamily: font,
            }}
          >
            {saving ? 'Guardando...' : `Registrar ${TYPE_LABELS[type].toLowerCase()}`}
          </button>
          {selectedProduct && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>
              {totalUnits} uds · {totalAvailable(selectedProduct)} disponibles
            </span>
          )}
        </div>
      </form>

      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Resumen de hoy
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              border: '3px solid #111',
              background: '#111',
              color: '#fff',
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              Total vendido
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>
              {formatMoney(summary.totalSold)}
            </div>
          </div>
          <div
            style={{
              border: '3px solid #111',
              background: '#fff',
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#888',
              }}
            >
              Unidades movidas
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>
              {summary.totalUnitsMoved}
            </div>
          </div>
          {SALIDA_TYPES.map(t => (
            <div
              key={t}
              style={{
                border: '3px solid #111',
                background: TYPE_BG[t],
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: '#111',
                }}
              >
                {TYPE_LABELS[t]}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: '#111' }}>
                {summary.byType[t].units} uds
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 4,
                  color: '#333',
                }}
              >
                {summary.byType[t].count} mov.
                {t === 'venta' && summary.byType[t].amount > 0
                  ? ` · ${formatMoney(summary.byType[t].amount)}`
                  : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Historial de hoy
        </h2>
        {loading ? (
          <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
        ) : movements.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>Sin movimientos hoy.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {movements
              .filter(m => m.movement_type !== 'entrada')
              .map(m => {
                const t = m.movement_type as SalidaType
                const product = m.dist_products
                const bpc = product?.bottles_per_case || 0
                const units = (m.cases || 0) * bpc + (m.loose_units || 0)
                const time = new Date(m.created_at).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const who =
                  t === 'venta'
                    ? m.clients?.name || '—'
                    : t === 'merma'
                      ? `Motivo: ${m.reason || '—'}`
                      : m.recipient || '—'
                const eventInfo = t === 'muestra' && m.event ? ` · ${m.event}` : ''

                return (
                  <div
                    key={m.id}
                    style={{
                      border: '3px solid #111',
                      background: product
                        ? CATEGORY_COLORS[product.category]
                        : '#fff',
                      padding: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        padding: '6px 10px',
                        border: '3px solid #111',
                        background: TYPE_BG[t],
                        color: '#111',
                        flexShrink: 0,
                        minWidth: 100,
                        textAlign: 'center',
                      }}
                    >
                      {TYPE_LABELS[t]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: '#111',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {product?.name || m.product_id}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginTop: 2,
                          color: '#333',
                        }}
                      >
                        {who}
                        {eventInfo}
                        {m.notes ? ` · ${m.notes}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>
                        {units} uds
                      </div>
                      {t === 'venta' && m.total_amount != null && (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#111',
                            marginTop: 2,
                          }}
                        >
                          {formatMoney(
                            Number(m.total_amount),
                            m.currency || product?.currency || 'MXN'
                          )}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#666',
                          marginTop: 2,
                        }}
                      >
                        {time}
                      </div>
                    </div>
                  </div>
                )
              })}
            {movements.filter(m => m.movement_type !== 'entrada').length === 0 && (
              <p style={{ fontSize: 13, color: '#888' }}>
                Solo hay entradas hoy. Aún no se han registrado salidas.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
