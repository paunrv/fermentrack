'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { fetchTeamAccess } from '@/app/actions/equipo'
import { fetchChatPeers, type ChatPeer } from '@/app/actions/team-chat-peers'
import { TeamChatMessageRow } from '@/components/proof/TeamChatMessageRow'
import { useTeamChat } from '@/hooks/useTeamChat'
import { useSupabase } from '@/hooks/useSupabase'
import { isTeamChatErrorCode } from '@/lib/proof/team-chat-errors'
import {
  ensureGeneralConversationId,
  getOrCreateDmConversationId,
} from '@/lib/proof/team-chat-conversations'
import { memberInitial } from '@/lib/supabase/winemaker-owner-home'
import type { TeamChatFilter, TeamChatTarget } from '@/lib/proof/team-chat-types'

function peerLabel(peer: ChatPeer, fallback: string): string {
  return peer.fullName?.trim() || fallback
}

export function TeamChatPanel({
  organizationId,
  userId,
  enabled,
  filter = 'channel',
  compact = false,
  onUnreadChange,
}: {
  organizationId: string | null | undefined
  userId: string | null | undefined
  enabled: boolean
  filter?: TeamChatFilter
  compact?: boolean
  onUnreadChange?: (count: number) => void
}) {
  const t = useTranslations('dashboard.teamChat')
  const tErrors = useTranslations('dashboard.teamChat.errors')
  const supabase = useSupabase()
  const [draft, setDraft] = useState('')
  const [canWrite, setCanWrite] = useState(true)
  const [peers, setPeers] = useState<ChatPeer[]>([])
  const [target, setTarget] = useState<TeamChatTarget>({ kind: 'general' })
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const loteId = filter !== 'channel' ? filter.loteId : null
  const showSwitcher = filter === 'channel'

  useEffect(() => {
    if (!organizationId || !enabled) {
      setCanWrite(false)
      return
    }

    let cancelled = false
    void fetchTeamAccess(organizationId)
      .then(access => {
        if (!cancelled) setCanWrite(access.canWrite)
      })
      .catch(() => {
        if (!cancelled) setCanWrite(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, organizationId])

  useEffect(() => {
    if (!organizationId || !enabled || !showSwitcher) {
      setPeers([])
      return
    }

    let cancelled = false
    void fetchChatPeers(organizationId)
      .then(rows => {
        if (!cancelled) setPeers(rows)
      })
      .catch(() => {
        if (!cancelled) setPeers([])
      })

    return () => {
      cancelled = true
    }
  }, [enabled, organizationId, showSwitcher])

  useEffect(() => {
    if (!organizationId || !enabled) {
      setConversationId(null)
      return
    }

    let cancelled = false
    setResolving(true)

    void (async () => {
      try {
        const id =
          target.kind === 'general'
            ? await ensureGeneralConversationId(supabase, organizationId)
            : await getOrCreateDmConversationId(supabase, organizationId, target.peerUserId)
        if (!cancelled) setConversationId(id)
      } catch {
        if (!cancelled) setConversationId(null)
      } finally {
        if (!cancelled) setResolving(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, organizationId, supabase, target])

  const { messages, lotCodeToId, loading, sending, error, unreadCount, sendMessage, markRead } =
    useTeamChat({
      organizationId,
      userId,
      conversationId,
      enabled: enabled && !!conversationId,
      filter,
      markReadOnMount: true,
    })

  const errorMessage =
    error && isTeamChatErrorCode(error) ? tErrors(error) : error

  useEffect(() => {
    onUnreadChange?.(unreadCount)
  }, [onUnreadChange, unreadCount])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, sending, conversationId])

  useEffect(() => {
    if (!enabled || !conversationId) return
    void markRead()
  }, [enabled, markRead, messages.length, conversationId])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending || !canWrite || !conversationId) return
    setDraft('')
    await sendMessage(body, loteId)
  }

  if (!enabled) {
    return (
      <div
        style={{
          padding: compact ? 16 : 20,
          fontSize: 13,
          color: 'var(--fg-3)',
          lineHeight: 1.5,
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {t('upgradeHint')}
      </div>
    )
  }

  const title =
    loteId
      ? t('lotThreadTitle')
      : target.kind === 'general'
        ? t('title')
        : target.peerName?.trim() || t('dmTitle')

  const subtitle =
    loteId
      ? t('lotThreadHint')
      : target.kind === 'general'
        ? t('subtitle')
        : t('dmSubtitle')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--canvas)',
      }}
    >
      <div
        style={{
          padding: compact ? '10px 12px' : '12px 14px',
          borderBottom: '0.5px solid var(--hairline)',
          flexShrink: 0,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>{title}</p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>{subtitle}</p>

        {showSwitcher ? (
          <div
            role="tablist"
            aria-label={t('switcherLabel')}
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 10,
              overflowX: 'auto',
              paddingBottom: 2,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={target.kind === 'general'}
              onClick={() => setTarget({ kind: 'general' })}
              style={{
                flexShrink: 0,
                height: 28,
                padding: '0 10px',
                borderRadius: 999,
                border: '0.5px solid var(--hairline)',
                background: target.kind === 'general' ? 'var(--fg-0)' : 'var(--panel)',
                color: target.kind === 'general' ? 'var(--canvas)' : 'var(--fg-1)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t('channelGeneral')}
            </button>
            {peers.map(peer => {
              const selected =
                target.kind === 'dm' && target.peerUserId === peer.userId
              const label = peerLabel(peer, t('member'))
              return (
                <button
                  key={peer.userId}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  title={label}
                  onClick={() =>
                    setTarget({
                      kind: 'dm',
                      peerUserId: peer.userId,
                      peerName: peer.fullName,
                    })
                  }
                  style={{
                    flexShrink: 0,
                    height: 28,
                    padding: '0 8px 0 4px',
                    borderRadius: 999,
                    border: '0.5px solid var(--hairline)',
                    background: selected ? 'var(--fg-0)' : 'var(--panel)',
                    color: selected ? 'var(--canvas)' : 'var(--fg-1)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    maxWidth: 140,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: selected ? 'rgba(255,255,255,0.2)' : 'var(--hover)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {memberInitial(peer.fullName, peer.userId)}
                  </span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                    }}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: compact ? '12px 14px' : '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overscrollBehavior: 'contain',
        }}
      >
        {resolving || (loading && messages.length === 0) ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>{t('loading')}</p>
        ) : null}
        {!resolving && !loading && messages.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
            {target.kind === 'dm' ? t('dmEmpty') : t('empty')}
          </p>
        ) : null}
        {messages.map(message => (
          <TeamChatMessageRow
            key={message.id}
            message={message}
            lotCodeToId={lotCodeToId}
            isOwn={message.author_id === userId}
          />
        ))}
        <div ref={endRef} aria-hidden style={{ height: 0 }} />
      </div>

      <form
        onSubmit={event => void handleSubmit(event)}
        style={{
          padding: compact ? '10px 12px' : '12px 14px',
          borderTop: '0.5px solid var(--hairline)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {!canWrite ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.45 }}>
            {t('readOnlyHint')}
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            placeholder={
              target.kind === 'dm' ? t('dmPlaceholder') : t('placeholder')
            }
            maxLength={4000}
            disabled={sending || !canWrite || !conversationId}
            aria-label={t('placeholder')}
            style={{
              flex: 1,
              minWidth: 0,
              height: 36,
              borderRadius: 8,
              border: '0.5px solid var(--hairline)',
              background: 'var(--panel)',
              padding: '0 12px',
              fontSize: 13,
              color: 'var(--fg-0)',
            }}
          />
          <button
            type="submit"
            disabled={sending || !canWrite || !conversationId || !draft.trim()}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--proof-accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor:
                sending || !canWrite || !conversationId || !draft.trim()
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                sending || !canWrite || !conversationId || !draft.trim() ? 0.55 : 1,
            }}
          >
            {t('send')}
          </button>
        </div>
      </form>

      {errorMessage ? (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '8px 14px 12px',
            fontSize: 12,
            color: 'var(--crit)',
            flexShrink: 0,
          }}
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
