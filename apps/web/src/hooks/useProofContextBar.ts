'use client'

/**
 * @deprecated Hosted Anthropic agent bar — dashboard uses BYOA connection hub (#28/#29).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { DisplayCards } from '@/lib/proof/agent-response-types'
import type { AgentContextHints, AgentProfileType } from '@/lib/proof/agent-context-types'

export function useProofContextBar(options: {
  pantalla: string
  vista?: string
  profileType?: AgentProfileType | null
  hints?: AgentContextHints
  enabled?: boolean
  requestId?: number
  fallback?: { mensaje: string; accionLabel?: string; accionHref?: string }
}) {
  const t = useTranslations('agent.contextBar')
  const [chatResponse, setChatResponse] = useState(options.fallback?.mensaje ?? '…')
  const [displayCards, setDisplayCards] = useState<DisplayCards | null>(null)
  const [accionLabel, setAccionLabel] = useState(options.fallback?.accionLabel ?? t('viewMore'))
  const [accionHref, setAccionHref] = useState(options.fallback?.accionHref ?? '/dashboard')
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
  const lastProfileRef = useRef(options.profileType)
  const hasAgentReplyRef = useRef(false)

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

    const query = options.hints?.query?.trim() ?? ''

    if (!query) {
      const fb = fallbackRef.current
      if (fb && !hasAgentReplyRef.current) {
        setChatResponse(fb.mensaje)
        setAccionLabel(fb.accionLabel ?? t('viewMore'))
        setAccionHref(fb.accionHref ?? '/dashboard')
      }
      setLoading(false)
      setError(null)
      return
    }

    hasAgentReplyRef.current = false
    setLoading(false)
    setError(null)
    setDisplayCards(null)
    setSuggestedReplies(null)
    setChatResponse(t('noResponse'))
    setAccionLabel(t('viewMore'))
    setAccionHref('/dashboard')
  }, [
    options.profileType,
    options.requestId,
    options.hints?.query,
    options.hints?.conversation?.length,
    options.enabled,
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
