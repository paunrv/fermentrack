'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { memberInitial } from '@/lib/supabase/winemaker-owner-home'
import { splitLotMentions } from '@/lib/proof/team-chat-lot-mentions'
import type { TeamChatMessage } from '@/lib/proof/team-chat-types'

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function MessageBody({
  body,
  lotCodeToId,
}: {
  body: string
  lotCodeToId: Record<string, string>
}) {
  const segments = useMemo(() => splitLotMentions(body), [body])

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          return <span key={`t-${index}`}>{segment.value}</span>
        }
        const lotId = lotCodeToId[segment.code]
        if (!lotId) {
          return (
            <span key={`m-${index}`} style={{ fontWeight: 600, color: 'var(--proof-accent)' }}>
              {segment.code}
            </span>
          )
        }
        return (
          <Link
            key={`m-${index}`}
            href={`/dashboard/lotes/${lotId}`}
            style={{
              fontWeight: 600,
              color: 'var(--proof-accent)',
              textDecoration: 'none',
            }}
          >
            {segment.code}
          </Link>
        )
      })}
    </>
  )
}

export function TeamChatMessageRow({
  message,
  lotCodeToId,
  isOwn,
}: {
  message: TeamChatMessage
  lotCodeToId: Record<string, string>
  isOwn: boolean
}) {
  const t = useTranslations('dashboard.teamChat')
  const initial = memberInitial(message.author.full_name, message.author.id)

  return (
    <article
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        flexDirection: isOwn ? 'row-reverse' : 'row',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--hover)',
          color: 'var(--fg-2)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div
        style={{
          minWidth: 0,
          maxWidth: '85%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-1)' }}>
            {isOwn ? t('you') : message.author.full_name?.trim() || t('member')}
          </span>
          <time style={{ fontSize: 10, color: 'var(--fg-3)' }} dateTime={message.created_at}>
            {formatTime(message.created_at)}
          </time>
        </div>
        {message.lote_code ? (
          <Link
            href={`/dashboard/lotes/${message.lote_id}`}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--proof-accent)',
              textDecoration: 'none',
              border: '0.5px solid var(--hairline)',
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            {message.lote_code}
          </Link>
        ) : null}
        <p
          style={{
            margin: 0,
            padding: '8px 10px',
            borderRadius: 10,
            background: isOwn ? 'var(--proof-accent-soft, var(--hover))' : 'var(--panel)',
            border: '0.5px solid var(--hairline)',
            fontSize: 13,
            lineHeight: 1.45,
            color: 'var(--fg-0)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <MessageBody body={message.body} lotCodeToId={lotCodeToId} />
        </p>
      </div>
    </article>
  )
}
