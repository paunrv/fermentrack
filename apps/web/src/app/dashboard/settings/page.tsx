'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button, FormField, Input } from '@fermentrack/ui'
import { useAuth } from '@/hooks/useAuth'
import { getUserEmail, getUserFirstName } from '@/lib/auth/user'
import { useProfile } from '@/context/ProfileContext'
import { useOrganization } from '@/context/OrganizationContext'
import { useSupabase } from '@/hooks/useSupabase'
import { useIntlLocaleTag } from '@/lib/i18n/locale'
import {
  fetchOrganizationSettings,
  updateOrganizationName,
  type OrganizationSettings,
} from '@/app/actions/organization'
import { OrgSwitcher } from '@/components/proof/OrgSwitcher'
import { SettingsLanguageSection } from '@/components/proof/SettingsLanguageSection'
import { WINEMAKER_PLAN_LIMITS } from '@/lib/billing/winemaker-plans'
import {
  upsertProfile,
  deleteProfile,
  SUPER_USER_EMAIL,
  type ExtraProfile,
  type Profile,
} from '@/lib/supabase'



const PROFILE_META: Record<
  ExtraProfile,
  { emoji: string; color: string }
> = {
  brewer: { emoji: '🍺', color: '#FAC775' },
  winemaker: { emoji: '🍷', color: '#9FE1CB' },
  distiller: { emoji: '🥃', color: '#F5C4B3' },
  distributor: { emoji: '📦', color: '#B5D4F4' },
  bodega: {
    emoji: '📦',
    color: '#2F5F8F',
  },
}

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

export default function SettingsPage() {
  const t = useTranslations('dashboard.settings')
  const localeTag = useIntlLocaleTag()
  const { user, isLoaded } = useAuth()
  const router = useRouter()
  const { allProfiles, activeProfile, reload, loading } = useProfile()
  const { activeOrg, reload: reloadOrganizations } = useOrganization()
  const supabase = useSupabase()

  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [deletingType, setDeletingType] = useState<ExtraProfile | null>(null)

  const [username, setUsername] = useState('')
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [cuentaDeposito, setCuentaDeposito] = useState('')
  const [bancoDeposito, setBancoDeposito] = useState('')
  const [titularCuenta, setTitularCuenta] = useState('')

  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgSaving, setOrgSaving] = useState(false)
  const [orgSavedAt, setOrgSavedAt] = useState<Date | null>(null)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [billingNotice, setBillingNotice] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const email = getUserEmail(user)
  const isSuperEmail = email.toLowerCase() === SUPER_USER_EMAIL.toLowerCase()

  function profileTypeLabel(type: ExtraProfile): string {
    return t(`profileTypes.${type}`)
  }

  useEffect(() => {
    if (!activeProfile) {
      setUsername(getUserFirstName(user))
      setIsSuperUser(isSuperEmail)
      return
    }
    setUsername(activeProfile.username || '')
    setIsSuperUser(activeProfile.is_super_user || isSuperEmail)
    setCuentaDeposito(activeProfile.cuenta_deposito ?? '')
    setBancoDeposito(activeProfile.banco_deposito ?? '')
    setTitularCuenta(activeProfile.titular_cuenta ?? '')
  }, [activeProfile, user, isSuperEmail])

  useEffect(() => {
    if (!activeOrg?.id) {
      setOrgSettings(null)
      return
    }
    let cancelled = false
    fetchOrganizationSettings(activeOrg.id)
      .then(data => {
        if (cancelled) return
        setOrgSettings(data)
        setOrgName(data?.name ?? activeOrg.name)
      })
      .catch(err => {
        if (!cancelled) {
          setOrgError(err instanceof Error ? err.message : t('org.loadError'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeOrg?.id, activeOrg?.name])

  useEffect(() => {
    const billing = searchParams.get('billing')
    if (billing === 'success') {
      setBillingNotice(t('billing.success'))
      void reloadOrganizations({ silent: true })
      if (activeOrg?.id) {
        fetchOrganizationSettings(activeOrg.id).then(setOrgSettings).catch(() => {})
      }
      router.replace('/dashboard/settings', { scroll: false })
    } else if (billing === 'canceled') {
      setBillingNotice(t('billing.canceled'))
      router.replace('/dashboard/settings', { scroll: false })
    }
  }, [searchParams, router, reloadOrganizations, activeOrg?.id])

  async function startCheckout() {
    if (!activeOrg?.id) return
    setBillingLoading(true)
    setBillingError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: activeOrg.id }),
      })
      const body = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !body.url) throw new Error(body.error || t('billing.checkoutError'))
      window.location.href = body.url
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : t('billing.genericError'))
      setBillingLoading(false)
    }
  }

  async function openBillingPortal() {
    if (!activeOrg?.id) return
    setBillingLoading(true)
    setBillingError(null)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: activeOrg.id }),
      })
      const body = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !body.url) throw new Error(body.error || t('billing.portalError'))
      window.location.href = body.url
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : t('billing.genericError'))
      setBillingLoading(false)
    }
  }

  async function handleOrgSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeOrg?.id || !orgSettings?.canManage) return
    setOrgSaving(true)
    setOrgError(null)
    try {
      await updateOrganizationName({ organizationId: activeOrg.id, name: orgName })
      await reloadOrganizations({ silent: true })
      setOrgSavedAt(new Date())
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : t('org.saveError'))
    } finally {
      setOrgSaving(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !activeProfile) return

    setSaving(true)
    try {
      await upsertProfile(supabase, {
        user_id: user.id,
        profile_type_v2: activeProfile.profile_type_v2,
        profile_type: activeProfile.profile_type,
        username: username.trim() || getUserFirstName(user) || 'Productor',
        is_super_user: isSuperUser,
        extra_profiles: activeProfile.extra_profiles || [],
        email,
        onboarding_complete: activeProfile.onboarding_complete,
        cuenta_deposito: cuentaDeposito.trim() || null,
        banco_deposito: bancoDeposito.trim() || null,
        titular_cuenta: titularCuenta.trim() || null,
        constancia_fiscal_path: activeProfile.constancia_fiscal_path ?? null,
      })
      await reload()
      setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(profile: Profile) {
    if (!user) return
    if (profile.profile_type_v2 === activeProfile?.profile_type_v2) {
      alert(t('profiles.cannotDeleteActive'))
      return
    }
    const typeLabel = profileTypeLabel(profile.profile_type_v2)
    if (!confirm(t('profiles.deleteConfirm', { label: typeLabel }))) {
      return
    }
    setDeletingType(profile.profile_type_v2)
    try {
      await deleteProfile(supabase, user.id, profile.profile_type_v2)
      await reload()
    } finally {
      setDeletingType(null)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div style={{ fontFamily: 'var(--font-display)', padding: 32 }}>
        <p style={{ fontSize: 13, color: '#888' }}>{t('loading')}</p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'var(--font-display)', background: '#fff', minHeight: '100vh', padding: 32 }}>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-.04em',
              color: 'var(--fg-0)',
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            {t('title')}
          </h1>
          <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
            {t('subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {activeOrg && <OrgSwitcher />}
          <button
          type="button"
          onClick={() => router.push('/profile-select')}
          style={{
            padding: '12px 20px',
            background: '#fff',
            color: 'var(--fg-0)',
            border: '1px solid var(--hairline)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
          }}
        >
          {t('switchProfile')}
        </button>
        </div>
      </div>

      <SettingsLanguageSection />

      {activeOrg && orgSettings && (
        <section
          style={{
            border: '1px solid var(--hairline)',
            padding: 24,
            marginBottom: 24,
            background: '#fff',
            maxWidth: 800,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {t('org.title')}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#888',
              fontWeight: 500,
              marginBottom: 20,
              lineHeight: 1.45,
            }}
          >
            {t('org.description')}
          </div>

          <form onSubmit={handleOrgSave} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>{t('org.name')}</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  readOnly={!orgSettings.canManage}
                  style={{
                    ...input,
                    ...(!orgSettings.canManage
                      ? { background: '#f4f4f4', color: '#666', cursor: 'not-allowed' }
                      : {}),
                  }}
                  required
                />
              </div>
              <div>
                <label style={label}>{t('org.slug')}</label>
                <input
                  type="text"
                  value={orgSettings.slug}
                  readOnly
                  style={{
                    ...input,
                    background: '#f4f4f4',
                    color: '#666',
                    cursor: 'not-allowed',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                />
              </div>
              <div>
                <label style={label}>{t('org.plan')}</label>
                <input
                  type="text"
                  value={t(`plans.${orgSettings.plan}` as 'plans.free')}
                  readOnly
                  style={{
                    ...input,
                    background: '#f4f4f4',
                    color: '#666',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
              <div>
                <label style={label}>{t('org.planStatus')}</label>
                <input
                  type="text"
                  value={t(`planStatus.${orgSettings.plan_status}` as 'planStatus.active')}
                  readOnly
                  style={{
                    ...input,
                    background: '#f4f4f4',
                    color: '#666',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
            </div>

            {orgError && (
              <p style={{ margin: 0, color: 'var(--red)', fontSize: 13 }}>{orgError}</p>
            )}

            {orgSettings.canManage ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Button type="submit" loading={orgSaving}>
                  {orgSaving ? t('org.saving') : t('org.save')}
                </Button>
                {orgSavedAt && !orgSaving && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#888' }}>
                    {t('org.saved')}{' '}
                    {orgSavedAt.toLocaleTimeString(localeTag, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
                {t('org.readOnlyHint')}
              </p>
            )}
          </form>
        </section>
      )}

      {activeOrg && orgSettings?.isOwner && (
        <section
          style={{
            border: '1px solid var(--hairline)',
            padding: 24,
            marginBottom: 24,
            background: '#fff',
            maxWidth: 800,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {t('billing.title')} · {activeOrg.name}
          </div>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 12,
              color: '#888',
              lineHeight: 1.5,
            }}
          >
            {t('billing.currentPlan')}{' '}
            <strong>{t(`plans.${orgSettings.plan}` as 'plans.free')}</strong>
            {' · '}
            {t(`planStatus.${orgSettings.plan_status}` as 'planStatus.active')}
          </p>
          <ul
            style={{
              margin: '0 0 20px',
              paddingLeft: 18,
              fontSize: 12,
              color: '#666',
              lineHeight: 1.6,
            }}
          >
            <li>
              {t('billing.freeLimits', {
                lots: WINEMAKER_PLAN_LIMITS.free.maxLots,
                docs: WINEMAKER_PLAN_LIMITS.free.maxDocumentsPerMonth,
              })}
            </li>
            <li>{t('billing.proLimits')}</li>
          </ul>

          {billingNotice && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-1)' }}>{billingNotice}</p>
          )}
          {billingError && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--red)' }}>{billingError}</p>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(orgSettings.plan === 'free' || orgSettings.plan_status === 'canceled') && (
              <Button type="button" loading={billingLoading} onClick={() => void startCheckout()}>
                {t('billing.upgrade')}
              </Button>
            )}
            {orgSettings.hasStripeCustomer &&
              orgSettings.plan !== 'free' &&
              orgSettings.plan_status !== 'canceled' && (
                <button
                  type="button"
                  disabled={billingLoading}
                  onClick={() => void openBillingPortal()}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid var(--hairline)',
                    background: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: billingLoading ? 'wait' : 'pointer',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {t('billing.manage')}
                </button>
              )}
          </div>
        </section>
      )}

      <section
        style={{
          border: '1px solid var(--hairline)',
          padding: 24,
          marginBottom: 24,
          background: '#fff',
          maxWidth: 800,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
            {t('profiles.count', { count: allProfiles.length })}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#888',
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {t('profiles.legacyNote')}
          </div>

        {allProfiles.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>
            {t('profiles.empty')}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {allProfiles.map(p => {
              const meta = PROFILE_META[p.profile_type_v2]
              const isActive = p.profile_type_v2 === activeProfile?.profile_type_v2
              const isDeleting = deletingType === p.profile_type_v2
              return (
                <div
                  key={p.profile_type_v2}
                  style={{
                    border: '1px solid var(--hairline)',
                    background: meta.color,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 28, lineHeight: 1 }}>{meta.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          letterSpacing: '.05em',
                          textTransform: 'uppercase',
                          color: 'var(--fg-0)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.username || profileTypeLabel(p.profile_type_v2)}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: 'var(--fg-0)',
                          opacity: 0.6,
                          marginTop: 2,
                        }}
                      >
                        {profileTypeLabel(p.profile_type_v2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '.1em',
                          textTransform: 'uppercase',
                          padding: '4px 8px',
                          border: '1px solid var(--hairline)',
                          background: 'var(--fg-0)',
                          color: '#fff',
                        }}
                      >
                        {t('profiles.active')}
                      </span>
                    )}
                    {p.is_super_user && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '.1em',
                          textTransform: 'uppercase',
                          padding: '4px 8px',
                          border: '1px solid var(--hairline)',
                          background: '#C0DD97',
                          color: 'var(--fg-0)',
                        }}
                      >
                        {t('profiles.super')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    disabled={isActive || isDeleting}
                    style={{
                      padding: '8px 12px',
                      background: isActive ? 'transparent' : 'var(--fg-0)',
                      color: isActive ? '#888' : '#fff',
                      border: '1px solid var(--hairline)',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      cursor: isActive || isDeleting ? 'not-allowed' : 'pointer',
                      opacity: isActive || isDeleting ? 0.4 : 1,
                      fontFamily: 'var(--font-display)',
                      marginTop: 'auto',
                    }}
                  >
                    {isDeleting
                      ? t('profiles.deleting')
                      : isActive
                        ? t('profiles.activeProfile')
                        : t('profiles.delete')}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {activeProfile && (
        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}
        >
          <section
            style={{
              border: '1px solid var(--hairline)',
              padding: 24,
              background: '#fff',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {t('activeProfile.title', {
                type: profileTypeLabel(activeProfile.profile_type_v2),
              })}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#888',
                fontWeight: 500,
                marginBottom: 20,
              }}
            >
              {t('activeProfile.hint')}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <div>
                <label style={label}>{t('activeProfile.username')}</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={input}
                  placeholder={t('activeProfile.usernamePlaceholder')}
                  required
                />
              </div>
              <div>
                <label style={label}>{t('activeProfile.email')}</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  style={{
                    ...input,
                    background: '#f4f4f4',
                    color: '#666',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
              <div>
                <label style={label}>{t('activeProfile.profileType')}</label>
                <div
                  style={{
                    ...input,
                    background: PROFILE_META[activeProfile.profile_type_v2].color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: 12,
                    letterSpacing: '.06em',
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {PROFILE_META[activeProfile.profile_type_v2].emoji}
                  </span>
                  {profileTypeLabel(activeProfile.profile_type_v2)}
                </div>
              </div>
              <div>
                <label style={label}>{t('activeProfile.identifier')}</label>
                <input
                  type="text"
                  value={activeProfile.profile_type_v2}
                  readOnly
                  style={{
                    ...input,
                    background: '#f4f4f4',
                    color: '#666',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
            </div>
          </section>

          <section
            style={{
              border: '1px solid var(--hairline)',
              padding: 24,
              background: '#fff',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {t('payment.title')}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#888',
                fontWeight: 500,
                marginBottom: 16,
                lineHeight: 1.45,
              }}
            >
              {t('payment.hint')}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <FormField label={t('payment.holder')} htmlFor="titular-cuenta">
                <Input
                  id="titular-cuenta"
                  type="text"
                  value={titularCuenta}
                  onChange={e => setTitularCuenta(e.target.value)}
                  placeholder={t('payment.holderPlaceholder')}
                />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label={t('payment.bank')} htmlFor="banco-deposito">
                  <Input
                    id="banco-deposito"
                    type="text"
                    value={bancoDeposito}
                    onChange={e => setBancoDeposito(e.target.value)}
                    placeholder={t('payment.bankPlaceholder')}
                  />
                </FormField>
                <FormField label={t('payment.account')} htmlFor="cuenta-deposito">
                  <Input
                    id="cuenta-deposito"
                    type="text"
                    value={cuentaDeposito}
                    onChange={e => setCuentaDeposito(e.target.value)}
                    placeholder={t('payment.accountPlaceholder')}
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  />
                </FormField>
              </div>
            </div>
          </section>

          <section
            style={{
              border: '1px solid var(--hairline)',
              padding: 24,
              background: isSuperUser ? 'var(--fg-0)' : '#fff',
              color: isSuperUser ? '#fff' : 'var(--fg-0)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {t('superUser.title')}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: isSuperUser ? '#aaa' : '#888',
                    lineHeight: 1.4,
                  }}
                >
                  {isSuperEmail ? t('superUser.masterEmail') : t('superUser.hint')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSuperUser(v => !v)}
                disabled={isSuperEmail}
                style={{
                  position: 'relative',
                  width: 64,
                  height: 32,
                  background: isSuperUser ? '#C0DD97' : '#fff',
                  border: '1px solid var(--hairline)',
                  padding: 0,
                  cursor: isSuperEmail ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
                aria-label={t('superUser.toggle')}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: isSuperUser ? 32 : 0,
                    width: 26,
                    height: 26,
                    background: 'var(--fg-0)',
                    transition: 'left .15s ease',
                  }}
                />
              </button>
            </div>
          </section>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <Button type="submit" loading={saving}>
              {saving ? t('saving') : t('save')}
            </Button>
            {savedAt && !saving && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: '#888',
                }}
              >
                {t('saved')}{' '}
                {savedAt.toLocaleTimeString(localeTag, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
