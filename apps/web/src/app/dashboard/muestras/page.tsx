'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchBatches,
  fetchSamples,
  createSample,
  updateBatch,
  logActivity,
  type Batch,
  type Sample,
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

export default function MuestrasPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [batches, setBatches] = useState<Batch[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [imgB64, setImgB64] = useState<string | null>(null)
  const [imgType, setImgType] = useState<string>('image/jpeg')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [form, setForm] = useState({
    batchId: '',
    type: 'Turbidez visual',
    notes: '',
    ph: '',
    density: '',
  })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!scope) return
    fetchBatches(supabase, scope).then(b => {
      setBatches(b)
      setForm(f => ({ ...f, batchId: b[0]?.id || '' }))
    })
    fetchSamples(supabase, scope).then(setSamples)
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setImgB64(result.split(',')[1] ?? null)
      setImgType(result.split(';')[0]?.split(':')[1] ?? 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }

  async function analyze() {
    const batch = batches.find(b => b.id === form.batchId)
    setAnalyzing(true)
    setAnalysis(null)
    const content: unknown[] = []
    if (imgB64) content.push({ type: 'image', source: { type: 'base64', media_type: imgType, data: imgB64 } })
    content.push({
      type: 'text',
      text: `Analiza esta muestra del lote ${form.batchId} (${batch?.name}, ${batch?.type}).
Tipo: ${form.type}. Notas: ${form.notes || 'ninguna'}.
${form.ph ? 'pH medido: ' + form.ph : ''} ${form.density ? 'Densidad: ' + form.density : ''}
Contexto: día ${batch?.day}, densidad actual ${batch?.density}, pH ${batch?.ph}, temp ${batch?.temp}°C.
Análisis técnico conciso (3-4 oraciones): observaciones, normalidad para esta etapa, acción recomendada.`,
    })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 400,
          system:
            'Eres experto en enología y cervecería artesanal. Responde en español, técnico y conciso.',
          messages: [{ role: 'user', content }],
        }),
      })
      const data = await res.json()
      const text = data.content?.find((c: { type: string }) => c.type === 'text')?.text || 'Sin análisis.'
      setAnalysis(text)
      await createSample(supabase, {
        batch_id: form.batchId,
        type: form.type,
        notes: form.notes,
        ph: form.ph ? parseFloat(form.ph) : null,
        density: form.density ? parseFloat(form.density) : null,
        img_url: imgB64 ? `data:${imgType};base64,${imgB64}` : null,
        analysis: text,
        ...(scope
          ? { clerk_id: scope.clerk_id, profile_type_v2: scope.profile_type_v2 }
          : {}),
      } as Sample & { clerk_id?: string; profile_type_v2?: string })
      if (form.ph || form.density) {
        const updates: Record<string, unknown> = {}
        if (form.ph) updates.ph = parseFloat(form.ph)
        if (form.density) updates.density = parseFloat(form.density)
        if (form.ph && parseFloat(form.ph) < 3.2) {
          updates.status = 'warn'
          updates.alert = `pH en ${form.ph}, debajo del rango óptimo`
        }
        await updateBatch(supabase, form.batchId, updates)
      }
      await logActivity(supabase, form.batchId, `Muestra analizada — ${form.batchId}`, form.type)
      const [newBatches, newSamples] = await Promise.all([
        fetchBatches(supabase, scope ?? undefined),
        fetchSamples(supabase, scope ?? undefined),
      ])
      setBatches(newBatches)
      setSamples(newSamples)
    } catch (e: unknown) {
      setAnalysis('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
    setAnalyzing(false)
  }

  return (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        background: '#fff',
        minHeight: '100vh',
        padding: 32,
      }}
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
          Muestras
        </h1>
        <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
          Análisis visual con IA + historial
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 32 }}>
        <div style={{ border: '1px solid var(--hairline)', padding: 24, background: COLORS[1] }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'var(--fg-0)',
              marginBottom: 16,
            }}
          >
            Registrar muestra
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>Lote</label>
            <select
              value={form.batchId}
              onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
              style={input}
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.id} — {b.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>Tipo de observación</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={input}
            >
              {[
                'Turbidez visual',
                'Color del mosto',
                'Sedimentación',
                'Espuma (cerveza)',
                'Depósito visible',
              ].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>Notas del operador</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Describe lo que observas..."
              style={{ ...input, resize: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { id: 'ph', label: 'pH actual', placeholder: '4.2' },
              { id: 'density', label: 'Densidad actual', placeholder: '1.040' },
            ].map(f => (
              <div key={f.id}>
                <label style={label}>{f.label}</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder={f.placeholder}
                  value={(form as Record<string, string>)[f.id]}
                  onChange={e => setForm(v => ({ ...v, [f.id]: e.target.value }))}
                  style={input}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={analyze}
            disabled={analyzing}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'var(--fg-0)',
              color: '#fff',
              border: '1px solid var(--hairline)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              cursor: analyzing ? 'wait' : 'pointer',
              opacity: analyzing ? 0.5 : 1,
              fontFamily: 'var(--font-display)',
            }}
          >
            {analyzing ? 'Analizando...' : '✦ Analizar con IA y guardar'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            onDragOver={e => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => {
              e.preventDefault()
              setDrag(false)
              const f = e.dataTransfer.files[0]
              if (f) readFile(f)
            }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: '1px dashed var(--line)',
              padding: 32,
              textAlign: 'center',
              cursor: 'pointer',
              background: drag ? COLORS[0] : '#fff',
              flex: 1,
              minHeight: 180,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--fg-0)' }}>◎</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--fg-0)',
                marginBottom: 4,
                letterSpacing: '-.02em',
              }}
            >
              Sube una foto de la muestra
            </div>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>
              Arrastra o haz clic — JPG, PNG, WEBP
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) readFile(f)
              }}
            />
          </div>

          {imgB64 && (
            <img
              src={`data:${imgType};base64,${imgB64}`}
              alt="muestra"
              style={{
                width: '100%',
                maxHeight: 160,
                objectFit: 'cover',
                border: '1px solid var(--hairline)',
              }}
            />
          )}

          {analysis && (
            <div
              style={{
                border: '1px solid var(--hairline)',
                padding: 16,
                background: COLORS[3],
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-0)',
                  marginBottom: 8,
                }}
              >
                ✦ Análisis IA
              </div>
              <p style={{ fontSize: 13, color: 'var(--fg-0)', lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                {analysis}
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid var(--hairline)', padding: 24, background: '#fff' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: 'var(--fg-0)',
            marginBottom: 16,
          }}
        >
          Historial de muestras
        </div>
        {samples.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>Sin muestras registradas aún</p>
        ) : (
          samples.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                gap: 16,
                padding: '12px 0',
                borderBottom: i < samples.length - 1 ? '1px solid var(--hairline)' : 'none',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: COLORS[i % COLORS.length],
                  border: '1px solid var(--hairline)',
                  marginTop: 6,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: '#888',
                  width: 48,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {new Date(s.created_at).toLocaleDateString('es', {
                  day: '2-digit',
                  month: 'short',
                })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--fg-0)', letterSpacing: '-.02em' }}>
                  {s.batch_id} — {s.type}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontWeight: 500 }}>
                  {s.notes || 'Sin notas'}
                  {s.ph ? ` · pH ${s.ph}` : ''}
                  {s.density ? ` · Dens. ${s.density}` : ''}
                </div>
                {s.img_url && (
                  <img
                    src={s.img_url}
                    alt="muestra"
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: 'cover',
                      border: '1px solid var(--hairline)',
                      marginTop: 8,
                    }}
                  />
                )}
                {s.analysis && (
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--fg-0)',
                      background: COLORS[(i + 2) % COLORS.length],
                      border: '1px solid var(--hairline)',
                      padding: 10,
                      marginTop: 8,
                      lineHeight: 1.5,
                      fontWeight: 500,
                      marginBottom: 0,
                    }}
                  >
                    {s.analysis}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
