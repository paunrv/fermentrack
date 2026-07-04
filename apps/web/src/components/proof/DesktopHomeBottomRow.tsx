'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Badge, Card, CardContent, CardHeader, CardTitle, Spinner } from '@fermentrack/ui'
import type { McpAgentStatusResponse } from '@/lib/mcp/agent-status'
import type { AppLocale } from '@/i18n/routing'
import type { WinemakerOwnerCopy } from '@/hooks/useWinemakerOwnerCopy'
import {
  CalendarTaskRow,
  PendingTaskRow,
} from '@/components/proof/WinemakerOwnerTaskRows'
import type { OwnerTaskRow } from '@/lib/supabase/winemaker-owner-home'

const MAX_TASK_ROWS = 5

const cardStyle = {
  minHeight: 200,
  display: 'flex' as const,
  flexDirection: 'column' as const,
}

function HomePanelCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card style={cardStyle}>
      <CardHeader style={{ paddingBottom: 0 }}>
        <CardTitle style={{ fontSize: 13, fontWeight: 600 }}>{title}</CardTitle>
      </CardHeader>
      <CardContent style={{ flex: 1, paddingTop: 12 }}>{children}</CardContent>
    </Card>
  )
}

function EmptyPanelMessage({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.45 }}>{children}</p>
  )
}

function formatTokenExpiry(locale: AppLocale, expiresAt: number | null): string | null {
  if (expiresAt == null) return null
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(expiresAt * 1000))
}

function formatRelativeTime(locale: AppLocale, iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'minute')
  if (minutes < 60) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day')
}

function PendingTasksPanel({
  tasks,
  completingTaskId,
  onComplete,
  copy,
}: {
  tasks: OwnerTaskRow[]
  completingTaskId: string | null
  onComplete: (id: string) => void
  copy: WinemakerOwnerCopy
}) {
  const tHome = useTranslations('winemaker.home')
  const tDesktop = useTranslations('winemaker.home.desktop')

  return (
    <HomePanelCard title={tHome('sections.pendingTasks')}>
      {tasks.length === 0 ? (
        <EmptyPanelMessage>{tHome('empty.noPendingTasks')}</EmptyPanelMessage>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tasks.slice(0, MAX_TASK_ROWS).map(task => (
            <PendingTaskRow
              key={task.id}
              task={task}
              completing={completingTaskId}
              onComplete={onComplete}
              copy={copy}
            />
          ))}
          {tasks.length > MAX_TASK_ROWS ? (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
              {tDesktop('moreTasks', { count: tasks.length - MAX_TASK_ROWS })}
            </p>
          ) : null}
        </div>
      )}
    </HomePanelCard>
  )
}

function CalendarPanel({
  tasks,
  completingTaskId,
  onComplete,
  copy,
}: {
  tasks: OwnerTaskRow[]
  completingTaskId: string | null
  onComplete: (id: string) => void
  copy: WinemakerOwnerCopy
}) {
  const tHome = useTranslations('winemaker.home')
  const tDesktop = useTranslations('winemaker.home.desktop')

  return (
    <HomePanelCard title={tHome('sections.calendar')}>
      {tasks.length === 0 ? (
        <EmptyPanelMessage>{tHome('empty.noTasksToday')}</EmptyPanelMessage>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tasks.slice(0, MAX_TASK_ROWS).map(task => (
            <CalendarTaskRow
              key={task.id}
              task={task}
              completing={completingTaskId}
              onComplete={onComplete}
              copy={copy}
            />
          ))}
          {tasks.length > MAX_TASK_ROWS ? (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
              {tDesktop('moreTasks', { count: tasks.length - MAX_TASK_ROWS })}
            </p>
          ) : null}
        </div>
      )}
    </HomePanelCard>
  )
}

function AgentExternalPanel({
  mcpConfigured,
  agentStatus,
  agentLoading,
}: {
  mcpConfigured: boolean
  agentStatus: McpAgentStatusResponse | null
  agentLoading: boolean
}) {
  const locale = useLocale() as AppLocale
  const tDesktop = useTranslations('winemaker.home.desktop')
  const tHub = useTranslations('connectionHub')

  const tokenLabel =
    agentStatus?.tokenExpiresAt != null
      ? agentStatus.tokenExpired
        ? tDesktop('tokenExpired')
        : tDesktop('tokenExpires', {
            date: formatTokenExpiry(locale, agentStatus.tokenExpiresAt) ?? '',
          })
      : null

  const lastTool = agentStatus?.lastToolCall

  return (
    <HomePanelCard title={tDesktop('agentCard')}>
      {agentLoading ? (
        <Spinner size="sm" />
      ) : !mcpConfigured ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <EmptyPanelMessage>{tDesktop('agentDisconnected')}</EmptyPanelMessage>
          <Link
            href="/dashboard/conectar"
            style={{ fontSize: 12, fontWeight: 600, color: '#6940A5', textDecoration: 'none' }}
          >
            {tHub('ownerCta.action')} →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Badge variant={agentStatus?.tokenExpired ? 'warning' : 'success'}>
            {tDesktop('agentConnected')}
          </Badge>

          {tokenLabel ? (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.45 }}>{tokenLabel}</p>
          ) : null}

          {lastTool ? (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.45 }}>
              {tDesktop('lastToolCall', {
                tool: lastTool.toolName,
                when: formatRelativeTime(locale, lastTool.createdAt),
              })}
            </p>
          ) : (
            <EmptyPanelMessage>{tDesktop('noToolCallsYet')}</EmptyPanelMessage>
          )}

          <Link
            href="/dashboard/conectar"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', textDecoration: 'none' }}
          >
            {tDesktop('manageConnection')} →
          </Link>
        </div>
      )}
    </HomePanelCard>
  )
}

export function DesktopHomeBottomRow({
  pendingTasks,
  tasksToday,
  completingTaskId,
  onCompleteTask,
  copy,
  mcpConfigured,
  agentStatus,
  agentLoading,
}: {
  pendingTasks: OwnerTaskRow[]
  tasksToday: OwnerTaskRow[]
  completingTaskId: string | null
  onCompleteTask: (taskId: string) => void
  copy: WinemakerOwnerCopy
  mcpConfigured: boolean
  agentStatus: McpAgentStatusResponse | null
  agentLoading: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 16,
        alignItems: 'stretch',
      }}
    >
      <PendingTasksPanel
        tasks={pendingTasks}
        completingTaskId={completingTaskId}
        onComplete={onCompleteTask}
        copy={copy}
      />
      <CalendarPanel
        tasks={tasksToday}
        completingTaskId={completingTaskId}
        onComplete={onCompleteTask}
        copy={copy}
      />
      <AgentExternalPanel
        mcpConfigured={mcpConfigured}
        agentStatus={agentStatus}
        agentLoading={agentLoading}
      />
    </div>
  )
}
