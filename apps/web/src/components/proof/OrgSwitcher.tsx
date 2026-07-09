'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useOrganization } from '@/context/OrganizationContext'

export function OrgSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('dashboard.orgSwitcher')
  const router = useRouter()
  const { allOrganizations, activeOrg, membership, switchOrganization } = useOrganization()

  if (allOrganizations.length <= 1 || !activeOrg) return null

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextId = e.target.value
    if (!nextId || nextId === activeOrg?.id) return
    switchOrganization(nextId)
    router.refresh()
  }

  const roleKey = membership?.role
  const roleLabel =
    roleKey === 'owner' || roleKey === 'admin' || roleKey === 'member' || roleKey === 'viewer'
      ? t(`roles.${roleKey}`)
      : roleKey

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 6 : 8,
        minWidth: 0,
      }}
    >
      {!compact && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
            flexShrink: 0,
          }}
        >
          {t('label')}
        </span>
      )}
      <select
        value={activeOrg.id}
        onChange={handleChange}
        aria-label={t('aria')}
        style={{
          maxWidth: compact ? 140 : 220,
          padding: compact ? '4px 8px' : '6px 10px',
          borderRadius: 8,
          border: '0.5px solid var(--hairline)',
          background: 'var(--panel, var(--surface-card))',
          color: 'var(--fg-0)',
          fontSize: compact ? 12 : 13,
          fontWeight: 500,
          fontFamily: 'var(--font-display)',
          cursor: 'pointer',
        }}
      >
        {allOrganizations.map(m => (
          <option key={m.organizationId} value={m.organizationId}>
            {m.organization.name}
          </option>
        ))}
      </select>
      {membership && !compact && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--fg-3)',
            flexShrink: 0,
          }}
        >
          {roleLabel}
        </span>
      )}
    </label>
  )
}
