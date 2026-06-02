'use client'

import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchBatches,
  fetchBottling,
  fetchWarehouseExits,
  createWarehouseExit,
  type Batch,
  type Bottling,
  type WarehouseExit,
} from '@/lib/supabase'

const COLORS = ['#FAC775', '#9FE1CB', '#F5C4B3', '#B5D4F4', '#C0DD97', '#F4C0D1']
const font = "'Space Grotesk', sans-serif"

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

function formatMoney(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

interface StockRow {
  batch_id: string
  name: string
  type: string
  entries: number
  exits: number
  available: number
}

export default function BodegaPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [batches, setBatches] = useState<Batch[]>([])
  const [bottling, setBottling] = useState<Bottling[]>([])
  const [exits, setExits] = useState<WarehouseExit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [batchId, setBatchId] = useState('')
  const [units, setUnits] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [notes, setNotes] = useState('')

  const batchMap = useMemo(
    () => Object.fromEntries(batches.map(b => [b.id, b])),
    [batches]
  )

  const stock = useMemo((): StockRow[] => {
    const entriesByBatch: Record<string, number> = {}
    const exitsByBatch: Record<string, number> = {}

    bottling.forEach(b => {
      entriesByBatch[b.batch_id] = (entriesByBatch[b.batch_id] || 0) + b.total_units
    })
    exits.forEach(e => {
      exitsByBatch[e.batch_id] = (exitsByBatch[e.batch_id] || 0) + e.units
    })

    const ids = new Set([...Object.keys(entriesByBatch), ...Object.keys(exitsByBatch)])

    return Array.from(ids)
      .map(id => {
        const batch = batchMap[id]
        const entries = entriesByBatch[id] || 0
        const out = exitsByBatch[id] || 0
        return {
          batch_id: id,
          name: batch?.name || id,
          type: batch?.type || '',
          entries,
          exits: out,
          available: entries - out,
        }
      })
      .filter(row => row.entries > 0 || row.exits > 0)
      .sort((a, b) => b.available - a.available)
  }, [bottling, exits, batchMap])

  const stockWithInventory = stock.filter(s => s.available > 0)

  async function load() {
    const [b, bt, ex] = await Promise.all([
      fetchBatches(supabase, scope ?? undefined),
      fetchBottling(supabase, scope ?? undefined),
      fetchWarehouseExits(supabase, scope ?? undefined),
    ])
    setBatches(b)
    setBottling(bt)
    setExits(ex)
    if (b.length && !batchId && b[0]) setBatchId(b[0].id)
  }

  useEffect(() => {
    if (!scope) return
    load().finally(() => setLoading(false))
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  async function handleExit(e: React.FormEvent) {
    e.preventDefault()
    const u = parseInt(units, 10)
    const price = parseFloat(pricePerUnit)
    if (!batchId || !u || u <= 0 || !price) return

    const row = stock.find(s => s.batch_id === batchId)
    if (row && u > row.available) {
      alert(`Solo hay ${row.available} unidades disponibles`)
      return
    }

    setSaving(true)
    try {
      await createWarehouseExit(supabase, {
        batch_id: batchId,
        units: u,
        price_per_unit: price,
        notes: notes.trim() || null,
        ...(scope
          ? { clerk_id: scope.clerk_id, profile_type_v2: scope.profile_type_v2 }
          : {}),
      } as WarehouseExit & { clerk_id?: string; profile_type_v2?: string })
      setUnits('')
      setPricePerUnit('')
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
          Bodega
        </h1>
        <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
          Stock actual: embotellado − salidas
        </p>
      </div>

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
          Stock disponible
        </h2>
        {loading ? (
          <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
        ) : stockWithInventory.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>Sin stock en bodega</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {stockWithInventory.map((row, i) => (
              <div
                key={row.batch_id}
                style={{
                  border: '3px solid #111',
                  padding: 20,
                  background: COLORS[i % COLORS.length],
                  minHeight: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '.1em',
                      opacity: 0.6,
                    }}
                  >
                    {row.batch_id}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, lineHeight: 1.2 }}>
                    {row.name}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, opacity: 0.7 }}>
                    {row.type}
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>{row.available}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', marginTop: 4 }}>
                    UNIDADES DISPONIBLES
                  </div>
                  <div style={{ fontSize: 11, marginTop: 8, fontWeight: 600 }}>
                    +{row.entries} emb. · −{row.exits} salidas
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleExit}
        style={{
          border: '3px solid #111',
          padding: 24,
          marginBottom: 32,
          background: COLORS[3],
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
          Registrar salida
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Producto (lote)</label>
            <select
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              style={input}
              required
            >
              <option value="">Seleccionar producto</option>
              {stockWithInventory.map(s => (
                <option key={s.batch_id} value={s.batch_id}>
                  {s.name} — {s.available} disponibles
                </option>
              ))}
              {stock
                .filter(s => s.available <= 0 && s.entries > 0)
                .map(s => (
                  <option key={s.batch_id} value={s.batch_id} disabled>
                    {s.name} — sin stock
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label style={label}>Unidades</label>
            <input
              type="number"
              min={1}
              value={units}
              onChange={e => setUnits(e.target.value)}
              style={input}
              required
            />
          </div>
          <div>
            <label style={label}>Precio por unidad</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={pricePerUnit}
              onChange={e => setPricePerUnit(e.target.value)}
              style={input}
              required
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Cliente, pedido, etc."
              style={input}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !batchId}
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
          {saving ? 'Guardando...' : 'Registrar salida'}
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
          Historial de salidas
        </h2>
        {loading ? (
          <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
        ) : exits.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>Sin salidas registradas</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exits.map((row, i) => {
              const batch = batchMap[row.batch_id]
              return (
                <div
                  key={row.id}
                  style={{
                    border: '3px solid #111',
                    padding: 16,
                    background: COLORS[i % COLORS.length],
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>
                      {batch?.name || row.batch_id}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: '#333' }}>
                      {row.units} uds × {formatMoney(row.price_per_unit)} ={' '}
                      {formatMoney(row.units * Number(row.price_per_unit))}
                      {' · '}
                      {new Date(row.created_at).toLocaleDateString('es-MX')}
                      {row.notes ? ` · ${row.notes}` : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      padding: '8px 12px',
                      border: '3px solid #111',
                      background: '#fff',
                    }}
                  >
                    Salida
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
