'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { countTeamChatUnread, subscribeTeamChatMessages } from '@/lib/proof/team-chat'
import { ensureGeneralConversationId } from '@/lib/proof/team-chat-conversations'

export function useTeamChatUnread(options: {
  organizationId: string | null | undefined
  userId: string | null | undefined
  enabled: boolean
}) {
  const supabase = useSupabase()
  const { organizationId, userId, enabled } = options
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
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

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!organizationId || !enabled) return

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    void ensureGeneralConversationId(supabase, organizationId)
      .then(conversationId => {
        if (cancelled) return
        unsubscribe = subscribeTeamChatMessages(supabase, conversationId, () => {
          void refresh()
        })
      })
      .catch(() => {
        /* ignore */
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [enabled, organizationId, refresh, supabase])

  return { unreadCount, refresh }
}
