'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertCard } from '@/components/proof/AlertCard'
import { CollapsibleSection } from '@/components/proof/CollapsibleSection'
import { PlanLimitHomeAlerts } from '@/components/proof/PlanLimitHomeAlerts'
import {
  CalendarTaskRow,
  PendingTaskRow,
} from '@/components/proof/WinemakerOwnerTaskRows'
import { useWinemakerOwnerHomeData } from '@/hooks/useWinemakerOwnerHomeData'
import {
  useWinemakerOwnerCopy,
  type WinemakerOwnerCopy,
} from '@/hooks/useWinemakerOwnerCopy'
import { getProfileTheme, proofAccentCssVars } from '@/lib/proof/profile-theme'
import { isMcpConfiguredLocally } from '@/lib/mcp/connection-status'
import type { OwnerLotRow, OwnerTeamMember } from '@/lib/supabase/winemaker-owner-home'
import { memberInitial } from '@/lib/supabase/winemaker-owner-home'

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
      onClick={() => router.push(`/dashboard/winemaker/lotes/${lot.id}`)}
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
  const copy = useWinemakerOwnerCopy()
  const tCommon = useTranslations('winemaker.common')
  const tHome = useTranslations('winemaker.home')
  const tHub = useTranslations('connectionHub')

  const {
    loading,
    error,
    displayName,
    organizationId,
    lots,
    alerts,
    tasksToday,
    pendingTasks,
    team,
    completingTaskId,
    taskActionError,
    completeTask,
    planWarnings,
  } = useWinemakerOwnerHomeData()

  const [mcpConfigured, setMcpConfigured] = useState(false)

  useEffect(() => {
    setMcpConfigured(isMcpConfiguredLocally())
  }, [])

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

        <PlanLimitHomeAlerts warnings={planWarnings} />

        {taskActionError ? (
          <p role="alert" style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--crit)' }}>
            {taskActionError}
          </p>
        ) : null}

        <Link
          href="/dashboard/conectar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 12,
            border: mcpConfigured
              ? '0.5px solid color-mix(in srgb, var(--ok) 35%, var(--hairline))'
              : '0.5px solid var(--hairline)',
            background: mcpConfigured ? 'var(--ok-soft)' : 'var(--panel)',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
            {mcpConfigured ? tHub('ownerCta.connectedTitle') : tHub('ownerCta.title')}
          </span>
          <span style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.45 }}>
            {mcpConfigured ? tHub('ownerCta.connectedHint') : tHub('ownerCta.hint')}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: mcpConfigured ? 'var(--ok)' : '#6940A5',
              marginTop: 4,
            }}
          >
            {mcpConfigured ? tHub('ownerCta.connectedAction') : tHub('ownerCta.action')} →
          </span>
        </Link>

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
                    onComplete={completeTask}
                    completing={completingTaskId}
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
                    onComplete={completeTask}
                    completing={completingTaskId}
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
