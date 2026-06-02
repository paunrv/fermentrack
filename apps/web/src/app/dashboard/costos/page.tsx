'use client'

import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchBatches,
  fetchBottling,
  fetchProductionCosts,
  createProductionCost,
  type Batch,
  type Bottling,
  type ProductionCost,
  type ProductionCostCategory,
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

const CATEGORIES: { value: ProductionCostCategory; label: string }[] = [
  { value: 'materia_prima', label: 'Materia prima' },
  { value: 'mano_obra', label: 'Mano de obra' },
  { value: 'equipo', label: 'Equipo' },
  { value: 'energia', label: 'Energía' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'analisis', label: 'Análisis' },
  { value: 'otro', label: 'Otro' },
]

function formatMoney(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n)
}

function categoryLabel(cat: ProductionCostCategory) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat
}

export default function CostosPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [batches, setBatches] = useState<Batch[]>([])
  const [bottling, setBottling] = useState<Bottling[]>([])
  const [costs, setCosts] = useState<ProductionCost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [batchId, setBatchId] = useState('')
  const [category, setCategory] = useState<ProductionCostCategory>('materia_prima')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('MXN')
  const [costDate, setCostDate] = useState(() => new Date().toISOString().slice(0, 10))

  const totalCost = useMemo(() => costs.reduce((s, c) => s + Number(c.amount), 0), [costs])

  const totalBottledUnits = useMemo(
    () => bottling.filter(b => b.batch_id === batchId).reduce((s, b) => s + b.total_units, 0),
    [bottling, batchId]
  )

  const costPerBottle = totalBottledUnits > 0 ? totalCost / totalBottledUnits : 0

  async function loadCosts(id: string) {
    if (!id) {
      setCosts([])
      return
    }
    const data = await fetchProductionCosts(supabase, id, scope ?? undefined)
    setCosts(data)
  }

  async function load() {
    const [b, bt] = await Promise.all([
      fetchBatches(supabase, scope ?? undefined),
      fetchBottling(supabase, scope ?? undefined),
    ])
    setBatches(b)
    setBottling(bt)
    const id = batchId || b[0]?.id || ''
    if (id && !batchId) setBatchId(id)
    if (id) await loadCosts(id)
  }

  useEffect(() => {
    if (!scope) return
    load().finally(() => setLoading(false))
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  useEffect(() => {
    if (batchId) loadCosts(batchId)
  }, [batchId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!batchId || !description.trim() || !amt) return
    setSaving(true)
    try {
      await createProductionCost(supabase, {
        batch_id: batchId,
        category,
        description: description.trim(),
        amount: amt,
        currency,
        cost_date: costDate,
        ...(scope
          ? { clerk_id: scope.clerk_id, profile_type_v2: scope.profile_type_v2 }
          : {}),
      } as ProductionCost & { clerk_id?: string; profile_type_v2?: string })
      setDescription('')
      setAmount('')
      await loadCosts(batchId)
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
          Costos
        </h1>
        <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
          Costos de producción por lote
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          border: '3px solid #111',
          padding: 24,
          marginBottom: 24,
          background: COLORS[4],
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
          Agregar costo
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Lote</label>
            <select
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              style={input}
              required
            >
              <option value="">Seleccionar lote</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.id} — {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ProductionCostCategory)}
              style={input}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Fecha</label>
            <input
              type="date"
              value={costDate}
              onChange={e => setCostDate(e.target.value)}
              style={input}
              required
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Descripción</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Malta Pilsner 25kg"
              style={input}
              required
            />
          </div>
          <div>
            <label style={label}>Monto</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={input}
              required
            />
          </div>
          <div>
            <label style={label}>Moneda</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={input}>
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
            </select>
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
          {saving ? 'Guardando...' : 'Agregar costo'}
        </button>
      </form>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Total acumulado', value: formatMoney(totalCost, currency), bg: COLORS[0] },
          {
            label: 'Unidades embotelladas',
            value: String(totalBottledUnits),
            bg: COLORS[2],
          },
          {
            label: 'Costo por botella',
            value: totalBottledUnits > 0 ? formatMoney(costPerBottle, currency) : '—',
            bg: COLORS[5],
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              border: '3px solid #111',
              padding: 16,
              background: card.bg,
            }}
          >
            <div style={{ ...label, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <h2
        style={{
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Costos del lote
      </h2>
      {loading ? (
        <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
      ) : !batchId ? (
        <p style={{ fontSize: 13, color: '#888' }}>Selecciona un lote</p>
      ) : costs.length === 0 ? (
        <p style={{ fontSize: 13, color: '#888' }}>Sin costos registrados</p>
      ) : (
        <div style={{ border: '3px solid #111', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#111', color: '#fff' }}>
                {['Fecha', 'Categoría', 'Descripción', 'Monto'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 14px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costs.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td style={{ padding: '12px 14px', borderTop: '2px solid #111' }}>
                    {new Date(row.cost_date).toLocaleDateString('es-MX')}
                  </td>
                  <td style={{ padding: '12px 14px', borderTop: '2px solid #111', fontWeight: 700 }}>
                    {categoryLabel(row.category)}
                  </td>
                  <td style={{ padding: '12px 14px', borderTop: '2px solid #111' }}>
                    {row.description}
                  </td>
                  <td
                    style={{
                      padding: '12px 14px',
                      borderTop: '2px solid #111',
                      fontWeight: 800,
                    }}
                  >
                    {formatMoney(Number(row.amount), row.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
