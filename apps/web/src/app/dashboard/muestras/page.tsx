'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchBatches, fetchSamples, createSample, updateBatch, logActivity, type Batch, type Sample } from '@/lib/supabase'

export default function MuestrasPage() {
  const [batches, setBatches]   = useState<Batch[]>([])
  const [samples, setSamples]   = useState<Sample[]>([])
  const [imgB64, setImgB64]     = useState<string | null>(null)
  const [imgType, setImgType]   = useState<string>('image/jpeg')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [drag, setDrag]         = useState(false)
  const [form, setForm]         = useState({ batchId: '', type: 'Turbidez visual', notes: '', ph: '', density: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBatches().then(b => { setBatches(b); setForm(f => ({ ...f, batchId: b[0]?.id || '' })) })
    fetchSamples().then(setSamples)
  }, [])

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setImgB64(result.split(',')[1])
      setImgType(result.split(';')[0].split(':')[1])
    }
    reader.readAsDataURL(file)
  }

  async function analyze() {
    const batch = batches.find(b => b.id === form.batchId)
    setAnalyzing(true); setAnalysis(null)
    const content: any[] = []
    if (imgB64) content.push({ type: 'image', source: { type: 'base64', media_type: imgType, data: imgB64 } })
    content.push({ type: 'text', text: `Analiza esta muestra del lote ${form.batchId} (${batch?.name}, ${batch?.type}).
Tipo: ${form.type}. Notas: ${form.notes || 'ninguna'}.
${form.ph ? 'pH medido: ' + form.ph : ''} ${form.density ? 'Densidad: ' + form.density : ''}
Contexto: día ${batch?.day}, densidad actual ${batch?.density}, pH ${batch?.ph}, temp ${batch?.temp}°C.
Análisis técnico conciso (3-4 oraciones): observaciones, normalidad para esta etapa, acción recomendada.` })

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 400,
          system: 'Eres experto en enología y cervecería artesanal. Responde en español, técnico y conciso.',
          messages: [{ role: 'user', content }]
        })
      })
      const data = await res.json()
      const text = data.content?.find((c: any) => c.type === 'text')?.text || 'Sin análisis.'
      setAnalysis(text)
      await createSample({
        batch_id: form.batchId, type: form.type, notes: form.notes,
        ph: form.ph ? parseFloat(form.ph) : null,
        density: form.density ? parseFloat(form.density) : null,
        img_url: imgB64 ? `data:${imgType};base64,${imgB64}` : null,
        analysis: text,
      })
      if (form.ph || form.density) {
        const updates: any = {}
        if (form.ph) updates.ph = parseFloat(form.ph)
        if (form.density) updates.density = parseFloat(form.density)
        if (form.ph && parseFloat(form.ph) < 3.2) { updates.status = 'warn'; updates.alert = `pH en ${form.ph}, debajo del rango óptimo` }
        await updateBatch(form.batchId, updates)
      }
      await logActivity(form.batchId, `Muestra analizada — ${form.batchId}`, form.type)
      const [newBatches, newSamples] = await Promise.all([fetchBatches(), fetchSamples()])
      setBatches(newBatches); setSamples(newSamples)
    } catch (e: any) {
      setAnalysis('Error: ' + e.message)
    }
    setAnalyzing(false)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-medium text-[#e8f0eb]">Muestras</h1>
        <p className="text-sm text-[#6b8c78] mt-0.5">Análisis visual con IA + historial</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Form */}
        <div className="bg-[#16221b] border border-[#1e3326] rounded-xl p-5">
          <div className="text-sm font-medium text-[#e8f0eb] mb-4">Registrar muestra</div>
          {[
            { label: 'Lote', el: (
              <select value={form.batchId} onChange={e => setForm(f => ({...f, batchId: e.target.value}))} className="w-full bg-[#111a15] border border-[#1e3326] rounded-lg px-3 py-2 text-sm text-[#e8f0eb] outline-none focus:border-[#0F6E56]">
                {batches.map(b => <option key={b.id} value={b.id}>{b.id} — {b.name}</option>)}
              </select>
            )},
            { label: 'Tipo de observación', el: (
              <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="w-full bg-[#111a15] border border-[#1e3326] rounded-lg px-3 py-2 text-sm text-[#e8f0eb] outline-none focus:border-[#0F6E56]">
                {['Turbidez visual','Color del mosto','Sedimentación','Espuma (cerveza)','Depósito visible'].map(t => <option key={t}>{t}</option>)}
              </select>
            )},
            { label: 'Notas del operador', el: (
              <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3} placeholder="Describe lo que observas..." className="w-full bg-[#111a15] border border-[#1e3326] rounded-lg px-3 py-2 text-sm text-[#e8f0eb] outline-none focus:border-[#0F6E56] resize-none" />
            )},
          ].map(({ label, el }) => (
            <div key={label} className="mb-3">
              <label className="block text-[11px] text-[#6b8c78] uppercase tracking-wider mb-1">{label}</label>
              {el}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[{id:'ph',label:'pH actual',placeholder:'4.2'},{id:'density',label:'Densidad actual',placeholder:'1.040'}].map(f => (
              <div key={f.id}>
                <label className="block text-[11px] text-[#6b8c78] uppercase tracking-wider mb-1">{f.label}</label>
                <input type="number" step="0.001" placeholder={f.placeholder} value={(form as any)[f.id]} onChange={e => setForm(v => ({...v,[f.id]:e.target.value}))} className="w-full bg-[#111a15] border border-[#1e3326] rounded-lg px-3 py-2 text-sm text-[#e8f0eb] outline-none focus:border-[#0F6E56]" />
              </div>
            ))}
          </div>
          <button onClick={analyze} disabled={analyzing} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0F6E56] hover:bg-[#1D9E75] disabled:opacity-40 text-[#e1f5ee] text-sm font-medium rounded-lg transition-colors">
            {analyzing ? 'Analizando...' : '✦ Analizar con IA y guardar'}
          </button>
        </div>

        {/* Upload + result */}
        <div className="flex flex-col gap-4">
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) readFile(f) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${drag ? 'border-[#1D9E75] bg-[#1D9E7511]' : 'border-[#1e3326] hover:border-[#0F6E56]'}`}
          >
            <div className="text-3xl mb-3">◎</div>
            <div className="text-sm font-medium text-[#e8f0eb] mb-1">Sube una foto de la muestra</div>
            <div className="text-xs text-[#6b8c78]">Arrastra o haz clic — JPG, PNG, WEBP</div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f) }} />
          </div>
          {imgB64 && (
            <img src={`data:${imgType};base64,${imgB64}`} alt="muestra" className="w-full max-h-40 object-cover rounded-xl border border-[#1e3326]" />
          )}
          {analysis && (
            <div className="bg-[#16221b] border border-[#1D9E7540] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[10px] text-[#5DCAA5] uppercase tracking-wider mb-2">
                <span>✦</span> Análisis IA
              </div>
              <p className="text-sm text-[#e8f0eb] leading-relaxed">{analysis}</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-[#16221b] border border-[#1e3326] rounded-xl p-5">
        <div className="text-sm font-medium text-[#e8f0eb] mb-4">Historial de muestras</div>
        {samples.length === 0
          ? <p className="text-sm text-[#6b8c78]">Sin muestras registradas aún</p>
          : samples.map(s => (
            <div key={s.id} className="flex gap-4 py-3 border-b border-[#1e3326] last:border-0">
              <div className="w-2 h-2 rounded-full bg-[#1D9E75] mt-1.5 shrink-0" />
              <div className="text-[11px] text-[#6b8c78] font-mono w-12 shrink-0 mt-0.5">
                {new Date(s.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[#e8f0eb]">{s.batch_id} — {s.type}</div>
                <div className="text-[11px] text-[#6b8c78] mt-0.5">{s.notes || 'Sin notas'}{s.ph ? ` · pH ${s.ph}` : ''}{s.density ? ` · Dens. ${s.density}` : ''}</div>
                {s.img_url && <img src={s.img_url} alt="muestra" className="w-16 h-16 object-cover rounded-lg border border-[#1e3326] mt-2" />}
                {s.analysis && <p className="text-[11px] text-[#9FE1CB] bg-[#111a15] rounded-lg p-2 mt-2 leading-relaxed">{s.analysis}</p>}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
