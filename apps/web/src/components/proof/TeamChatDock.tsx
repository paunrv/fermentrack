'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { TeamChatPanel } from '@/components/proof/TeamChatPanel'
import { TEAM_CHAT_PANEL_WIDTH_PX } from '@/lib/proof/dashboard-shell'

const STORAGE_KEY = 'proof_team_chat_open'

function readChatOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === '0') return false
    if (raw === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

function writeChatOpen(open: boolean) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function useTeamChatDockState() {
  const [open, setOpenState] = useState(true)

  useEffect(() => {
    setOpenState(readChatOpen())
  }, [])

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    writeChatOpen(next)
  }, [])

  const toggle = useCallback(() => {
    setOpenState(prev => {
      const next = !prev
      writeChatOpen(next)
      return next
    })
  }, [])

  return { open, setOpen, toggle }
}

export function TeamChatRailToggle({
  open,
  unreadCount,
  onToggle,
  accent,
  expanded = false,
}: {
  open: boolean
  unreadCount: number
  onToggle: () => void
  accent: string
  expanded?: boolean
}) {
  const t = useTranslations('dashboard.teamChat')
  const label = t('toggle')

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      {...(!expanded ? { 'data-tooltip': label } : {})}
      className="proof-dashboard-rail-link"
      onClick={onToggle}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: expanded ? 'flex-start' : 'center',
        gap: expanded ? 10 : 0,
        width: '100%',
        height: 36,
        padding: expanded ? '0 10px' : 0,
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        background: open ? 'var(--hover)' : 'transparent',
        color: open ? 'var(--fg-0)' : 'var(--fg-3)',
        cursor: 'pointer',
      }}
    >
      {open ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: expanded ? 0 : -8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 2,
            height: 18,
            borderRadius: 1,
            background: accent,
          }}
        />
      ) : null}
      <span aria-hidden style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
        💬
      </span>
      {expanded ? (
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {label}
        </span>
      ) : null}
      {unreadCount > 0 ? (
        <span
          aria-label={t('unread', { count: unreadCount })}
          style={{
            position: 'absolute',
            top: 4,
            right: expanded ? 10 : 6,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: 999,
            background: 'var(--crit)',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </button>
  )
}

export function TeamChatDock({
  organizationId,
  userId,
  enabled,
  open,
  children,
  onUnreadChange,
}: {
  organizationId: string | null | undefined
  userId: string | null | undefined
  enabled: boolean
  open: boolean
  children: React.ReactNode
  onUnreadChange?: (count: number) => void
}) {
  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0 }}>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {open && enabled ? (
        <aside
          aria-label="Team chat"
          style={{
            width: TEAM_CHAT_PANEL_WIDTH_PX,
            flexShrink: 0,
            borderLeft: '0.5px solid var(--hairline)',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <TeamChatPanel
            organizationId={organizationId}
            userId={userId}
            enabled={enabled}
            onUnreadChange={onUnreadChange}
          />
        </aside>
      ) : null}
    </div>
  )
}
