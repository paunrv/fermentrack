'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertCard } from '@/components/proof/AlertCard'
import { CollapsibleSection } from '@/components/proof/CollapsibleSection'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/context/OrganizationContext'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  useWinemakerOwnerCopy,
  type WinemakerOwnerCopy,
} from '@/hooks/useWinemakerOwnerCopy'
import { buildOwnerAlertDescriptors } from '@/lib/proof/winemaker-owner-alerts'
import { getProfileTheme, proofAccentCssVars } from '@/lib/proof/profile-theme'
import type { AlertaOperativa } from '@/lib/proof/types'
import {
  completeTask,
  fetchActiveLots,
  fetchLotEvents,
  fetchOwnerOrganizationId,
  fetchPendingTasks,
  fetchProfileFirstName,
  fetchTasksToday,
  fetchTeamMembers,
  memberInitial,
  type OwnerLotRow,
  type OwnerTaskRow,
  type OwnerTeamMember,
} from '@/lib/supabase/winemaker-owner-home'

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, padding: '8px 4px', fontSize: 13, color: 'var(--fg-3)' }}>{children}</p>
  )
}

function LotRow({ lot, copy }: { lot: OwnerLotRow; copy: WinemakerOwnerCopy }) {
  const router = useRouter()
  const tHome = useTranslations('winemaker.home')
  const meta = [copy.stageLabel(lot.current_stage), lot.varietal].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      className="proof-task-row"
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
      onClick={() => router.push(`/dashboard/lotes/${lot.id}`)}
    >
      <span style={{ fontSize: 16, lineHeight: 1.2 }} aria-hidden>
        🍷
      </span>
      <div style={{ minWidth: 0 }}>
        <p className="proof-task-row__title">{lot.code}</p>
        <p className="proof-task-row__meta">{meta || tHome('noDetail')}</p>
      </div>
    </button>
  )
}

function CalendarTaskRow({
  task,
  onComplete,
  completing,
  copy,
}: {
  task: OwnerTaskRow
  onComplete: (id: string) => void
  completing: string | null
  copy: WinemakerOwnerCopy
}) {
  const tHome = useTranslations('winemaker.home')

  return (
    <div className="proof-task-row">
      <input
        type="checkbox"
        aria-label={tHome('completeTaskAria', { title: task.title })}
        disabled={completing === task.id}
        onChange={() => onComplete(task.id)}
        style={{ marginTop: 2, accentColor: 'var(--proof-accent)' }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="proof-task-row__title">{task.title}</p>
        <p className="proof-task-row__meta">{copy.formatTaskTime(task.due_at)}</p>
      </div>
    </div>
  )
}

function PendingTaskRow({
  task,
  onComplete,
  completing,
  copy,
}: {
  task: OwnerTaskRow
  onComplete: (id: string) => void
  completing: string | null
  copy: WinemakerOwnerCopy
}) {
  const tHome = useTranslations('winemaker.home')
  const assignee = task.assigneeName?.trim() || tHome('unassigned')

  return (
    <div className="proof-task-row">
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="proof-task-row__title">{task.title}</p>
        <p className="proof-task-row__meta">{tHome('assignedTo', { name: assignee })}</p>
      </div>
      <button
        type="button"
        disabled={completing === task.id}
        onClick={() => onComplete(task.id)}
        style={{
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 600,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--line)',
          background: 'var(--panel)',
          color: 'var(--fg-0)',
          cursor: completing === task.id ? 'wait' : 'pointer',
        }}
      >
        {completing === task.id ? '…' : tHome('completeTask')}
      </button>
    </div>
  )
}

function TeamMemberRow({ member, copy }: { member: OwnerTeamMember; copy: WinemakerOwnerCopy }) {
  const tHome = useTranslations('winemaker.home')
  const theme = member.profileType ? getProfileTheme(member.profileType) : null
  const name = member.fullName?.trim() || tHome('memberFallback')

  return (
    <div className="proof-task-row">
      <span
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--panel-2)',
          color: 'var(--fg-0)',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {memberInitial(member.fullName, member.userId)}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="proof-task-row__title">{name}</p>
        <p className="proof-task-row__meta">{copy.orgRoleLabel(member.orgRole)}</p>
      </div>
      {theme ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: theme.badge.bg,
            color: theme.badge.color,
            border: `1px solid ${theme.badge.border}`,
            flexShrink: 0,
          }}
        >
          {copy.profileBadgeLabel(member.profileType)}
        </span>
      ) : null}
    </div>
  )
}

export function WinemakerMobileHome() {
  const theme = getProfileTheme('winemaker')
  const supabase = useSupabase()
  const { user } = useAuth()
  const { activeOrg } = useOrganization()
  const { scope } = useProfile()
  const userId = scope?.user_id ?? user?.id
  const copy = useWinemakerOwnerCopy()
  const tCommon = useTranslations('winemaker.common')
  const tHome = useTranslations('winemaker.home')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [lots, setLots] = useState<OwnerLotRow[]>([])
  const [alerts, setAlerts] = useState<AlertaOperativa[]>([])
  const [tasksToday, setTasksToday] = useState<OwnerTaskRow[]>([])
  const [pendingTasks, setPendingTasks] = useState<OwnerTaskRow[]>([])
  const [team, setTeam] = useState<OwnerTeamMember[]>([])
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)

  const displayName = firstName || copy.defaultFirstName

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const [orgId, name] = await Promise.all([
        fetchOwnerOrganizationId(supabase, userId),
        fetchProfileFirstName(supabase, userId),
      ])
      const resolvedOrgId = orgId ?? activeOrg?.id ?? null
      setFirstName(name)
      setOrganizationId(resolvedOrgId)

      if (!resolvedOrgId) {
        setLots([])
        setAlerts([])
        setTasksToday([])
        setPendingTasks([])
        setTeam([])
        return
      }

      const [activeLots, todayTasks, pending, members] = await Promise.all([
        fetchActiveLots(supabase, resolvedOrgId),
        fetchTasksToday(supabase, resolvedOrgId, userId),
        fetchPendingTasks(supabase, resolvedOrgId, userId),
        fetchTeamMembers(supabase, resolvedOrgId),
      ])

      const lotIds = activeLots.map(l => l.id)
      const events = await fetchLotEvents(supabase, resolvedOrgId, lotIds)
      const computedAlerts = copy.mapAlerts(buildOwnerAlertDescriptors(activeLots, events))

      setLots(activeLots)
      setAlerts(computedAlerts)
      setTasksToday(todayTasks)
      setPendingTasks(pending)
      setTeam(members)
    } catch (err) {
      const msg = err instanceof Error ? err.message : tHome('loadError')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, activeOrg?.id, copy, tHome])

  useEffect(() => {
    void load()
  }, [load])

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      setCompletingTaskId(taskId)
      try {
        await completeTask(supabase, taskId)
        setTasksToday(prev => prev.filter(t => t.id !== taskId))
        setPendingTasks(prev => prev.filter(t => t.id !== taskId))
      } catch (err) {
        console.error('[WinemakerMobileHome] complete task', err)
      } finally {
        setCompletingTaskId(null)
      }
    },
    [supabase]
  )

  if (loading) {
    return (
      <div className="proof-mobile-home-shell" style={proofAccentCssVars(theme)}>
        <div
          className="proof-mobile-home-scroll proof-mobile-home-scroll--with-shell-nav"
          style={{ display: 'grid', placeItems: 'center', color: 'var(--fg-3)', fontSize: 14 }}
        >
          {tCommon('loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="proof-mobile-home-shell" style={proofAccentCssVars(theme)}>
      <div className="proof-mobile-home-scroll proof-mobile-home-scroll--with-shell-nav">
        <header className="proof-mobile-home-header proof-mobile-home-header--sticky">
          <span
            className="proof-mobile-profile-badge"
            style={{
              background: 'rgba(105, 64, 165, 0.1)',
              color: '#6940A5',
              border: '1px solid rgba(105, 64, 165, 0.2)',
            }}
          >
            {tHome('badge')}
          </span>
          <h1 className="proof-mobile-home-title" suppressHydrationWarning>
            {copy.greeting()}, {displayName}
          </h1>
          <p className="proof-mobile-home-subtitle" style={{ color: 'var(--fg-3)' }}>
            {copy.attentionCount(alerts.length)}
          </p>
        </header>

        {error ? (
          <div
            style={{
              marginBottom: 12,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--crit-soft)',
              border: '1px solid var(--hairline)',
              fontSize: 13,
              color: 'var(--fg-0)',
            }}
          >
            {error}
          </div>
        ) : null}

        {!organizationId ? (
          <EmptyMessage>{tHome('noOrganization')}</EmptyMessage>
        ) : (
          <>
            <CollapsibleSection
              emoji="🔴"
              title={tHome('sections.attention')}
              defaultOpen
              badge={alerts.length || undefined}
            >
              {alerts.length === 0 ? (
                <EmptyMessage>{tHome('empty.attentionOk')}</EmptyMessage>
              ) : (
                alerts.map(alerta => <AlertCard key={alerta.id} alerta={alerta} fullWidth />)
              )}
            </CollapsibleSection>

            <CollapsibleSection
              emoji="🍷"
              title={tHome('sections.activeLots')}
              defaultOpen={false}
              badge={lots.length || undefined}
            >
              {lots.length === 0 ? (
                <EmptyMessage>{tHome('empty.noActiveLots')}</EmptyMessage>
              ) : (
                lots.map(lot => <LotRow key={lot.id} lot={lot} copy={copy} />)
              )}
            </CollapsibleSection>

            <CollapsibleSection
              emoji="📅"
              title={tHome('sections.calendar')}
              defaultOpen={false}
              badge={tasksToday.length || undefined}
            >
              {tasksToday.length === 0 ? (
                <EmptyMessage>{tHome('empty.noTasksToday')}</EmptyMessage>
              ) : (
                tasksToday.map(task => (
                  <CalendarTaskRow
                    key={task.id}
                    task={task}
                    completing={completingTaskId}
                    onComplete={handleCompleteTask}
                    copy={copy}
                  />
                ))
              )}
            </CollapsibleSection>

            <CollapsibleSection
              emoji="✅"
              title={tHome('sections.pendingTasks')}
              defaultOpen={false}
              badge={pendingTasks.length || undefined}
            >
              {pendingTasks.length === 0 ? (
                <EmptyMessage>{tHome('empty.noPendingTasks')}</EmptyMessage>
              ) : (
                pendingTasks.map(task => (
                  <PendingTaskRow
                    key={task.id}
                    task={task}
                    completing={completingTaskId}
                    onComplete={handleCompleteTask}
                    copy={copy}
                  />
                ))
              )}
            </CollapsibleSection>

            <CollapsibleSection
              emoji="👥"
              title={tHome('sections.team')}
              defaultOpen={false}
              badge={team.length || undefined}
            >
              {team.length === 0 ? (
                <EmptyMessage>{tHome('empty.noTeam')}</EmptyMessage>
              ) : (
                team.map(member => <TeamMemberRow key={member.id} member={member} copy={copy} />)
              )}
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  )
}
