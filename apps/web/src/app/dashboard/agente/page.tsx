'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchBatches, type Batch } from '@/lib/supabase'

const COLORS = ['#FAC775', '#9FE1CB', '#F5C4B3', '#B5D4F4', '#C0DD97', '#F4C0D1']
const font = "'Space Grotesk', sans-serif"

interface Message {
  role: 'user' | 'assistant'
  content: string
  imgSrc?: string
}

const CHIPS = [
  '¿Cuáles son mis lotes activos y su estado?',
  '¿Qué alertas tengo activas?',
  '¿Cuántos litros estoy produciendo en total?',
  'Dame recomendaciones técnicas para los lotes con alertas',
  'Muéstrame el resumen completo de todos mis lotes',
]

export default function AgentePage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [imgB64, setImgB64] = useState<string | null>(null)
  const [imgType, setImgType] = useState('')
  const [imgName, setImgName] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBatches().then(b => {
      setBatches(b)
      const alerts = b.filter(x => x.status === 'warn')
      const active = b.filter(x => x.status !== 'idle')
      setMessages([
        {
          role: 'assistant',
          content: `Hola, soy tu agente FermenTrack conectado a **Supabase en tiempo real**. Tienes **${active.length} lotes activos**${alerts.length ? ` y **${alerts.length} alerta activa** (${alerts.map(a => a.id).join(', ')})` : ', todo en orden'}. ¿En qué puedo ayudarte?`,
        },
      ])
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function batchSummary() {
    return batches
      .map(
        b =>
          `- ${b.id} "${b.name}" (${b.type}): ${b.volume}L, día ${b.day}, densidad ${b.density}, pH ${b.ph}, temp ${b.temp}°C, progreso ${b.progress}%${b.alert ? ', ALERTA: ' + b.alert : ''}`
      )
      .join('\n')
  }

  function systemPrompt() {
    return `Eres el agente de FermenTrack ERP para cervecerías y bodegas. Tienes acceso en tiempo real a la base de datos Supabase.

BASE DE DATOS ACTUAL (${batches.length} lotes):
${batchSummary() || 'Sin lotes registrados'}

Responde siempre en español. Sé técnico y conciso. Usa terminología profesional de enología y cervecería. Si hay alertas activas, menciónalas. Cuando el usuario suba una foto, analiza color, turbidez y sedimentación visualmente.`
  }

  function attachImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const r = ev.target?.result as string
      setImgB64(r.split(',')[1])
      setImgType(r.split(';')[0].split(':')[1])
    }
    reader.readAsDataURL(file)
  }

  async function send() {
    if (!input.trim() && !imgB64) return
    const imgSrc = imgB64 ? `data:${imgType};base64,${imgB64}` : undefined
    const userMsg: Message = { role: 'user', content: input || 'Imagen adjunta', imgSrc }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setImgB64(null)
    setImgName('')
    setLoading(true)

    const apiMessages = newMsgs.map((m, i) => {
      if (m.role === 'user' && m.imgSrc && i === newMsgs.length - 1) {
        const content: unknown[] = [
          { type: 'image', source: { type: 'base64', media_type: imgType, data: imgB64 } },
        ]
        if (m.content !== 'Imagen adjunta')
          content.push({ type: 'text', text: m.content })
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
        data.content?.find((c: { type: string }) => c.type === 'text')?.text || 'Sin respuesta.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e: unknown) {
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: 'Error de conexión: ' + (e instanceof Error ? e.message : 'desconocido'),
        },
      ])
    }
    setLoading(false)
  }

  async function quickSend(text: string) {
    if (loading) return
    const userMsg: Message = { role: 'user', content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 700,
          system: systemPrompt(),
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })).slice(-16),
        }),
      })
      const data = await res.json()
      const reply =
        data.content?.find((c: { type: string }) => c.type === 'text')?.text || 'Sin respuesta.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e: unknown) {
      setMessages(m => [
        ...m,
        { role: 'assistant', content: 'Error: ' + (e instanceof Error ? e.message : 'desconocido') },
      ])
    }
    setLoading(false)
  }

  function renderContent(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div
      style={{
        fontFamily: font,
        background: '#fff',
        minHeight: '100vh',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #111',
            background: COLORS[1],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 800,
            color: '#111',
          }}
        >
          ✦
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '-.02em',
              color: '#111',
              textTransform: 'uppercase',
            }}
          >
            Agente FermenTrack
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: '#888',
              marginTop: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: '#1D9E75',
                border: '1px solid #111',
              }}
            />
            Conectado a Supabase · {batches.length} lotes
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {CHIPS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => quickSend(c)}
            style={{
              padding: '8px 12px',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              border: '3px solid #111',
              background: '#fff',
              color: '#111',
              cursor: 'pointer',
              fontFamily: font,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          border: '3px solid #111',
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: '#fff',
        }}
      >
        {messages.map((m, i) => {
          const isUser = m.role === 'user'
          const aiIdx = messages.slice(0, i).filter(x => x.role === 'assistant').length
          const aiColor = !isUser ? COLORS[aiIdx % COLORS.length] : undefined

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                flexDirection: isUser ? 'row-reverse' : 'row',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: '3px solid #111',
                  background: isUser ? '#111' : aiColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  color: isUser ? '#fff' : '#111',
                  flexShrink: 0,
                }}
              >
                {isUser ? 'TÚ' : '✦'}
              </div>
              <div
                style={{
                  padding: '12px 14px',
                  maxWidth: '82%',
                  fontSize: 13,
                  lineHeight: 1.6,
                  fontWeight: 500,
                  border: '3px solid #111',
                  background: isUser ? '#111' : aiColor,
                  color: isUser ? '#fff' : '#111',
                }}
              >
                {m.imgSrc && (
                  <img
                    src={m.imgSrc}
                    alt="adjunto"
                    style={{
                      width: 128,
                      marginBottom: 8,
                      border: '3px solid #111',
                      display: 'block',
                    }}
                  />
                )}
                <span dangerouslySetInnerHTML={{ __html: renderContent(m.content) }} />
              </div>
            </div>
          )
        })}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: '3px solid #111',
                background: COLORS[0],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                color: '#111',
                flexShrink: 0,
              }}
            >
              ✦
            </div>
            <div
              style={{
                padding: '14px 16px',
                border: '3px solid #111',
                background: COLORS[0],
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#111',
              }}
            >
              Pensando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {imgName && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            padding: '10px 12px',
            border: '3px solid #111',
            background: COLORS[2],
            fontSize: 11,
            fontWeight: 700,
            color: '#111',
          }}
        >
          <span>◎</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              cursor: 'pointer',
              fontWeight: 800,
              color: '#111',
              fontFamily: font,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            border: '3px solid #111',
            fontSize: 16,
            color: '#111',
            cursor: 'pointer',
            flexShrink: 0,
            fontFamily: font,
          }}
        >
          ◎
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={attachImg} />
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Pregunta sobre tus lotes, registra datos, pide recomendaciones..."
          rows={1}
          style={{
            flex: 1,
            background: '#fff',
            border: '3px solid #111',
            padding: '12px 14px',
            fontSize: 13,
            fontWeight: 500,
            color: '#111',
            outline: 'none',
            resize: 'none',
            fontFamily: font,
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={loading}
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#111',
            border: '3px solid #111',
            color: '#fff',
            fontSize: 16,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.5 : 1,
            flexShrink: 0,
            fontFamily: font,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
