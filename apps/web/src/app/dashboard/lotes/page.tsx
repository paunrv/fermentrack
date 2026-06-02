'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchBatches, createBatch, logActivity, type Batch } from '@/lib/supabase'

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

function AlertBox({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 12,
        padding: '10px 12px',
        background: '#FAC775',
        border: '3px solid #111',
        fontSize: 11,
        fontWeight: 700,
        color: '#111',
        fontFamily: font,
      }}
    >
      <span>⚠</span> {text}
    </div>
  )
}

export default function LotesPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'Cerveza artesanal',
    volumen: '',
    levadura: '',
    densidad: '',
    temp: '',
  })

  const load = () =>
    fetchBatches(supabase, scope ?? undefined).then(setBatches).finally(() => setLoading(false))
  useEffect(() => {
    if (!scope) return
    load()
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  async function handleCreate() {
    if (!form.nombre) return
    setSaving(true)
    const id = 'FT-' + Date.now().toString().slice(-4)
    await createBatch(supabase, {
      id,
      name: form.nombre,
      type: form.tipo,
      volume: parseFloat(form.volumen) || 0,
      yeast: form.levadura || null,
      density: parseFloat(form.densidad) || 1.06,
      ph: 4.0,
      temp: parseFloat(form.temp) || 18,
      day: 1,
      progress: 2,
      status: 'active',
      alert: null,
      ...(scope
        ? { clerk_id: scope.clerk_id, profile_type_v2: scope.profile_type_v2 }
        : {}),
    } as Batch & { clerk_id?: string; profile_type_v2?: string })
    await logActivity(supabase, id, `Nuevo lote ${id} creado`, form.nombre)
    setForm({
      nombre: '',
      tipo: 'Cerveza artesanal',
      volumen: '',
      levadura: '',
      densidad: '',
      temp: '',
    })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  return (
    <div
      style={{
        fontFamily: font,
        background: '#fff',
        minHeight: '100vh',
        padding: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
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
            Lotes
          </h1>
          <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
            {loading ? '...' : `${batches.length} lotes registrados`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: '12px 16px',
            background: '#111',
            color: '#fff',
            border: '3px solid #111',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: font,
          }}
        >
          + Nuevo lote
        </button>
      </div>

      {showForm && (
        <div
          style={{
            border: '3px solid #111',
            padding: 24,
            marginBottom: 24,
            background: '#9FE1CB',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: '#111',
              marginBottom: 16,
            }}
          >
            Registrar nuevo lote
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { id: 'nombre', label: 'Nombre del producto', placeholder: 'Ej: IPA Citrus', type: 'text' },
              { id: 'volumen', label: 'Volumen (litros)', placeholder: '500', type: 'number' },
              { id: 'levadura', label: 'Levadura / Cepa', placeholder: 'Ej: WY1056', type: 'text' },
              { id: 'densidad', label: 'Densidad inicial', placeholder: '1.060', type: 'number' },
              { id: 'temp', label: 'Temperatura (°C)', placeholder: '18', type: 'number' },
            ].map(f => (
              <div key={f.id}>
                <label style={label}>{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as Record<string, string>)[f.id]}
                  onChange={e => setForm(v => ({ ...v, [f.id]: e.target.value }))}
                  style={input}
                />
              </div>
            ))}
            <div>
              <label style={label}>Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(v => ({ ...v, tipo: e.target.value }))}
                style={input}
              >
                <option>Cerveza artesanal</option>
                <option>Vino tinto</option>
                <option>Vino blanco</option>
                <option>Vino rosado</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              style={{
                padding: '12px 16px',
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
              {saving ? 'Guardando...' : '✓ Crear lote'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: '12px 16px',
                background: '#fff',
                color: '#111',
                border: '3px solid #111',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: font,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>Cargando lotes...</p>
      ) : (
        batches.map((b, i) => {
          const accent = COLORS[i % COLORS.length]
          return (
            <div
              key={b.id}
              style={{
                border: '3px solid #111',
                borderLeft: `12px solid ${accent}`,
                padding: 20,
                marginBottom: 8,
                background: '#fff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#111',
                    }}
                  >
                    {b.id}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      border: '2px solid #111',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      background: accent,
                      color: '#111',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        background:
                          b.status === 'active'
                            ? '#1D9E75'
                            : b.status === 'warn'
                              ? '#E24B4A'
                              : '#888',
                      }}
                    />
                    {b.status === 'active' ? 'Activo' : b.status === 'warn' ? 'Alerta' : 'Terminado'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                  }}
                >
                  Día {b.day} — {b.type}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 6,
                  marginBottom: 16,
                }}
              >
                {[
                  { label: 'Producto', value: b.name },
                  { label: 'Volumen', value: `${b.volume}L` },
                  { label: 'Levadura', value: b.yeast || '—' },
                  { label: 'Densidad', value: String(b.density) },
                  { label: 'pH', value: String(b.ph) },
                  { label: 'Temp.', value: `${b.temp}°C` },
                ].map(p => (
                  <div
                    key={p.label}
                    style={{
                      border: '3px solid #111',
                      padding: 10,
                      background: '#fff',
                    }}
                  >
                    <div style={{ ...label, marginBottom: 4 }}>{p.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{p.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ border: '3px solid #111', height: 8, background: '#fff' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${b.progress}%`,
                    background:
                      b.status === 'warn' ? '#E24B4A' : b.status === 'idle' ? '#888' : '#1D9E75',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                }}
              >
                <span style={{ ...label, marginBottom: 0 }}>Progreso</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#111' }}>{b.progress}%</span>
              </div>
              {b.alert && <AlertBox text={b.alert} />}
            </div>
          )
        })
      )}
    </div>
  )
}
