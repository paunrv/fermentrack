'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { fetchTeamAccess } from '@/app/actions/equipo'
import { TeamChatMessageRow } from '@/components/proof/TeamChatMessageRow'
import { useTeamChat } from '@/hooks/useTeamChat'
import { isTeamChatErrorCode } from '@/lib/proof/team-chat-errors'
import type { TeamChatFilter } from '@/lib/proof/team-chat-types'

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
  const [draft, setDraft] = useState('')
  const [canWrite, setCanWrite] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)
  const loteId = filter !== 'channel' ? filter.loteId : null

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

  const { messages, lotCodeToId, loading, sending, error, unreadCount, sendMessage, markRead } =
    useTeamChat({
      organizationId,
      userId,
      enabled,
      filter,
      markReadOnMount: true,
    })

  const errorMessage =
    error && isTeamChatErrorCode(error)
      ? tErrors(error)
      : error

  useEffect(() => {
    onUnreadChange?.(unreadCount)
  }, [onUnreadChange, unreadCount])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, sending])

  useEffect(() => {
    if (!enabled) return
    void markRead()
  }, [enabled, markRead, messages.length])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending || !canWrite) return
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
        }}
      >
        {t('upgradeHint')}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--canvas)',
      }}
    >
      <div
        style={{
          padding: compact ? '12px 14px' : '14px 16px',
          borderBottom: '0.5px solid var(--hairline)',
          flexShrink: 0,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
          {loteId ? t('lotThreadTitle') : t('title')}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
          {loteId ? t('lotThreadHint') : t('subtitle')}
        </p>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: compact ? '12px 14px' : '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {loading && messages.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>{t('loading')}</p>
        ) : null}
        {!loading && messages.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>{t('empty')}</p>
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
          placeholder={t('placeholder')}
          maxLength={4000}
          disabled={sending || !canWrite}
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
          disabled={sending || !canWrite || !draft.trim()}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--proof-accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: sending || !canWrite || !draft.trim() ? 'not-allowed' : 'pointer',
            opacity: sending || !canWrite || !draft.trim() ? 0.55 : 1,
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
          }}
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
