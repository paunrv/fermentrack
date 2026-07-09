'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  Badge,
  Container,
  ContentCard,
  Inline,
  PageFrame,
  PageHeader,
  Spinner,
  Stack,
} from '@fermentrack/ui'
import type { AppLocale } from '@/i18n/routing'
import { useWinemakerOwnerCopy } from '@/hooks/useWinemakerOwnerCopy'
import { useWinemakerOwnerHomeData } from '@/hooks/useWinemakerOwnerHomeData'
import { isMcpConfiguredLocally } from '@/lib/mcp/connection-status'
import { DesktopHomeBottomRow } from '@/components/proof/DesktopHomeBottomRow'
import { AgentPromptDock } from '@/components/proof/AgentPromptDock'
import { PlanLimitHomeAlerts } from '@/components/proof/PlanLimitHomeAlerts'
import { PipelineBodega } from '@/components/proof/PipelineBodega'
import { useMcpAgentStatus } from '@/hooks/useMcpAgentStatus'
import { getProfileTheme, proofAccentCssVars } from '@/lib/proof/profile-theme'

function formatHeaderDate(locale: AppLocale, date = new Date()): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function HealthPill({ attentionLotCount }: { attentionLotCount: number }) {
  const t = useTranslations('winemaker.home.desktop')

  if (attentionLotCount === 0) {
    return <Badge variant="success">{t('healthOk')}</Badge>
  }

  return (
    <Badge variant={attentionLotCount >= 3 ? 'error' : 'warning'}>
      {t('healthAttention', { count: attentionLotCount })}
    </Badge>
  )
}

function AgentStatusPill({ connected }: { connected: boolean }) {
  const t = useTranslations('winemaker.home.desktop')

  if (!connected) return null

  return <Badge variant="success">{t('agentConnected')}</Badge>
}

export function WinemakerDesktopHome() {
  const theme = getProfileTheme('winemaker')
  const locale = useLocale() as AppLocale
  const copy = useWinemakerOwnerCopy()
  const tCommon = useTranslations('winemaker.common')
  const tHome = useTranslations('winemaker.home')
  const tDesktop = useTranslations('winemaker.home.desktop')
  const tHub = useTranslations('connectionHub')

  const {
    loading,
    error,
    displayName,
    organizationId,
    pipelineLots,
    attentionLotCount,
    pendingTasks,
    tasksToday,
    completingTaskId,
    completeTask,
    planWarnings,
  } = useWinemakerOwnerHomeData()

  const [mcpConfigured, setMcpConfigured] = useState(false)
  const { data: agentStatus, loading: agentLoading } = useMcpAgentStatus(
    Boolean(organizationId),
    'winemaker'
  )

  useEffect(() => {
    const sync = () => setMcpConfigured(isMcpConfiguredLocally())
    sync()
    window.addEventListener('focus', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('focus', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const headerDate = useMemo(() => formatHeaderDate(locale), [locale])

  if (loading) {
    return (
      <PageFrame
        style={{
          ...proofAccentCssVars(theme),
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Spinner />
          <span style={{ fontSize: 14, color: 'var(--fg-3)' }}>{tCommon('loading')}</span>
        </div>
      </PageFrame>
    )
  }

  return (
    <PageFrame
      style={{
        ...proofAccentCssVars(theme),
        overflow: 'auto',
      }}
    >
      <Container size="xl" style={{ paddingInline: 0, width: '100%', maxWidth: '100%' }}>
        <Stack gap={6}>
          <PageHeader
            title={
              <span suppressHydrationWarning>
                {copy.greeting()}, {displayName}
              </span>
            }
            description={headerDate}
            actions={
              <Inline gap={2} style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <HealthPill attentionLotCount={attentionLotCount} />
                <AgentStatusPill connected={mcpConfigured} />
                {!mcpConfigured ? (
                  <Link
                    href="/dashboard/conectar"
                    className="ui-btn ui-btn--primary ui-btn--sm"
                    style={{ textDecoration: 'none' }}
                  >
                    {tDesktop('connectAgent')}
                  </Link>
                ) : null}
              </Inline>
            }
          />

          {!mcpConfigured ? (
            <ContentCard>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>
                {tHub('ownerCta.title')}
              </span>
              <span style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.45 }}>
                {tHub('ownerCta.hint')}
              </span>
              <Link
                href="/dashboard/conectar"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--proof-accent)',
                  textDecoration: 'none',
                  alignSelf: 'flex-start',
                }}
              >
                {tHub('ownerCta.action')} →
              </Link>
            </ContentCard>
          ) : null}

          <AgentPromptDock profileType="winemaker" accent={theme.accent} mcpConfigured={mcpConfigured} />

          <PlanLimitHomeAlerts warnings={planWarnings} />

          {error ? (
            <ContentCard
              role="alert"
              style={{
                background: 'var(--crit-soft)',
                fontSize: 13,
                color: 'var(--fg-0)',
              }}
            >
              {error}
            </ContentCard>
          ) : null}

          {!organizationId ? (
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-3)' }}>{tHome('noOrganization')}</p>
          ) : (
            <>
              <ContentCard>
                <div>
                  <h2
                    style={{
                      margin: '0 0 4px',
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'var(--fg-0)',
                    }}
                  >
                    {tDesktop('pipelineTitle')}
                  </h2>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--fg-3)' }}>
                    {tDesktop('pipelineHint', { count: pipelineLots.length })}
                  </p>
                  <PipelineBodega lots={pipelineLots} etapaLabel={copy.etapaLabel} />
                </div>
              </ContentCard>

              <DesktopHomeBottomRow
                pendingTasks={pendingTasks}
                tasksToday={tasksToday}
                completingTaskId={completingTaskId}
                onCompleteTask={completeTask}
                copy={copy}
                mcpConfigured={mcpConfigured}
                agentStatus={agentStatus}
                agentLoading={agentLoading}
              />
            </>
          )}
        </Stack>
      </Container>
    </PageFrame>
  )
}
