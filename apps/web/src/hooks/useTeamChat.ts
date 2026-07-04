'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { sendTeamMessageAction } from '@/app/actions/team-chat'
import {
  countTeamChatUnread,
  fetchLotCodeMap,
  fetchTeamChatMessageById,
  fetchTeamChatMessages,
  markTeamChatRead,
  subscribeTeamChatMessages,
} from '@/lib/proof/team-chat'
import type { TeamChatFilter, TeamChatMessage } from '@/lib/proof/team-chat-types'

export function useTeamChat(options: {
  organizationId: string | null | undefined
  userId: string | null | undefined
  enabled: boolean
  filter?: TeamChatFilter
  markReadOnMount?: boolean
}) {
  const supabase = useSupabase()
  const { organizationId, userId, enabled, filter = 'channel', markReadOnMount = true } = options

  const [messages, setMessages] = useState<TeamChatMessage[]>([])
  const [lotCodeToId, setLotCodeToId] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const knownIdsRef = useRef(new Set<string>())

  const refreshUnread = useCallback(async () => {
    if (!organizationId || !userId || !enabled) {
      setUnreadCount(0)
      return
    }
    try {
      const count = await countTeamChatUnread(supabase, organizationId, userId)
      setUnreadCount(count)
    } catch {
      /* ignore badge errors */
    }
  }, [enabled, organizationId, supabase, userId])

  const loadMessages = useCallback(async () => {
    if (!organizationId || !enabled) {
      setMessages([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [rows, codeMap] = await Promise.all([
        fetchTeamChatMessages(supabase, organizationId, { filter, limit: 100 }),
        fetchLotCodeMap(supabase, organizationId),
      ])
      knownIdsRef.current = new Set(rows.map(row => row.id))
      setMessages(rows)
      setLotCodeToId(codeMap)
      if (markReadOnMount && userId && rows.length > 0) {
        const latest = rows[rows.length - 1]?.created_at
        if (latest) {
          await markTeamChatRead(supabase, organizationId, userId, latest)
        }
      }
      await refreshUnread()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed')
    } finally {
      setLoading(false)
    }
  }, [
    enabled,
    filter,
    markReadOnMount,
    organizationId,
    refreshUnread,
    supabase,
    userId,
  ])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!organizationId || !enabled) return

    return subscribeTeamChatMessages(supabase, organizationId, messageId => {
      if (knownIdsRef.current.has(messageId)) return
      void (async () => {
        const message = await fetchTeamChatMessageById(supabase, messageId)
        if (!message) return
        if (filter !== 'channel' && message.lote_id !== filter.loteId) return
        knownIdsRef.current.add(message.id)
        setMessages(prev => {
          if (prev.some(row => row.id === message.id)) return prev
          return [...prev, message]
        })
        if (userId && message.author_id !== userId && markReadOnMount) {
          await markTeamChatRead(supabase, organizationId, userId, message.created_at)
        }
        await refreshUnread()
      })()
    })
  }, [
    enabled,
    filter,
    markReadOnMount,
    organizationId,
    refreshUnread,
    supabase,
    userId,
  ])

  const sendMessage = useCallback(
    async (body: string, loteId?: string | null) => {
      if (!organizationId || !enabled) return
      setSending(true)
      setError(null)
      try {
        const message = await sendTeamMessageAction({ body, loteId })
        knownIdsRef.current.add(message.id)
        setMessages(prev => {
          if (prev.some(row => row.id === message.id)) return prev
          return [...prev, message]
        })
        if (userId) {
          await markTeamChatRead(supabase, organizationId, userId, message.created_at)
        }
        await refreshUnread()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'send_failed')
      } finally {
        setSending(false)
      }
    },
    [enabled, organizationId, refreshUnread, supabase, userId]
  )

  const markRead = useCallback(async () => {
    if (!organizationId || !userId || messages.length === 0) return
    const latest = messages[messages.length - 1]?.created_at
    if (!latest) return
    await markTeamChatRead(supabase, organizationId, userId, latest)
    await refreshUnread()
  }, [messages, organizationId, refreshUnread, supabase, userId])

  const filterKey = useMemo(
    () => (filter === 'channel' ? 'channel' : filter.loteId),
    [filter]
  )

  return {
    messages,
    lotCodeToId,
    loading,
    sending,
    error,
    unreadCount,
    sendMessage,
    markRead,
    refreshUnread,
    reload: loadMessages,
    filterKey,
  }
}
