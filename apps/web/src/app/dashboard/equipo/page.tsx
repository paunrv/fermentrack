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
  removeTeamMember,
  updateTeamAccessCode,
  type TeamMemberRow,
} from '@/app/actions/equipo'
import type { TeamPlatformProfile } from '@/lib/proof/team-access-code'
import { OrgSwitcher } from '@/components/proof/OrgSwitcher'
import { ProFeatureLock } from '@/components/proof/ProFeatureLock'
import { INVITE_PRO_REQUIRED_CODE } from '@/lib/proof/plan-team-invites'
import { errorMessageFromUnknown } from '@/lib/errors/unknown'

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

const codeBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-1)',
  color: 'var(--fg-0)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
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
    emailSent: boolean
    inviteLink: string | null
  } | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [updatingCodeMemberId, setUpdatingCodeMemberId] = useState<string | null>(null)
  const [customCodes, setCustomCodes] = useState<Record<string, string>>({})
  const [codeNotice, setCodeNotice] = useState<string | null>(null)

  function inviteErrorMessage(err: unknown): string {
    const code = errorMessageFromUnknown(err)
    if (code === INVITE_PRO_REQUIRED_CODE) return t('proRequiredBody')
    if (code === 'limit_reached_usuarios') {
      try {
        return tLimits('limit_reached_usuarios', { limit: 1 })
      } catch {
        return t('inviteError')
      }
    }
    if (code.toLowerCase().includes('rate limit')) return t('inviteRateLimit')
    if (code.toLowerCase().includes('already') || code.toLowerCase().includes('registered')) {
      return t('inviteEmailExists')
    }
    return code || t('inviteError')
  }

  function memberStatusLabel(status: string): string {
    const key = `status.${status}` as 'status.active' | 'status.invited' | 'status.suspended'
    try {
      return t.has(key) ? t(key) : status
    } catch {
      return status
    }
  }

  function memberRoleLabel(member: TeamMemberRow): string {
    if (member.platformProfile) {
      const key = `platformRoles.${member.platformProfile}` as
        | 'platformRoles.winemaker'
        | 'platformRoles.bodega'
      try {
        return t.has(key) ? t(key) : member.platformProfile
      } catch {
        return member.platformProfile
      }
    }
    const key = `orgRoles.${member.orgRole}` as 'orgRoles.owner'
    try {
      return t.has(key) ? t(key) : member.orgRole
    } catch {
      return member.orgRole
    }
  }

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
      setError(errorMessageFromUnknown(err) || t('loadError'))
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
      const result = await inviteTeamMember({
        organizationId,
        email,
        name: invitedName,
        platformProfile,
        siteOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
      })
      if (!result?.accessCode) throw new Error('invite_failed')

      setEmail('')
      setName('')
      setPlatformProfile('winemaker')
      setShowForm(false)
      setInviteSuccess({
        name: invitedName,
        wineryName: result.wineryName || activeOrg?.name || '',
        accessCode: result.accessCode,
        emailSent: result.emailSent,
        inviteLink: result.inviteLink,
      })
      void loadMembers().catch(err => {
        setError(errorMessageFromUnknown(err) || t('loadError'))
      })
    } catch (err) {
      setSaveError(inviteErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(member: TeamMemberRow) {
    if (!organizationId || member.orgRole === 'owner') return
    const label = member.fullName || member.email || t('noName')
    if (!window.confirm(t('removeConfirm', { name: label }))) return

    setRemovingMemberId(member.id)
    setError(null)
    try {
      await removeTeamMember({ organizationId, memberId: member.id })
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (err) {
      setError(errorMessageFromUnknown(err) || t('removeError'))
    } finally {
      setRemovingMemberId(null)
    }
  }

  async function handleRegenerateCode(member: TeamMemberRow) {
    if (!organizationId) return
    setUpdatingCodeMemberId(member.id)
    setCodeNotice(null)
    try {
      const result = await updateTeamAccessCode({ organizationId, memberId: member.id })
      setMembers(prev =>
        prev.map(m => (m.id === member.id ? { ...m, accessCode: result.accessCode } : m))
      )
      setCodeNotice(t('codeRegenerated', { name: member.fullName || member.email || t('noName') }))
    } catch (err) {
      setError(errorMessageFromUnknown(err) || t('codeUpdateError'))
    } finally {
      setUpdatingCodeMemberId(null)
    }
  }

  async function handleSaveCustomCode(member: TeamMemberRow) {
    if (!organizationId) return
    const code = (customCodes[member.id] ?? '').replace(/\D/g, '').slice(0, 4)
    if (code.length !== 4) {
      setCodeNotice(t('codeInvalid'))
      return
    }
    setUpdatingCodeMemberId(member.id)
    setCodeNotice(null)
    try {
      const result = await updateTeamAccessCode({ organizationId, memberId: member.id, code })
      setMembers(prev =>
        prev.map(m => (m.id === member.id ? { ...m, accessCode: result.accessCode } : m))
      )
      setCustomCodes(prev => ({ ...prev, [member.id]: '' }))
      setCodeNotice(t('codeSaved'))
    } catch (err) {
      setError(errorMessageFromUnknown(err) || t('codeUpdateError'))
    } finally {
      setUpdatingCodeMemberId(null)
    }
  }

  async function copyText(text: string, notice: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCodeNotice(notice)
    } catch {
      setCodeNotice(t('copyFailed'))
    }
  }

  function shareMessage(member: TeamMemberRow, code: string): string {
    return t('shareMessage', {
      name: member.fullName || member.email || t('noName'),
      winery: activeOrg?.name ?? '—',
      code,
      url: typeof window !== 'undefined' ? window.location.origin : '',
    })
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
        <div
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--hairline)',
            background: 'var(--bg-1)',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--fg-2)',
          }}
        >
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--fg-0)' }}>{t('rolesHelpTitle')}</p>
          <p style={{ margin: 0 }}>{t('rolesHelpBody')}</p>
          {typeof window !== 'undefined' ? (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
              {t('mobileHint', { url: window.location.origin })}
            </p>
          ) : null}
        </div>
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
              {inviteLimitCode === 'limit_reached_usuarios'
                ? tLimits('limit_reached_usuarios', { limit: 1 })
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
            {inviteSuccess.emailSent ? t('inviteSuccessTitle') : t('inviteManualTitle')}
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            {inviteSuccess.emailSent
              ? t('inviteSuccessBody', {
                  name: inviteSuccess.name,
                  winery: inviteSuccess.wineryName || activeOrg?.name || '—',
                })
              : t('inviteManualBody', {
                  name: inviteSuccess.name,
                  winery: inviteSuccess.wineryName || activeOrg?.name || '—',
                })}
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
          {inviteSuccess.inviteLink ? (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--fg-1)' }}>
                {t('inviteLinkLabel')}
              </p>
              <a
                href={inviteSuccess.inviteLink}
                style={{
                  display: 'block',
                  fontSize: 12,
                  wordBreak: 'break-all',
                  color: 'var(--proof-accent)',
                }}
              >
                {inviteSuccess.inviteLink}
              </a>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{t('inviteLinkHint')}</p>
            </div>
          ) : null}
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
        <>
          {codeNotice ? (
            <p
              style={{
                margin: '0 0 12px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--ok-soft)',
                border: '1px solid color-mix(in srgb, var(--ok) 35%, var(--hairline))',
                fontSize: 13,
                color: 'var(--fg-1)',
              }}
            >
              {codeNotice}
            </p>
          ) : null}
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
                    {memberRoleLabel(member)}
                  </p>
                  {canManage && member.status === 'invited' ? (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: '1px solid var(--hairline)',
                      }}
                    >
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-2)' }}>
                        {t('inviteCodeSection')}
                      </p>
                      {member.accessCode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                          <span className="mono" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.2em' }}>
                            {member.accessCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => void copyText(member.accessCode!, t('codeCopied'))}
                            style={codeBtnStyle}
                          >
                            {t('copyCode')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void copyText(shareMessage(member, member.accessCode!), t('shareCopied'))
                            }
                            style={codeBtnStyle}
                          >
                            {t('copyShare')}
                          </button>
                        </div>
                      ) : (
                        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--fg-2)' }}>{t('codeMissing')}</p>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder={t('customCodePlaceholder')}
                          value={customCodes[member.id] ?? ''}
                          onChange={e =>
                            setCustomCodes(prev => ({
                              ...prev,
                              [member.id]: e.target.value.replace(/\D/g, '').slice(0, 4),
                            }))
                          }
                          style={{ ...input, width: 88, flex: '0 0 auto' }}
                        />
                        <button
                          type="button"
                          disabled={updatingCodeMemberId === member.id}
                          onClick={() => void handleSaveCustomCode(member)}
                          style={codeBtnStyle}
                        >
                          {t('saveCode')}
                        </button>
                        <button
                          type="button"
                          disabled={updatingCodeMemberId === member.id}
                          onClick={() => void handleRegenerateCode(member)}
                          style={codeBtnStyle}
                        >
                          {updatingCodeMemberId === member.id ? t('codeUpdating') : t('regenerateCode')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: member.status === 'active' ? 'var(--bg-2)' : 'rgba(159, 225, 203, 0.25)',
                      color: 'var(--fg-1)',
                    }}
                  >
                    {memberStatusLabel(member.status)}
                  </span>
                  {canManage && member.orgRole !== 'owner' ? (
                    <button
                      type="button"
                      onClick={() => void handleRemoveMember(member)}
                      disabled={removingMemberId === member.id}
                      style={{
                        padding: '4px 10px',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: 'var(--red)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: removingMemberId === member.id ? 'wait' : 'pointer',
                        opacity: removingMemberId === member.id ? 0.6 : 1,
                      }}
                    >
                      {removingMemberId === member.id ? t('removing') : t('remove')}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  )
}
