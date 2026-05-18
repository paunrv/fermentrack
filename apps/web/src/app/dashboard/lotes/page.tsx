'use client'

import { useEffect, useState } from 'react'
import { fetchBatches, createBatch, logActivity, type Batch } from '@/lib/supabase'

function AlertBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mt-3 p-3 bg-[#BA751710] border border-[#EF9F2730] rounded-lg text-xs text-[#EF9F27]">
      <span className="mt-0.5">⚠</span> {text}
    </div>
  )
}

export default function LotesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', tipo: 'Cerveza artesanal', volumen: '', levadura: '', densidad: '', temp: '' })

  const load = () => fetchBatches().then(setBatches).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!form.nombre) return
    setSaving(true)
    const id = 'FT-' + Date.now().toString().slice(-4)
    await createBatch({
      id, name: form.nombre, type: form.tipo,
      volume: parseFloat(form.volumen) || 0,
      yeast: form.levadura || null,
      density: parseFloat(form.densidad) || 1.060,
      ph: 4.0, temp: parseFloat(form.temp) || 18,
      day: 1, progress: 2, status: 'active', alert: null,
    })
    await logActivity(id, `Nuevo lote ${id} creado`, form.nombre)
    setForm({ nombre: '', tipo: 'Cerveza artesanal', volumen: '', levadura: '', densidad: '', temp: '' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-medium text-[#e8f0eb]">Lotes</h1>
          <p className="text-sm text-[#6b8c78] mt-0.5">{batches.length} lotes registrados</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F6E56] hover:bg-[#1D9E75] text-[#e1f5ee] text-sm font-medium rounded-lg transition-colors"
        >
          + Nuevo lote
        </button>
      </div>

      {/* New batch form */}
      {showForm && (
        <div className="bg-[#16221b] border border-[#0F6E56] rounded-xl p-5 mb-6">
          <div className="text-sm font-medium text-[#e8f0eb] mb-4">Registrar nuevo lote</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'nombre',   label: 'Nombre del producto', placeholder: 'Ej: IPA Citrus',              type: 'text'   },
              { id: 'volumen',  label: 'Volumen (litros)',     placeholder: '500',                          type: 'number' },
              { id: 'levadura', label: 'Levadura / Cepa',      placeholder: 'Ej: WY1056 American Ale',      type: 'text'   },
              { id: 'densidad', label: 'Densidad inicial',     placeholder: '1.060',                        type: 'number' },
              { id: 'temp',     label: 'Temperatura (°C)',     placeholder: '18',                           type: 'number' },
            ].map(f => (
              <div key={f.id}>
                <label className="block text-[11px] text-[#6b8c78] uppercase tracking-wider mb-1">{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as any)[f.id]}
                  onChange={e => setForm(v => ({ ...v, [f.id]: e.target.value }))}
                  className="w-full bg-[#111a15] border border-[#1e3326] rounded-lg px-3 py-2 text-sm text-[#e8f0eb] outline-none focus:border-[#0F6E56]"
                />
              </div>
            ))}
            <div>
              <label className="block text-[11px] text-[#6b8c78] uppercase tracking-wider mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(v => ({ ...v, tipo: e.target.value }))}
                className="w-full bg-[#111a15] border border-[#1e3326] rounded-lg px-3 py-2 text-sm text-[#e8f0eb] outline-none focus:border-[#0F6E56]"
              >
                <option>Cerveza artesanal</option>
                <option>Vino tinto</option>
                <option>Vino blanco</option>
                <option>Vino rosado</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#0F6E56] hover:bg-[#1D9E75] disabled:opacity-40 text-[#e1f5ee] text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Guardando...' : '✓ Crear lote'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#1e3326] text-[#6b8c78] hover:text-[#e8f0eb] text-sm rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Batch list */}
      {loading
        ? <p className="text-sm text-[#6b8c78]">Cargando lotes...</p>
        : batches.map(b => (
          <div key={b.id} className={`bg-[#16221b] border rounded-xl p-5 mb-3 ${b.status === 'warn' ? 'border-[#EF9F2740]' : 'border-[#1e3326]'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-medium text-[#9FE1CB]">{b.id}</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  b.status === 'active' ? 'bg-[#0F6E5622] text-[#5DCAA5] border border-[#1D9E7540]' :
                  b.status === 'warn'   ? 'bg-[#BA751722] text-[#EF9F27] border border-[#EF9F2740]' :
                                          'bg-[#1e3326] text-[#6b8c78] border border-[#1e3326]'
                }`}>
                  {b.status === 'active' ? <><span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]"/>Activo</> :
                   b.status === 'warn'   ? <><span className="w-1.5 h-1.5 rounded-full bg-[#EF9F27]"/>Alerta</> : 'Terminado'}
                </span>
              </div>
              <span className="text-xs text-[#6b8c78]">Día {b.day} — {b.type}</span>
            </div>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {[
                { label: 'Producto',  value: b.name },
                { label: 'Volumen',   value: `${b.volume}L`, mono: true, color: '#5DCAA5' },
                { label: 'Levadura',  value: b.yeast || '—' },
                { label: 'Densidad',  value: String(b.density), mono: true, color: '#5DCAA5' },
                { label: 'pH',        value: String(b.ph), mono: true, color: (b.ph ?? 0) < 3.2 || (b.ph ?? 0) > 4.5 ? '#EF9F27' : '#5DCAA5' },
                { label: 'Temp.',     value: `${b.temp}°C`, mono: true, color: '#5DCAA5' },
              ].map(p => (
                <div key={p.label} className="bg-[#111a15] border border-[#1e3326] rounded-lg p-2.5">
                  <div className="text-[10px] text-[#6b8c78] uppercase tracking-wider mb-1">{p.label}</div>
                  <div className={`text-sm ${p.mono ? 'font-mono' : ''}`} style={{ color: p.color || '#e8f0eb' }}>{p.value}</div>
                </div>
              ))}
            </div>
            <div className="h-1 bg-[#1e3326] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{
                width: `${b.progress}%`,
                background: b.status === 'warn' ? '#EF9F27' : b.status === 'idle' ? '#6b8c78' : '#1D9E75'
              }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[#6b8c78] uppercase tracking-wider">Progreso</span>
              <span className="text-[10px] text-[#5DCAA5]">{b.progress}%</span>
            </div>
            {b.alert && <AlertBox text={b.alert} />}
          </div>
        ))
      }
    </div>
  )
}
