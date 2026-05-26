'use client'

import { useEffect, useState } from 'react'
import {
  fetchDistInventory,
  createDistMovement,
  updateDistInventory,
  type DistInventoryRow,
  type ProductCategory,
  type ProductOrigin,
} from '@/lib/supabase'

const font = "'Space Grotesk', sans-serif"

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  cerveza: '#FAC775',
  vino: '#9FE1CB',
  destilado: '#F5C4B3',
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cerveza: 'Cerveza',
  vino: 'Vino',
  destilado: 'Destilado',
}

const ORIGIN_LABELS: Record<ProductOrigin, string> = {
  local: 'Local',
  importado: 'Importado',
}

const ORIGIN_BG: Record<ProductOrigin, string> = {
  local: '#C0DD97',
  importado: '#B5D4F4',
}

const ALERT_RED = '#E24B4A'

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

function totalUnits(row: DistInventoryRow): number {
  const inv = row.inventory
  if (!inv) return 0
  return inv.cases * row.bottles_per_case + inv.loose_units
}

export default function InventarioPage() {
  const [rows, setRows] = useState<DistInventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [productId, setProductId] = useState('')
  const [cases, setCases] = useState('')
  const [looseUnits, setLooseUnits] = useState('')
  const [movementDate, setMovementDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const [notes, setNotes] = useState('')

  async function load() {
    const data = await fetchDistInventory()
    setRows(data)
    if (data.length && !productId) setProductId(data[0].id)
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  async function handleEntry(e: React.FormEvent) {
    e.preventDefault()
    const c = parseInt(cases, 10) || 0
    const u = parseInt(looseUnits, 10) || 0
    if (!productId || (c <= 0 && u <= 0)) return

    const product = rows.find(r => r.id === productId)
    if (!product) return

    setSaving(true)
    try {
      await createDistMovement({
        product_id: productId,
        movement_type: 'entrada',
        cases: c,
        loose_units: u,
        movement_date: movementDate,
        notes: notes.trim() || null,
      })
      await updateDistInventory(productId, c, u, product.bottles_per_case)
      setCases('')
      setLooseUnits('')
      setNotes('')
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily: font, background: '#fff', minHeight: '100vh', padding: 32 }}>
      <div style={{ marginBottom: 32 }}>
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
          Inventario
        </h1>
        <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
          Stock en cajas y unidades sueltas por producto
        </p>
      </div>

      <form
        onSubmit={handleEntry}
        style={{
          border: '3px solid #111',
          padding: 24,
          marginBottom: 32,
          background: '#C0DD97',
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
          Registrar entrada de mercancía
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Producto</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              style={input}
              required
            >
              <option value="">Seleccionar producto</option>
              {rows.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} — {CATEGORY_LABELS[r.category]} · {r.bottles_per_case}/caja
                </option>
              ))}
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
          <div>
            <label style={label}>Fecha</label>
            <input
              type="date"
              value={movementDate}
              onChange={e => setMovementDate(e.target.value)}
              style={input}
              required
            />
          </div>
          <div>
            <label style={label}>Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={input}
              placeholder="Proveedor, factura, etc."
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !productId}
          style={{
            marginTop: 16,
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
          {saving ? 'Guardando...' : 'Registrar entrada'}
        </button>
      </form>

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
          Stock actual
        </h2>
        {loading ? (
          <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
        ) : rows.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>
            No hay productos en el catálogo. Agrega productos primero en Productos.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {rows.map(row => {
              const inv = row.inventory
              const total = totalUnits(row)
              const max = inv?.max_units || 0
              const pct = max > 0 ? Math.min(100, Math.round((total / max) * 100)) : 0
              const empty = total === 0

              return (
                <div
                  key={row.id}
                  style={{
                    border: '3px solid #111',
                    padding: 20,
                    background: CATEGORY_COLORS[row.category],
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    minHeight: 240,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          lineHeight: 1.2,
                          color: '#111',
                        }}
                      >
                        {row.name}
                      </div>
                      {row.producer && (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            marginTop: 4,
                            color: '#333',
                          }}
                        >
                          {row.producer}
                        </div>
                      )}
                    </div>
                    {empty ? (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '.1em',
                          textTransform: 'uppercase',
                          padding: '5px 8px',
                          border: '3px solid #111',
                          background: ALERT_RED,
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        Sin stock
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '.1em',
                          textTransform: 'uppercase',
                          padding: '5px 8px',
                          border: '3px solid #111',
                          background: '#fff',
                          color: '#111',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {CATEGORY_LABELS[row.category]}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                        padding: '5px 8px',
                        border: '3px solid #111',
                        background: ORIGIN_BG[row.origin],
                        color: '#111',
                      }}
                    >
                      {ORIGIN_LABELS[row.origin]}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                        padding: '5px 8px',
                        border: '3px solid #111',
                        background: '#fff',
                        color: '#111',
                      }}
                    >
                      {row.bottles_per_case}/caja
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 'auto',
                      border: '3px solid #111',
                      background: '#fff',
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 16,
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: '.1em',
                            textTransform: 'uppercase',
                            color: '#888',
                          }}
                        >
                          Cajas
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                          {inv?.cases ?? 0}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: '.1em',
                            textTransform: 'uppercase',
                            color: '#888',
                          }}
                        >
                          Sueltas
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                          {inv?.loose_units ?? 0}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: '.1em',
                            textTransform: 'uppercase',
                            color: '#888',
                          }}
                        >
                          Total uds
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            lineHeight: 1,
                            color: empty ? ALERT_RED : '#111',
                          }}
                        >
                          {total}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        height: 14,
                        border: '3px solid #111',
                        background: '#fff',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: empty ? ALERT_RED : '#111',
                          transition: 'width .25s ease',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.05em',
                        textTransform: 'uppercase',
                        color: '#888',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        {max > 0 ? `${pct}% del máx.` : 'Sin histórico'}
                      </span>
                      <span>Máx. {max}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
