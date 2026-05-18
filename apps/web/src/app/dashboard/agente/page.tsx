'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchBatches, type Batch } from '@/lib/supabase'

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
  const [batches, setBatches]   = useState<Batch[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [imgB64, setImgB64]     = useState<string | null>(null)
  const [imgType, setImgType]   = useState('')
  const [imgName, setImgName]   = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBatches().then(b => {
      setBatches(b)
      const alerts = b.filter(x => x.status === 'warn')
      const active = b.filter(x => x.status !== 'idle')
      setMessages([{
        role: 'assistant',
        content: `Hola, soy tu agente FermenTrack conectado a **Supabase en tiempo real**. Tienes **${active.length} lotes activos**${alerts.length ? ` y **${alerts.length} alerta activa** (${alerts.map(a => a.id).join(', ')})` : ', todo en orden'}. ¿En qué puedo ayudarte?`
      }])
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function batchSummary() {
    return batches.map(b =>
      `- ${b.id} "${b.name}" (${b.type}): ${b.volume}L, día ${b.day}, densidad ${b.density}, pH ${b.ph}, temp ${b.temp}°C, progreso ${b.progress}%${b.alert ? ', ALERTA: ' + b.alert : ''}`
    ).join('\n')
  }

  function systemPrompt() {
    return `Eres el agente de FermenTrack ERP para cervecerías y bodegas. Tienes acceso en tiempo real a la base de datos Supabase.

BASE DE DATOS ACTUAL (${batches.length} lotes):
${batchSummary() || 'Sin lotes registrados'}

Responde siempre en español. Sé técnico y conciso. Usa terminología profesional de enología y cervecería. Si hay alertas activas, menciónalas. Cuando el usuario suba una foto, analiza color, turbidez y sedimentación visualmente.`
  }

  function attachImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
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
    setMessages(newMsgs); setInput(''); setImgB64(null); setImgName(''); setLoading(true)

    const apiMessages = newMsgs.map((m, i) => {
      if (m.role === 'user' && m.imgSrc && i === newMsgs.length - 1) {
        const content: any[] = [{ type: 'image', source: { type: 'base64', media_type: imgType, data: imgB64 } }]
        if (m.content !== 'Imagen adjunta') content.push({ type: 'text', text: m.content })
        return { role: 'user', content }
      }
      return { role: m.role, content: m.content }
    })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 700,
          system: systemPrompt(),
          messages: apiMessages.slice(-16)
        })
      })
      const data = await res.json()
      const reply = data.content?.find((c: any) => c.type === 'text')?.text || 'Sin respuesta.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: 'Error de conexión: ' + e.message }])
    }
    setLoading(false)
  }

  function renderContent(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="p-8 flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-[#1D9E7522] border border-[#0F6E56] flex items-center justify-center text-lg text-[#5DCAA5]">
          ✦
        </div>
        <div>
          <div className="text-sm font-medium text-[#e8f0eb]">Agente FermenTrack</div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#5DCAA5]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
            Conectado a Supabase · {batches.length} lotes
          </div>
        </div>
      </div>

      {/* Quick chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CHIPS.map(c => (
          <button key={c} onClick={() => { setInput(c); setTimeout(send, 50) }}
            className="px-3 py-1.5 text-[11px] border border-[#1e3326] text-[#6b8c78] hover:text-[#e8f0eb] hover:border-[#0F6E56] rounded-full transition-colors">
            {c}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#16221b] border border-[#1e3326] rounded-xl p-4 mb-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 items-start ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${
              m.role === 'assistant' ? 'bg-[#1D9E7522] border border-[#1e3326] text-[#5DCAA5]' : 'bg-[#1D9E7544] text-[#9FE1CB]'
            }`}>
              {m.role === 'assistant' ? '✦' : 'JR'}
            </div>
            <div className={`px-3 py-2 rounded-xl text-sm max-w-[82%] leading-relaxed ${
              m.role === 'assistant' ? 'bg-[#111a15] border border-[#1e3326] text-[#e8f0eb]' : 'bg-[#0F6E56] text-[#e1f5ee]'
            }`}>
              {m.imgSrc && <img src={m.imgSrc} alt="adjunto" className="w-32 rounded-lg mb-2 border border-[#1e3326]" />}
              <span dangerouslySetInnerHTML={{ __html: renderContent(m.content) }} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full bg-[#1D9E7522] border border-[#1e3326] flex items-center justify-center text-[10px] text-[#5DCAA5] shrink-0">✦</div>
            <div className="px-4 py-3 bg-[#111a15] border border-[#1e3326] rounded-xl">
              <div className="flex gap-1 items-center">
                {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#5DCAA5] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {imgName && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[#16221b] border border-[#1e3326] rounded-lg text-xs text-[#6b8c78]">
          <span className="text-[#9FE1CB]">◎</span>
          <span className="flex-1 truncate">{imgName}</span>
          <button onClick={() => { setImgB64(null); setImgName('') }} className="text-[#6b8c78] hover:text-[#e8f0eb]">✕</button>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => fileRef.current?.click()} className="w-10 h-10 flex items-center justify-center bg-[#16221b] border border-[#1e3326] hover:border-[#0F6E56] rounded-xl text-[#6b8c78] hover:text-[#9FE1CB] transition-colors text-base shrink-0">
          ◎
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={attachImg} />
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Pregunta sobre tus lotes, registra datos, pide recomendaciones..."
          rows={1}
          className="flex-1 bg-[#16221b] border border-[#1e3326] focus:border-[#0F6E56] rounded-xl px-4 py-2.5 text-sm text-[#e8f0eb] outline-none resize-none placeholder:text-[#6b8c78]"
        />
        <button onClick={send} disabled={loading} className="w-10 h-10 flex items-center justify-center bg-[#0F6E56] hover:bg-[#1D9E75] disabled:opacity-40 rounded-xl text-[#e1f5ee] text-base shrink-0 transition-colors">
          ↑
        </button>
      </div>
    </div>
  )
}
