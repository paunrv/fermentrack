'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useOrganization } from '@/context/OrganizationContext'
import {
  fetchTeamAccess,
  fetchTeamInviteStatus,
  fetchTeamMembers,
  inviteTeamMember,
  type TeamMemberRow,
} from '@/app/actions/equipo'
import type { TeamPlatformProfile } from '@/lib/proof/team-access-code'
import { OrgSwitcher } from '@/components/proof/OrgSwitcher'
import { ProFeatureLock } from '@/components/proof/ProFeatureLock'
import { INVITE_PRO_REQUIRED_CODE } from '@/lib/proof/plan-team-invites'

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--fg-0)',
  marginBottom: 6,
}

const input: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1px solid var(--hairline)',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--fg-0)',
  outline: 'none',
  fontFamily: 'var(--font-display)',
}

export default function EquipoPage() {
  const t = useTranslations('dashboard.equipo')
  const tLimits = useTranslations('dashboard.limits')
  const router = useRouter()
  const { activeOrg, loading: orgLoading } = useOrganization()
  const organizationId = activeOrg?.id ?? null

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [canManage, setCanManage] = useState(false)
  const [canInvite, setCanInvite] = useState(true)
  const [inviteProRequired, setInviteProRequired] = useState(false)
  const [inviteLimitCode, setInviteLimitCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [platformProfile, setPlatformProfile] = useState<TeamPlatformProfile>('winemaker')
  const [inviteSuccess, setInviteSuccess] = useState<{
    name: string
    wineryName: string
    accessCode: string
  } | null>(null)

  async function loadMembers() {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    try {
      const access = await fetchTeamAccess(organizationId)
      if (!access.organizationId) {
        router.replace('/dashboard')
        return
      }
      setCanManage(access.canManage)
      if (access.canManage) {
        const inviteStatus = await fetchTeamInviteStatus(organizationId)
        setCanInvite(inviteStatus.canInvite)
        setInviteProRequired(Boolean(inviteStatus.proRequired))
        setInviteLimitCode(inviteStatus.limitReachedCode ?? null)
      } else {
        setCanInvite(false)
        setInviteProRequired(false)
        setInviteLimitCode(null)
      }
      const rows = await fetchTeamMembers(organizationId)
      setMembers(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgLoading) return
    if (!organizationId) {
      router.replace('/dashboard')
      return
    }
    void loadMembers()
  }, [organizationId, orgLoading, router])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!organizationId) return
    setSaving(true)
    setSaveError(null)
    try {
      const invitedName = name.trim()
      const result = await inviteTeamMember({ organizationId, email, name: invitedName, platformProfile })
      setEmail('')
      setName('')
      setPlatformProfile('winemaker')
      setShowForm(false)
      setInviteSuccess({
        name: invitedName,
        wineryName: result.wineryName,
        accessCode: result.accessCode,
      })
      await loadMembers()
    } catch (err) {
      const code = err instanceof Error ? err.message : 'inviteError'
      const msg =
        code === INVITE_PRO_REQUIRED_CODE
          ? t('proRequiredBody')
          : tLimits.has(code as 'limit_reached_usuarios')
            ? tLimits(code as 'limit_reached_usuarios', { limit: 1 })
            : t('inviteError')
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (orgLoading || !organizationId) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>{t('loading')}</div>
    )
  }

  return (
    <div style={{ padding: '20px 16px calc(20px + var(--proof-bottom-nav))', maxWidth: 560, margin: '0 auto', width: '100%', boxSizing: 'border-box', minWidth: 0 }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{t('title')}</h1>
          <OrgSwitcher compact />
        </div>
        <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.5 }}>
          {t('description', { org: activeOrg?.name ?? '' })}
        </p>
      </header>

      {canManage ? (
        <>
          <button
            type="button"
            onClick={() => canInvite && setShowForm(v => !v)}
            disabled={!canInvite}
            style={{
              width: '100%',
              marginBottom: inviteProRequired || inviteLimitCode ? 8 : 20,
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--hairline)',
              background: 'var(--panel)',
              color: canInvite ? 'var(--fg-0)' : 'var(--fg-3)',
              fontSize: 14,
              fontWeight: 600,
              cursor: canInvite ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-display)',
              opacity: canInvite ? 1 : 0.6,
            }}
          >
            {inviteProRequired ? t('invitePro') : t('invite')}
          </button>
          {inviteProRequired ? (
            <ProFeatureLock
              title={t('proRequiredTitle')}
              body={t('proRequiredBody')}
              actionLabel={t('proRequiredAction')}
            />
          ) : null}
          {!canInvite && !inviteProRequired && inviteLimitCode ? (
            <p
              style={{
                margin: '0 0 20px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--hairline)',
                background: 'var(--bg-1)',
                color: 'var(--fg-2)',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {tLimits.has(inviteLimitCode as 'limit_reached_usuarios')
                ? tLimits(inviteLimitCode as 'limit_reached_usuarios', { limit: 1 })
                : t('inviteLimitReached')}{' '}
              {tLimits('upgradeHint')}
            </p>
          ) : null}
        </>
      ) : (
        <p
          style={{
            margin: '0 0 20px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--hairline)',
            background: 'var(--bg-1)',
            color: 'var(--fg-2)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {t('readOnlyHint')}
        </p>
      )}

      {showForm && canManage && canInvite && (
        <form
          onSubmit={handleInvite}
          style={{
            marginBottom: 24,
            padding: 16,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--hairline)',
            background: 'var(--panel)',
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="equipo-email" style={label}>
              {t('email')}
            </label>
            <input
              id="equipo-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={input}
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="equipo-name" style={label}>
              {t('name')}
            </label>
            <input
              id="equipo-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              style={input}
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="equipo-role" style={label}>
              {t('role')}
            </label>
            <select
              id="equipo-role"
              value={platformProfile}
              onChange={e => setPlatformProfile(e.target.value as TeamPlatformProfile)}
              style={input}
            >
              <option value="winemaker">{t('platformRoles.winemaker')}</option>
              <option value="bodega">{t('platformRoles.bodega')}</option>
            </select>
          </div>

          {saveError && (
            <p style={{ margin: '0 0 12px', color: 'var(--red)', fontSize: 13 }}>{saveError}</p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--proof-accent)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? t('submitting') : t('submit')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                color: 'var(--fg-1)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {inviteSuccess ? (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            borderRadius: 'var(--radius-md)',
            border: '1px solid color-mix(in srgb, var(--ok) 35%, var(--hairline))',
            background: 'var(--ok-soft)',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>
            {t('inviteSuccessTitle')}
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            {t('inviteSuccessBody', { name: inviteSuccess.name, winery: inviteSuccess.wineryName })}
          </p>
          <div
            className="proof-equipo-access-code"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--panel)',
              border: '1px solid var(--hairline)',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg-2)' }}>
              {t('accessCodeLabel')}
            </span>
            <span
              className="proof-equipo-access-code__value mono"
              style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--fg-0)' }}
            >
              {inviteSuccess.accessCode}
            </span>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{t('inviteSuccessHint')}</p>
          <button
            type="button"
            onClick={() => setInviteSuccess(null)}
            style={{
              marginTop: 12,
              padding: '8px 12px',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--fg-1)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t('cancel')}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>{t('loadingMembers')}</p>
      ) : error ? (
        <p style={{ color: 'var(--red)', fontSize: 14 }}>{error}</p>
      ) : members.length === 0 ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>{t('empty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {members.map(member => (
            <li
              key={member.id}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--hairline)',
                background: 'var(--panel)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>
                    {member.fullName || member.email || t('noName')}
                  </p>
                  {member.email && (
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--fg-2)' }}>{member.email}</p>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>
                    {member.platformProfile
                      ? t(`platformRoles.${member.platformProfile}` as 'platformRoles.winemaker')
                      : t(`orgRoles.${member.orgRole}` as 'orgRoles.owner')}
                  </p>
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: member.status === 'active' ? 'var(--bg-2)' : 'rgba(159, 225, 203, 0.25)',
                    color: 'var(--fg-1)',
                  }}
                >
                  {t(`status.${member.status}` as 'status.active')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
