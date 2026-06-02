'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchBatches, type Batch } from '@/lib/supabase'

/* =========================================================================
   PROOF · ASSISTANT
   The AI agent IS PROOF. Habla en español, claro y directo.
   ========================================================================= */

interface Message {
  role: 'user' | 'assistant'
  content: string
  imgSrc?: string
  ts: number
}

const SUGGESTIONS = [
  { id: 's1', label: '¿Cuánto stock me queda?' },
  { id: 's2', label: 'Muéstrame productos con bajo stock' },
  { id: 's3', label: 'Resumen de movimientos del día' },
  { id: 's4', label: '¿Qué etiquetas rotan más lento?' },
  { id: 's5', label: '¿Qué botella deja mejor margen?' },
  { id: 's6', label: 'Sube esta factura al lote correcto' },
]

const STATUS_META: Record<Batch['status'], { label: string; tone: string }> = {
  active: { label: 'Activo', tone: 'var(--ok)' },
  warn: { label: 'Atención', tone: 'var(--warn)' },
  idle: { label: 'Reposo', tone: 'var(--fg-3)' },
}

function clockOf(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function renderContent(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')
}

export default function AgentePage() {
  const router = useRouter()
  const search = useSearchParams()
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [batches, setBatches] = useState<Batch[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [imgB64, setImgB64] = useState<string | null>(null)
  const [imgType, setImgType] = useState('')
  const [imgName, setImgName] = useState('')
  const [showCommands, setShowCommands] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /* ── greeting ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!scope) return
    fetchBatches(supabase, scope).then(b => {
      setBatches(b)
      const alerts = b.filter(x => x.status === 'warn')
      const active = b.filter(x => x.status !== 'idle')
      const intro =
        active.length === 0
          ? 'Hola, soy **PROOF**. Aún no tienes lotes activos — cuando los registres podré ayudarte con producción, inventario y movimientos. Mientras tanto, pregúntame lo que quieras o súbeme una foto.'
          : `Hola, soy **PROOF**. Tienes **${active.length} lote${active.length === 1 ? '' : 's'} activo${active.length === 1 ? '' : 's'}**${
              alerts.length
                ? ` y **${alerts.length} con atención** (${alerts.map(a => a.id).join(', ')})`
                : '. Todo está en orden'
            }. ¿En qué te ayudo?`
      setMessages([{ role: 'assistant', ts: Date.now(), content: intro }])
    })
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  /* ── pick up ?q= from top bar ─────────────────────────────────── */
  useEffect(() => {
    const q = search?.get('q')
    if (q && q.trim()) {
      const id = setTimeout(() => sendText(q.trim()), 350)
      return () => clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* ── system prompt · human, operational Spanish ──────────────── */
  function batchSummary() {
    return batches
      .map(
        b =>
          `- ${b.id} "${b.name}" (${b.type}): ${b.volume}L, día ${b.day}, densidad ${b.density}, pH ${b.ph}, temp ${b.temp}°C, progreso ${b.progress}%${
            b.alert ? ', ATENCIÓN: ' + b.alert : ''
          }`
      )
      .join('\n')
  }

  function systemPrompt() {
    return `Eres PROOF — el asistente operativo para bodegas, cervecerías, destilerías, distribuidores y bares. PROOF es a la vez la plataforma y la inteligencia que opera con el usuario.

TU PERSONALIDAD
- Hablas español de México, claro, directo, humano, no robótico.
- Eres calmado, preciso y útil. Como un operador experto que está al lado del usuario.
- NO usas lenguaje de ERP. Evita frases como "inventory discrepancy detected", "movement anomaly", "threshold exceeded".
- En vez de eso usas frases naturales: "Parece que salieron más botellas de las registradas", "Tu cerveza Lager bajará de stock en 4 días", "Faltan movimientos por registrar".
- Cuando confirmas algo, lo haces simple: "Listo. Registré 24 cajas de Cabernet Reserva 2025 en el almacén Ensenada."
- Cuando preguntas para confirmar, lo haces breve: "¿Las agrego al lote B-220?"

CUANDO ALGUIEN SUBE UNA FOTO
- Si es una factura, remisión o nota: extrae productos, cantidades, precios y propones a qué lote o almacén asignarlas. Pide confirmación simple.
- Si es un pallet o caja: detecta producto, cantidad y propone almacén. Pide confirmación simple.
- Si es una botella en el almacén o un líquido en muestra: analiza visualmente color, turbidez, sedimentación; describe en español enológico/cervecero claro.

TELEMETRÍA DISPONIBLE (${batches.length} lotes):
${batchSummary() || 'Sin lotes registrados todavía.'}

REGLAS
- Responde SIEMPRE en español, salvo que el usuario escriba en otro idioma.
- Sé breve. Operacional. Sin párrafos largos a menos que el usuario los pida.
- Cuando hagas falta una acción del usuario, propone UN paso con CTA claro entre corchetes, ej: [Confirmar] o [Registrar].
- Si hay alertas relevantes en la operación, súrgelas naturalmente.`
  }

  /* ── messaging ────────────────────────────────────────────────── */
  function attachImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const r = ev.target?.result as string
      setImgB64(r.split(',')[1] ?? null)
      setImgType(r.split(';')[0]?.split(':')[1] ?? '')
    }
    reader.readAsDataURL(file)
  }

  async function send() {
    if (!input.trim() && !imgB64) return
    const imgSrc = imgB64 ? `data:${imgType};base64,${imgB64}` : undefined
    const userMsg: Message = {
      role: 'user',
      content: input || 'Foto adjunta',
      imgSrc,
      ts: Date.now(),
    }
    const localImgB64 = imgB64
    const localImgType = imgType
    setInput('')
    setImgB64(null)
    setImgName('')
    setShowCommands(false)
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)

    const apiMessages = next.map((m, i) => {
      if (m.role === 'user' && m.imgSrc && i === next.length - 1) {
        const content: unknown[] = [
          { type: 'image', source: { type: 'base64', media_type: localImgType, data: localImgB64 } },
        ]
        if (m.content !== 'Foto adjunta') content.push({ type: 'text', text: m.content })
        return { role: 'user', content }
      }
      return { role: m.role, content: m.content }
    })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 700,
          system: systemPrompt(),
          messages: apiMessages.slice(-16),
        }),
      })
      const data = await res.json()
      const reply =
        data.content?.find((c: { type: string }) => c.type === 'text')?.text ||
        'No pude generar una respuesta. ¿Puedes intentar de nuevo?'
      setMessages(m => [...m, { role: 'assistant', content: reply, ts: Date.now() }])
    } catch (e: unknown) {
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content:
            'Tuve un problema de conexión: ' +
            (e instanceof Error ? e.message : 'no logré reconectar') +
            '. ¿Probamos de nuevo?',
          ts: Date.now(),
        },
      ])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  async function sendText(text: string) {
    if (loading || !text.trim()) return
    setShowCommands(false)
    const userMsg: Message = { role: 'user', content: text, ts: Date.now() }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 700,
          system: systemPrompt(),
          messages: next.map(m => ({ role: m.role, content: m.content })).slice(-16),
        }),
      })
      const data = await res.json()
      const reply =
        data.content?.find((c: { type: string }) => c.type === 'text')?.text ||
        'No pude generar una respuesta. ¿Puedes intentar de nuevo?'
      setMessages(m => [...m, { role: 'assistant', content: reply, ts: Date.now() }])
    } catch (e: unknown) {
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content:
            'Tuve un problema de conexión: ' +
            (e instanceof Error ? e.message : 'no logré reconectar') +
            '. ¿Probamos de nuevo?',
          ts: Date.now(),
        },
      ])
    }
    setLoading(false)
  }

  const activeBatches = useMemo(
    () => batches.filter(b => b.status !== 'idle'),
    [batches]
  )

  const conversationStarted = messages.length > 1 || loading

  return (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--fg-1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      {/* ─── TOP BAR (assistant-specific, slimmer than dashboard's) ─── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          borderBottom: '1px solid var(--hairline)',
          background: 'rgba(7, 8, 10, 0.78)',
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            aria-label="Volver"
            style={{
              width: 28,
              height: 28,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--panel)',
              border: '1px solid var(--hairline)',
              color: 'var(--fg-2)',
              transition: 'border-color 180ms var(--ease-out), color 180ms var(--ease-out)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--line)'
              e.currentTarget.style.color = 'var(--fg-0)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--hairline)'
              e.currentTarget.style.color = 'var(--fg-2)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              aria-hidden
              style={{
                width: 28,
                height: 28,
                display: 'grid',
                placeItems: 'center',
                border: '1px solid var(--copper-soft)',
                background: 'var(--copper-glow)',
                color: 'var(--copper)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ✦
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--fg-0)',
                  letterSpacing: '0.04em',
                }}
              >
                PROOF
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg-3)',
                  letterSpacing: '-0.005em',
                  marginTop: 1,
                }}
              >
                Tu asistente operativo
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot ok live" />
            <span
              style={{
                fontSize: 11,
                color: 'var(--fg-2)',
                letterSpacing: '-0.005em',
              }}
            >
              En línea
            </span>
          </div>
        </div>
      </header>

      {/* ─── CONVERSATION ─── */}
      <section
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--ink)',
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 32px 16px',
          }}
        >
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {messages.map((m, i) => (
              <MessageRow key={i} message={m} />
            ))}
            {loading && <ThinkingRow />}

            {/* Quick command chips — visible when conversation hasn't started, hides afterward */}
            {showCommands && !conversationStarted && (
              <ChipsRow onPick={t => sendText(t)} />
            )}

            {/* Active batches preview — gentle, only when relevant */}
            {activeBatches.length > 0 && messages.length === 1 && !loading && (
              <ActiveBatchesPreview batches={activeBatches} onAsk={t => sendText(t)} />
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* image preview */}
        {imgName && (
          <div
            style={{
              maxWidth: 760,
              margin: '0 auto 12px',
              width: 'calc(100% - 64px)',
              padding: '10px 12px',
              border: '1px solid var(--copper-soft)',
              background: 'var(--copper-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                display: 'grid',
                placeItems: 'center',
                color: 'var(--copper)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 12.5,
                color: 'var(--fg-1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {imgName}
            </span>
            <button
              type="button"
              onClick={() => {
                setImgB64(null)
                setImgName('')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--copper)',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* composer */}
        <div
          style={{
            padding: '12px 32px 22px',
            borderTop: '1px solid var(--hairline)',
            background:
              'linear-gradient(180deg, transparent 0%, var(--ink) 100%)',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent, var(--copper), transparent)',
              opacity: 0.4,
            }}
          />
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                border: '1px solid var(--line)',
                background: 'var(--panel)',
                padding: 8,
                transition: 'border-color 180ms var(--ease-out)',
              }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--copper-soft)')}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--line)')}
            >
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Subir foto"
                style={{
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--canvas)',
                  border: '1px solid var(--hairline)',
                  color: 'var(--fg-2)',
                  flexShrink: 0,
                  transition: 'color 180ms var(--ease-out), border-color 180ms var(--ease-out)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--copper-soft)'
                  e.currentTarget.style.color = 'var(--copper)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--hairline)'
                  e.currentTarget.style.color = 'var(--fg-2)'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={attachImg}
              />
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Pregúntame lo que necesites — o sube una foto"
                rows={1}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  color: 'var(--fg-0)',
                  fontSize: 14,
                  lineHeight: 1.55,
                  letterSpacing: '-0.005em',
                  fontFamily: 'var(--font-display)',
                  padding: '8px 4px',
                  maxHeight: 120,
                }}
              />
              <button
                type="button"
                onClick={send}
                disabled={loading || (!input.trim() && !imgB64)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  background: input.trim() || imgB64 ? 'var(--copper)' : 'var(--canvas)',
                  border: '1px solid',
                  borderColor: input.trim() || imgB64 ? 'var(--copper)' : 'var(--hairline)',
                  color: input.trim() || imgB64 ? 'var(--ink)' : 'var(--fg-4)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  transition: 'background 180ms var(--ease-out), color 180ms var(--ease-out)',
                }}
              >
                {loading ? 'Enviando' : 'Enviar'}
              </button>
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: 'var(--fg-4)',
                letterSpacing: '-0.005em',
                textAlign: 'center',
              }}
            >
              Enter para enviar · Shift+Enter para nueva línea · Sube fotos para que PROOF las
              registre por ti
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* =========================================================================
   CHIPS · suggested first prompts
   ========================================================================= */

function ChipsRow({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        className="eyebrow"
        style={{ color: 'var(--fg-3)', paddingLeft: 42 }}
      >
        Prueba con
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          paddingLeft: 42,
        }}
      >
        {SUGGESTIONS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.label)}
            style={{
              padding: '8px 12px',
              background: 'var(--panel)',
              border: '1px solid var(--hairline)',
              color: 'var(--fg-1)',
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: '-0.005em',
              transition: 'border-color 180ms var(--ease-out), color 180ms var(--ease-out), background 180ms var(--ease-out)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--copper-soft)'
              e.currentTarget.style.background = 'var(--panel-2)'
              e.currentTarget.style.color = 'var(--fg-0)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--hairline)'
              e.currentTarget.style.background = 'var(--panel)'
              e.currentTarget.style.color = 'var(--fg-1)'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   ACTIVE BATCHES PREVIEW
   ========================================================================= */

function ActiveBatchesPreview({
  batches,
  onAsk,
}: {
  batches: Batch[]
  onAsk: (t: string) => void
}) {
  return (
    <div className="fade-up" style={{ paddingLeft: 42 }}>
      <div
        style={{
          border: '1px solid var(--hairline)',
          background: 'var(--panel)',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--hairline)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--fg-0)',
              letterSpacing: '-0.005em',
            }}
          >
            Lotes activos
          </span>
          <button
            type="button"
            onClick={() => onAsk('Dame un resumen completo de mis lotes activos')}
            style={{
              fontSize: 11,
              color: 'var(--copper)',
              background: 'transparent',
              border: 'none',
              letterSpacing: '-0.005em',
            }}
          >
            Pedir resumen →
          </button>
        </div>
        {batches.slice(0, 4).map((b, i) => (
          <div
            key={b.id}
            style={{
              padding: '10px 14px',
              borderBottom: i === Math.min(batches.length, 4) - 1 ? 'none' : '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: STATUS_META[b.status].tone,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12.5,
                color: 'var(--fg-0)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {b.name}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--fg-3)',
                letterSpacing: '-0.005em',
              }}
            >
              día {b.day} · {b.volume}L
            </span>
            <span
              style={{
                fontSize: 10,
                color: STATUS_META[b.status].tone,
                fontWeight: 600,
                letterSpacing: '-0.005em',
              }}
            >
              {STATUS_META[b.status].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   MESSAGE ROW
   ========================================================================= */

function MessageRow({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div
      className="fade-up"
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          display: 'grid',
          placeItems: 'center',
          border: '1px solid',
          borderColor: isUser ? 'var(--line)' : 'var(--copper-soft)',
          background: isUser ? 'var(--panel)' : 'var(--copper-glow)',
          color: isUser ? 'var(--fg-1)' : 'var(--copper)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {isUser ? 'TÚ' : '✦'}
      </div>
      <div
        style={{
          minWidth: 0,
          maxWidth: 620,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          gap: 4,
        }}
      >
        {message.imgSrc && (
          <img
            src={message.imgSrc}
            alt="adjunto"
            style={{
              width: 240,
              maxWidth: '100%',
              border: '1px solid var(--line)',
              display: 'block',
              marginBottom: 4,
            }}
          />
        )}
        <div
          style={{
            padding: '12px 14px',
            background: isUser ? 'var(--panel)' : 'transparent',
            border: isUser ? '1px solid var(--hairline)' : 'none',
            fontSize: 14,
            lineHeight: 1.65,
            color: isUser ? 'var(--fg-1)' : 'var(--fg-0)',
            letterSpacing: '-0.005em',
            fontWeight: 400,
          }}
          dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
        />
        <span
          style={{
            fontSize: 10,
            color: 'var(--fg-4)',
            letterSpacing: '-0.005em',
            padding: isUser ? '0 4px 0 0' : '0 0 0 14px',
          }}
        >
          {clockOf(message.ts)}
        </span>
      </div>
    </div>
  )
}

function ThinkingRow() {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 28,
          height: 28,
          display: 'grid',
          placeItems: 'center',
          border: '1px solid var(--copper-soft)',
          background: 'var(--copper-glow)',
          color: 'var(--copper)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        ✦
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span
          className="caret"
          style={{
            fontSize: 13.5,
            color: 'var(--fg-2)',
            letterSpacing: '-0.005em',
          }}
        >
          Pensando
        </span>
        <div
          className="sweep"
          style={{
            position: 'relative',
            height: 2,
            width: 180,
            background: 'var(--line)',
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  )
}
