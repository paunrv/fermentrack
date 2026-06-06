'use client'

import { useEffect, useRef, useState } from 'react'
import type { AgentContextHints, AgentProfileType } from '@/lib/proof/agent-context-types'

function parseSseChunk(
  part: string,
  onDelta: (text: string) => void,
  onDone: (payload: {
    mensaje?: string
    accionLabel?: string
    accionHref?: string
    refreshLoteId?: string | null
    refreshPedidoId?: string | null
  }) => void,
  onError: (message: string) => void
): boolean {
  if (part.includes('event: error')) {
    const errLine = part.split('\n').find(l => l.startsWith('data: '))
    if (errLine) {
      const errPayload = JSON.parse(errLine.slice(6)) as { message?: string }
      onError(errPayload.message || 'Error en contexto PROOF')
      return true
    }
  }
  const line = part.split('\n').find(l => l.startsWith('data: '))
  if (!line) return false
  let payload: {
    text?: string
    mensaje?: string
    message?: string
    accionLabel?: string
    accionHref?: string
    refreshLoteId?: string | null
    refreshPedidoId?: string | null
  }
  try {
    payload = JSON.parse(line.slice(6))
  } catch {
    return false
  }
  if (payload.message) {
    onDone({ mensaje: payload.message })
    return true
  }
  if (payload.text) onDelta(payload.text)
  if (payload.mensaje) {
    onDone(payload)
    return true
  }
  return false
}

export function useProofContextBar(options: {
  pantalla: string
  vista?: string
  /** Perfil activo — obligatorio cuando enabled (distiller | distributor) */
  profileType?: AgentProfileType | null
  hints?: AgentContextHints
  enabled?: boolean
  /** Incrementar al enviar una pregunta para forzar refetch aunque el texto sea igual */
  requestId?: number
  fallback?: { mensaje: string; accionLabel?: string; accionHref?: string }
}) {
  const [mensaje, setMensaje] = useState(options.fallback?.mensaje ?? '…')
  const [accionLabel, setAccionLabel] = useState(options.fallback?.accionLabel ?? 'Ver más')
  const [accionHref, setAccionHref] = useState(options.fallback?.accionHref ?? '/dashboard/agente')
  const [refreshLoteId, setRefreshLoteId] = useState<string | null>(null)
  const [refreshPedidoId, setRefreshPedidoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(options.enabled !== false))
  const fallbackRef = useRef(options.fallback)
  fallbackRef.current = options.fallback
  const hintsRef = useRef(options.hints)
  hintsRef.current = options.hints
  const lastProfileRef = useRef(options.profileType)
  /** Evita pisar la respuesta del agente cuando hints.query se limpia tras contestar */
  const hasAgentReplyRef = useRef(false)

  useEffect(() => {
    if (lastProfileRef.current !== options.profileType) {
      lastProfileRef.current = options.profileType
      hasAgentReplyRef.current = false
      if (fallbackRef.current?.mensaje) setMensaje(fallbackRef.current.mensaje)
    }
  }, [options.profileType])

  useEffect(() => {
    if (!options.hints?.query?.trim() && fallbackRef.current?.mensaje && !hasAgentReplyRef.current) {
      setMensaje(fallbackRef.current.mensaje)
    }
  }, [options.fallback?.mensaje, options.hints?.query])

  useEffect(() => {
    if (options.enabled === false || !options.profileType) {
      setLoading(false)
      return
    }

    const profileType = options.profileType
    const query = options.hints?.query?.trim() ?? ''
    const ac = new AbortController()

    if (!query) {
      const fb = fallbackRef.current
      if (fb && !hasAgentReplyRef.current) {
        setMensaje(fb.mensaje)
        setAccionLabel(fb.accionLabel ?? 'Ver más')
        setAccionHref(fb.accionHref ?? '/dashboard/agente')
      }
      setLoading(false)
      return
    }

    hasAgentReplyRef.current = false
    let cancelled = false
    setLoading(true)
    setMensaje('PROOF analizando…')

    console.log('[useProofContextBar] fetch', {
      profileType,
      pantalla: options.pantalla,
      vista: options.vista,
      query: query || null,
    })

    void (async () => {
      try {
        const res = await fetch('/api/proof/contexto', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
          body: JSON.stringify({
            pantalla: options.pantalla,
            vista: options.vista,
            profileType,
            hints: hintsRef.current,
          }),
        })
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(errBody.error || `contexto ${res.status}`)
        }
        if (!res.body) throw new Error('contexto failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let streamed = ''
        let gotDone = false

        const handleDone = (payload: {
          mensaje?: string
          accionLabel?: string
          accionHref?: string
          refreshLoteId?: string | null
          refreshPedidoId?: string | null
        }) => {
          gotDone = true
          hasAgentReplyRef.current = true
          if (payload.mensaje) setMensaje(payload.mensaje.replace(/\*\*/g, ''))
          if (payload.accionLabel) setAccionLabel(payload.accionLabel)
          if (payload.accionHref) setAccionHref(payload.accionHref)
          if (payload.refreshLoteId) setRefreshLoteId(payload.refreshLoteId)
          if (payload.refreshPedidoId) setRefreshPedidoId(payload.refreshPedidoId)
        }

        const processBuffer = () => {
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''
          for (const part of parts) {
            if (cancelled) return
            const done = parseSseChunk(
              part,
              text => {
                streamed += text
                setMensaje(
                  streamed
                    .replace(/^\s*\{[^}]*"mensaje"\s*:\s*"?/, '')
                    .replace(/"?\s*,?\s*"accionLabel[\s\S]*$/, '')
                )
              },
              handleDone,
              msg => {
                throw new Error(msg)
              }
            )
            if (done && gotDone) return
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (cancelled) return
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          processBuffer()
        }

        if (buffer.trim()) {
          buffer += '\n\n'
          processBuffer()
        }

        if (!gotDone) {
          const fb = fallbackRef.current
          if (fb) {
            setMensaje(
              query
                ? 'PROOF no respondió. Intenta de nuevo o usa el menú Compras.'
                : fb.mensaje
            )
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        if (cancelled) return
        console.error('[useProofContextBar] error', {
          profileType: options.profileType,
          pantalla: options.pantalla,
          query: options.hints?.query ?? null,
          err,
        })
        const fb = fallbackRef.current
        const detail = err instanceof Error ? err.message : 'Error desconocido'
        if (fb) {
          setMensaje(
            query
              ? `No pude conectar con PROOF: ${detail}`
              : fb.mensaje
          )
          setAccionLabel(fb.accionLabel ?? 'Ver más')
          setAccionHref(fb.accionHref ?? '/dashboard/agente')
        }
      } finally {
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [
    options.pantalla,
    options.vista,
    options.profileType,
    options.requestId,
    options.hints?.query,
    options.enabled,
  ])

  return { mensaje, accionLabel, accionHref, loading, refreshLoteId, refreshPedidoId }
}
