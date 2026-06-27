'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchBatches,
  fetchBottling,
  createBottling,
  type Batch,
  type Bottling,
  type BottlingMaterials,
} from '@/lib/supabase'

const COLORS = ['#FAC775', '#9FE1CB', '#F5C4B3', '#B5D4F4', '#C0DD97', '#F4C0D1']


const label: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--fg-0)',
  marginBottom: 6,
}

const input: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1px solid var(--hairline)',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--fg-0)',
  outline: 'none',
  fontFamily: 'var(--font-display)',
}

const MATERIAL_KEYS = ['containers', 'labels', 'corks', 'capsules', 'boxes'] as const

function emptyMaterials(): BottlingMaterials {
  return {
    containers: { qty: 0, unit_cost: 0 },
    labels: { qty: 0, unit_cost: 0 },
    corks: { qty: 0, unit_cost: 0 },
    capsules: { qty: 0, unit_cost: 0 },
    boxes: { qty: 0, unit_cost: 0 },
  }
}

function materialLabels(unitType: 'botella' | 'lata') {
  return {
    containers: unitType === 'botella' ? 'Botellas' : 'Latas',
    labels: 'Etiquetas',
    corks: unitType === 'botella' ? 'Corchos' : 'Tapas',
    capsules: 'Cápsulas',
    boxes: 'Cajas',
  }
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

export default function EmbotelladoPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [batches, setBatches] = useState<Batch[]>([])
  const [history, setHistory] = useState<Bottling[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [batchId, setBatchId] = useState('')
  const [unitType, setUnitType] = useState<'botella' | 'lata'>('botella')
  const [materials, setMaterials] = useState<BottlingMaterials>(emptyMaterials)
  const [notes, setNotes] = useState('')

  const batchMap = useMemo(
    () => Object.fromEntries(batches.map(b => [b.id, b])),
    [batches]
  )

  const totalUnits = materials.containers.qty || 0

  const materialsTotal = useMemo(() => {
    return MATERIAL_KEYS.reduce(
      (sum, key) => sum + materials[key].qty * materials[key].unit_cost,
      0
    )
  }, [materials])

  async function load() {
    const [b, h] = await Promise.all([
      fetchBatches(supabase, scope ?? undefined),
      fetchBottling(supabase, scope ?? undefined),
    ])
    setBatches(b)
    setHistory(h)
    if (b.length && !batchId && b[0]) setBatchId(b[0].id)
  }

  useEffect(() => {
    if (!scope) return
    load().finally(() => setLoading(false))
  }, [scope?.user_id, scope?.profile_type_v2, supabase])

  function updateMaterial(key: keyof BottlingMaterials, field: 'qty' | 'unit_cost', value: number) {
    setMaterials(m => ({
      ...m,
      [key]: { ...m[key], [field]: value },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!batchId || totalUnits <= 0) return
    setSaving(true)
    try {
      await createBottling(supabase, {
        batch_id: batchId,
        unit_type: unitType,
        materials,
        total_units: totalUnits,
        notes: notes.trim() || null,
        ...(scope
          ? { user_id: scope.user_id, profile_type_v2: scope.profile_type_v2 }
          : {}),
      } as Bottling & { user_id?: string; profile_type_v2?: string })
      setMaterials(emptyMaterials())
      setNotes('')
      await load()
    } finally {
      setSaving(false)
    }
  }

  const labels = materialLabels(unitType)

  return (
    <div
      style={{ fontFamily: 'var(--font-display)', background: '#fff', minHeight: '100vh', padding: 32 }}
    >
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-.04em',
            color: 'var(--fg-0)',
            lineHeight: 1.1,
            marginBottom: 6,
          }}
        >
          Embotellado
        </h1>
        <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
          Registra materiales y unidades producidas por lote
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          border: '1px solid var(--hairline)',
          padding: 24,
          marginBottom: 32,
          background: COLORS[1],
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          Registrar embotellado
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
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
            <label style={label}>Tipo de unidad</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['botella', 'lata'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setUnitType(t)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--hairline)',
                    background: unitType === t ? 'var(--fg-0)' : '#fff',
                    color: unitType === t ? '#fff' : 'var(--fg-0)',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {t === 'botella' ? 'Botella' : 'Lata'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Materiales (cantidad × costo unitario)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {MATERIAL_KEYS.map((key, i) => (
            <div
              key={key}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 120px',
                gap: 8,
                alignItems: 'end',
                padding: 12,
                background: COLORS[i % COLORS.length],
                border: '1px solid var(--hairline)',
              }}
            >
              <div>
                <label style={{ ...label, marginBottom: 4 }}>{labels[key]}</label>
              </div>
              <div>
                <label style={{ ...label, marginBottom: 4 }}>Cantidad</label>
                <input
                  type="number"
                  min={0}
                  value={materials[key].qty || ''}
                  onChange={e => updateMaterial(key, 'qty', parseFloat(e.target.value) || 0)}
                  style={input}
                />
              </div>
              <div>
                <label style={{ ...label, marginBottom: 4 }}>Costo unit.</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={materials[key].unit_cost || ''}
                  onChange={e =>
                    updateMaterial(key, 'unit_cost', parseFloat(e.target.value) || 0)
                  }
                  style={input}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: 16,
              border: '1px solid var(--hairline)',
              background: '#fff',
            }}
          >
            <div style={label}>Total unidades producidas</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--fg-0)' }}>{totalUnits}</div>
            <p style={{ fontSize: 11, color: '#666', marginTop: 4, fontWeight: 500 }}>
              Calculado desde cantidad de {labels.containers.toLowerCase()}
            </p>
          </div>
          <div
            style={{
              padding: 16,
              border: '1px solid var(--hairline)',
              background: '#FAC775',
            }}
          >
            <div style={label}>Costo total materiales</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg-0)' }}>
              {formatMoney(materialsTotal)}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Notas</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Observaciones del embotellado..."
            style={{ ...input, resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !batchId || totalUnits <= 0}
          style={{
            padding: '12px 20px',
            background: 'var(--fg-0)',
            color: '#fff',
            border: '1px solid var(--hairline)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving || !batchId || totalUnits <= 0 ? 0.5 : 1,
            fontFamily: 'var(--font-display)',
          }}
        >
          {saving ? 'Guardando...' : 'Registrar embotellado'}
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
          Historial de embotellados
        </h2>
        {loading ? (
          <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
        ) : history.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>Sin registros aún</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((row, i) => {
              const batch = batchMap[row.batch_id]
              return (
                <div
                  key={row.id}
                  style={{
                    border: '1px solid var(--hairline)',
                    padding: 16,
                    background: COLORS[i % COLORS.length],
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', opacity: 0.6 }}>
                      {row.batch_id}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
                      {batch?.name || 'Lote'}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: '#333' }}>
                      {row.total_units} {row.unit_type === 'botella' ? 'botellas' : 'latas'} ·{' '}
                      {new Date(row.created_at).toLocaleDateString('es-MX')}
                      {row.notes ? ` · ${row.notes}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                      Materiales
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {formatMoney(
                        MATERIAL_KEYS.reduce(
                          (s, k) => s + row.materials[k].qty * row.materials[k].unit_cost,
                          0
                        )
                      )}
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
