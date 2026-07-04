'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { DashboardRailModel, RailGroup } from '@/lib/proof/dashboard-rail'
import { railIcon } from '@/lib/proof/dashboard-rail-icons'
import {
  dashboardRailWidthPx,
  isDashboardNavItemActive,
} from '@/lib/proof/dashboard-shell'

function RailSeparator() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        margin: '6px 4px',
        background: 'var(--hairline)',
        flexShrink: 0,
      }}
    />
  )
}

function SideRailLink({
  href,
  label,
  icon,
  active,
  accent,
  expanded,
}: {
  href: string
  label: string
  icon: ReactNode
  active: boolean
  accent: string
  expanded: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      {...(!expanded ? { 'data-tooltip': label } : {})}
      className="proof-dashboard-rail-link"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: expanded ? 'flex-start' : 'center',
        gap: expanded ? 10 : 0,
        width: '100%',
        height: 36,
        padding: expanded ? '0 10px' : 0,
        textDecoration: 'none',
        color: active ? 'var(--fg-0)' : 'var(--fg-3)',
        background: active ? 'var(--hover)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out)',
      }}
      onMouseEnter={e => {
        if (active) return
        e.currentTarget.style.background = 'var(--hover)'
        e.currentTarget.style.color = 'var(--fg-0)'
      }}
      onMouseLeave={e => {
        if (active) return
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--fg-3)'
      }}
    >
      {active && (
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
      )}
      <span style={{ display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</span>
      {expanded ? (
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {label}
        </span>
      ) : null}
    </Link>
  )
}

function RailGroupSection({
  group,
  path,
  accent,
  t,
  chatSlot,
  showChatAfterFirstItem,
  expanded,
}: {
  group: RailGroup
  path: string
  accent: string
  t: (key: string) => string
  chatSlot?: ReactNode
  showChatAfterFirstItem?: boolean
  expanded: boolean
}) {
  if (group.items.length === 0 && !chatSlot) return null

  return (
    <div
      role="group"
      aria-label={t(group.labelKey)}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}
    >
      {group.items.map((item, index) => (
        <div key={item.href}>
          <SideRailLink
            href={item.href}
            label={t(item.labelKey)}
            icon={railIcon(item.icon)}
            active={isDashboardNavItemActive(path, item.href)}
            accent={accent}
            expanded={expanded}
          />
          {showChatAfterFirstItem && index === 0 && chatSlot ? (
            <div style={{ marginTop: 6 }}>{chatSlot}</div>
          ) : null}
        </div>
      ))}
      {!showChatAfterFirstItem && chatSlot ? <div>{chatSlot}</div> : null}
    </div>
  )
}

function RailExpandToggle({
  expanded,
  onToggle,
  label,
}: {
  expanded: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      {...(!expanded ? { 'data-tooltip': label } : {})}
      className="proof-dashboard-rail-link"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: expanded ? 'flex-start' : 'center',
        gap: expanded ? 10 : 0,
        width: '100%',
        height: 36,
        padding: expanded ? '0 10px' : 0,
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        background: 'transparent',
        color: 'var(--fg-3)',
        cursor: 'pointer',
      }}
    >
      <span aria-hidden style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
        {expanded ? '‹' : '›'}
      </span>
      {expanded ? (
        <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
      ) : null}
    </button>
  )
}

export function DashboardRail({
  path,
  model,
  accent,
  t,
  chatSlot,
  expanded,
  onToggleExpanded,
}: {
  path: string
  model: DashboardRailModel
  accent: string
  t: (key: string) => string
  chatSlot?: ReactNode
  expanded: boolean
  onToggleExpanded: () => void
}) {
  const equipoGroup = model.mainGroups.find(group => group.id === 'equipo')
  const otherGroups = model.mainGroups.filter(group => group.id !== 'equipo')
  const railWidth = dashboardRailWidthPx(expanded)

  return (
    <aside
      className={expanded ? 'proof-dashboard-rail proof-dashboard-rail--expanded' : 'proof-dashboard-rail'}
      style={{
        width: railWidth,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: expanded ? 'stretch' : 'center',
        background: 'var(--canvas)',
        borderRight: '1px solid var(--hairline)',
        padding: '14px 0 12px',
        zIndex: 20,
        transition: 'width 200ms var(--ease-out)',
        overflow: 'hidden',
      }}
    >
      <Link
        href="/dashboard"
        aria-label={t('shell.homeAria')}
        style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          gap: expanded ? 10 : 0,
          marginBottom: 14,
          width: expanded ? '100%' : 36,
          height: 36,
          padding: expanded ? '0 12px' : 0,
          flexShrink: 0,
        }}
      >
        {expanded ? (
          <span
            className="mono"
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--fg-0)',
            }}
          >
            PROOF
          </span>
        ) : (
          <span
            aria-hidden
            className="mono"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              lineHeight: 1.15,
              textAlign: 'center',
              color: 'var(--fg-0)',
            }}
          >
            PR
            <br />
            OF
          </span>
        )}
      </Link>

      <nav
        aria-label={t('shell.railNav')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          width: '100%',
          padding: expanded ? '0 8px' : '0 8px',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
      >
        {otherGroups.map((group, index) => (
          <div key={group.id}>
            {index > 0 ? <RailSeparator /> : null}
            <RailGroupSection
              group={group}
              path={path}
              accent={accent}
              t={t}
              expanded={expanded}
            />
          </div>
        ))}

        {equipoGroup && (equipoGroup.items.length > 0 || chatSlot) ? (
          <>
            {otherGroups.length > 0 ? <RailSeparator /> : null}
            <RailGroupSection
              group={equipoGroup}
              path={path}
              accent={accent}
              t={t}
              chatSlot={model.showChatToggle ? chatSlot : undefined}
              expanded={expanded}
            />
          </>
        ) : model.showChatToggle && chatSlot ? (
          <>
            {otherGroups.length > 0 ? <RailSeparator /> : null}
            <div style={{ width: '100%' }}>{chatSlot}</div>
          </>
        ) : null}
      </nav>

      <div style={{ marginTop: 'auto', width: '100%', padding: '0 8px' }}>
        <RailSeparator />
        <RailGroupSection
          group={model.configGroup}
          path={path}
          accent={accent}
          t={t}
          expanded={expanded}
        />
        <div style={{ marginTop: 6 }}>
          <RailExpandToggle
            expanded={expanded}
            onToggle={onToggleExpanded}
            label={expanded ? t('shell.railCollapse') : t('shell.railExpand')}
          />
        </div>
      </div>
    </aside>
  )
}
