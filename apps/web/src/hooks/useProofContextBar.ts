'use client'

/**
 * @deprecated Hosted Anthropic agent bar — dashboard uses BYOA connection hub (#28).
 * Still referenced by legacy operational pages until fully migrated.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import type { DisplayCards } from '@/lib/proof/agent-response-types'
import type { AgentContextHints, AgentProfileType } from '@/lib/proof/agent-context-types'

const SKELETON_MIN_MS = 300

function sleep(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms)
  })
}

function parseSseChunk(
  part: string,
  onDelta: (text: string) => void,
  onDone: (payload: {
    chatResponse?: string
    mensaje?: string
    displayCards?: DisplayCards | null
    accionLabel?: string
    accionHref?: string
    refreshLoteId?: string | null
    refreshPedidoId?: string | null
    refreshOcId?: string | null
    openSkuImagePicker?: string | null
    refreshProfile?: boolean
    suggestedReplies?: { label: string; message: string }[] | null
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
    chatResponse?: string
    mensaje?: string
    message?: string
    displayCards?: DisplayCards | null
    accionLabel?: string
    accionHref?: string
    refreshLoteId?: string | null
    refreshPedidoId?: string | null
    refreshOcId?: string | null
    openSkuImagePicker?: string | null
    refreshProfile?: boolean
    suggestedReplies?: { label: string; message: string }[] | null
  }
  try {
    payload = JSON.parse(line.slice(6))
  } catch {
    return false
  }
  if (payload.message) {
    onDone({ chatResponse: payload.message, mensaje: payload.message })
    return true
  }
  if (payload.text) onDelta(payload.text)
  if (payload.mensaje || payload.chatResponse) {
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
  const locale = useLocale() as AppLocale
  const t = useTranslations('agent.contextBar')
  const [chatResponse, setChatResponse] = useState(options.fallback?.mensaje ?? '…')
  const [displayCards, setDisplayCards] = useState<DisplayCards | null>(null)
  const [accionLabel, setAccionLabel] = useState(options.fallback?.accionLabel ?? t('viewMore'))
  const [accionHref, setAccionHref] = useState(options.fallback?.accionHref ?? '/dashboard/agente')
  const [refreshLoteId, setRefreshLoteId] = useState<string | null>(null)
  const [refreshPedidoId, setRefreshPedidoId] = useState<string | null>(null)
  const [refreshOcId, setRefreshOcId] = useState<string | null>(null)
  const [refreshProfile, setRefreshProfile] = useState(false)
  const [openSkuImagePicker, setOpenSkuImagePicker] = useState<string | null>(null)
  const [suggestedReplies, setSuggestedReplies] = useState<
    { label: string; message: string }[] | null
  >(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fallbackRef = useRef(options.fallback)
  fallbackRef.current = options.fallback
  const hintsRef = useRef(options.hints)
  hintsRef.current = options.hints
  const lastProfileRef = useRef(options.profileType)
  const hasAgentReplyRef = useRef(false)
  const loadingStartedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (lastProfileRef.current !== options.profileType) {
      lastProfileRef.current = options.profileType
      hasAgentReplyRef.current = false
      if (fallbackRef.current?.mensaje) setChatResponse(fallbackRef.current.mensaje)
      setDisplayCards(null)
    }
  }, [options.profileType])

  useEffect(() => {
    if (!options.hints?.query?.trim() && fallbackRef.current?.mensaje && !hasAgentReplyRef.current) {
      setChatResponse(fallbackRef.current.mensaje)
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
        setChatResponse(fb.mensaje)
        setAccionLabel(fb.accionLabel ?? t('viewMore'))
        setAccionHref(fb.accionHref ?? '/dashboard/agente')
      }
      setLoading(false)
      setError(null)
      return
    }

    hasAgentReplyRef.current = false
    let cancelled = false
    loadingStartedAtRef.current = Date.now()
    setLoading(true)
    setError(null)
    setDisplayCards(null)
    setSuggestedReplies(null)
    setOpenSkuImagePicker(null)
    setRefreshOcId(null)
    setRefreshProfile(false)
    setChatResponse(t('analyzing'))

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
            locale,
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
        let pendingDone: {
          chatResponse?: string
          mensaje?: string
          displayCards?: DisplayCards | null
          accionLabel?: string
          accionHref?: string
          refreshLoteId?: string | null
          refreshPedidoId?: string | null
          refreshOcId?: string | null
          openSkuImagePicker?: string | null
          refreshProfile?: boolean
          suggestedReplies?: { label: string; message: string }[] | null
        } | null = null

        const applyDone = (payload: NonNullable<typeof pendingDone>) => {
          hasAgentReplyRef.current = true
          const text = (payload.chatResponse ?? payload.mensaje ?? '').replace(/\*\*/g, '')
          if (text) setChatResponse(text)
          if (payload.displayCards !== undefined) setDisplayCards(payload.displayCards)
          if (payload.suggestedReplies !== undefined) {
            setSuggestedReplies(payload.suggestedReplies)
          }
          if (payload.accionLabel) setAccionLabel(payload.accionLabel)
          if (payload.accionHref) setAccionHref(payload.accionHref)
          if (payload.refreshLoteId) setRefreshLoteId(payload.refreshLoteId)
          if (payload.refreshPedidoId) setRefreshPedidoId(payload.refreshPedidoId)
          if (payload.refreshOcId) setRefreshOcId(payload.refreshOcId)
          if (payload.openSkuImagePicker) setOpenSkuImagePicker(payload.openSkuImagePicker)
          if (payload.refreshProfile) setRefreshProfile(true)
        }

        const handleDone = (payload: NonNullable<typeof pendingDone>) => {
          pendingDone = payload
          gotDone = true
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
                setChatResponse(
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

        if (pendingDone) {
          const elapsed = Date.now() - (loadingStartedAtRef.current ?? Date.now())
          if (elapsed < SKELETON_MIN_MS) {
            await sleep(SKELETON_MIN_MS - elapsed)
          }
          if (!cancelled) applyDone(pendingDone)
        }

        if (!gotDone) {
          const fb = fallbackRef.current
          if (fb) {
            setChatResponse(query ? t('noResponse') : fb.mensaje)
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
        setError(t('error'))
        const fb = fallbackRef.current
        if (fb && !query) {
          setChatResponse(fb.mensaje)
          setAccionLabel(fb.accionLabel ?? t('viewMore'))
          setAccionHref(fb.accionHref ?? '/dashboard/agente')
        }
      } finally {
        if (!cancelled) setLoading(false)
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
    options.hints?.conversation?.length,
    options.enabled,
    locale,
    t,
  ])

  const dismissDisplayCard = useCallback((itemId: string) => {
    setDisplayCards(prev => {
      if (!prev) return null
      const items = prev.items.filter(item => item.id !== itemId)
      return items.length > 0 ? { ...prev, items } : null
    })
  }, [])

  return {
    chatResponse,
    mensaje: chatResponse,
    displayCards,
    dismissDisplayCard,
    accionLabel,
    accionHref,
    loading,
    error,
    refreshLoteId,
    refreshPedidoId,
    refreshOcId,
    openSkuImagePicker,
    refreshProfile,
    suggestedReplies,
  }
}
