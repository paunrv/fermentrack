'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button, FormField, Input, ContentCard, PageFrame, PageHeader } from '@fermentrack/ui'
import { useAuth } from '@/hooks/useAuth'
import { getUserEmail, getUserFirstName } from '@/lib/auth/user'
import { useProfile } from '@/context/ProfileContext'
import { useOrganization } from '@/context/OrganizationContext'
import { useSupabase } from '@/hooks/useSupabase'
import { useIntlLocaleTag } from '@/lib/i18n/locale'
import { fetchOrganizationSettings,
  updateOrganizationName,
  type OrganizationSettings,
} from '@/app/actions/organization'
import { fetchPlanBillingStatusAction, fetchBillingCheckoutStatus, activateProDevelopment } from '@/app/actions/plan-billing'
import type { PlanBillingStatus } from '@/lib/proof/plan-over-limit'
import {
  STRIPE_CHECKOUT_UNAVAILABLE,
  STRIPE_PORTAL_UNAVAILABLE,
} from '@/lib/stripe/billing-errors'
import { OrgSwitcher } from '@/components/proof/OrgSwitcher'
import { SettingsLanguageSection } from '@/components/proof/SettingsLanguageSection'
import { PLAN_LIMITS_CATALOG } from '@/lib/proof/plan-limits'
import { trialDaysRemaining } from '@/lib/billing/billing-renewal-anchor'
import type { BillingCycle } from '@/lib/stripe/server'
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
  background: 'var(--surface-card)',
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
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [checkoutStatus, setCheckoutStatus] = useState<{
    ready: boolean
    devBypass: boolean
    devHint: string | null
  } | null>(null)
  const [planBilling, setPlanBilling] = useState<PlanBillingStatus | null>(null)
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
    if (!activeOrg?.id || !orgSettings?.isOwner) {
      setPlanBilling(null)
      return
    }
    let cancelled = false
    fetchPlanBillingStatusAction(activeOrg.id)
      .then(status => {
        if (!cancelled) setPlanBilling(status)
      })
      .catch(() => {
        if (!cancelled) setPlanBilling(null)
      })
    return () => {
      cancelled = true
    }
  }, [activeOrg?.id, orgSettings?.isOwner, orgSettings?.plan, orgSettings?.plan_status])

  useEffect(() => {
    const billing = searchParams.get('billing')
    if (billing === 'success') {
      setBillingNotice(t('billing.success'))
      void reloadOrganizations({ silent: true })
      if (activeOrg?.id) {
        fetchOrganizationSettings(activeOrg.id).then(setOrgSettings).catch(() => {})
        fetchPlanBillingStatusAction(activeOrg.id).then(setPlanBilling).catch(() => {})
      }
      router.replace('/dashboard/settings', { scroll: false })
    } else if (billing === 'canceled') {
      setBillingNotice(t('billing.canceled'))
      router.replace('/dashboard/settings', { scroll: false })
    }
  }, [searchParams, router, reloadOrganizations, activeOrg?.id])

  function billingApiErrorMessage(code: string | undefined, fallback: string): string {
    if (
      code === STRIPE_CHECKOUT_UNAVAILABLE ||
      code === STRIPE_PORTAL_UNAVAILABLE ||
      code?.startsWith('Missing STRIPE')
    ) {
      return t('billing.stripeNotConfigured')
    }
    return code || fallback
  }

  useEffect(() => {
    let cancelled = false
    void fetchBillingCheckoutStatus(billingCycle).then(status => {
      if (!cancelled) setCheckoutStatus(status)
    })
    return () => {
      cancelled = true
    }
  }, [billingCycle])

  async function startCheckout() {
    if (!activeOrg?.id) return
    setBillingLoading(true)
    setBillingError(null)
    try {
      if (checkoutStatus?.devBypass) {
        await activateProDevelopment(activeOrg.id)
        setBillingNotice(t('billing.devProActivated'))
        await reloadOrganizations({ silent: true })
        const nextSettings = await fetchOrganizationSettings(activeOrg.id)
        setOrgSettings(nextSettings)
        const nextBilling = await fetchPlanBillingStatusAction(activeOrg.id)
        setPlanBilling(nextBilling)
        return
      }

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: activeOrg.id, billingCycle }),
      })
      const body = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !body.url) {
        throw new Error(billingApiErrorMessage(body.error, t('billing.checkoutError')))
      }
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
      if (!res.ok || !body.url) {
        throw new Error(billingApiErrorMessage(body.error, t('billing.portalError')))
      }
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
      <PageFrame style={{ overflow: 'auto' }}>
        <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: 0 }}>{t('loading')}</p>
      </PageFrame>
    )
  }

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {activeOrg && <OrgSwitcher />}
      <button
        type="button"
        onClick={() => router.push('/profile-select')}
        style={{
          padding: '12px 20px',
          background: 'var(--surface-card)',
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
  )

  return (
    <PageFrame className="proof-settings-page" style={{ overflow: 'auto' }}>
      <PageHeader title={t('title')} description={t('subtitle')} actions={headerActions} />

      <ContentCard>
        <SettingsLanguageSection />
      </ContentCard>

      {activeOrg && orgSettings && (
        <section
          style={{
            border: '1px solid var(--hairline)',
            padding: 24,
            marginBottom: 24,
            background: 'var(--surface-card)',
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
              color: 'var(--fg-3)',
              fontWeight: 500,
              marginBottom: 20,
              lineHeight: 1.45,
            }}
          >
            {t('org.description')}
          </div>

          <form onSubmit={handleOrgSave} style={{ display: 'grid', gap: 12 }}>
            <div className="proof-settings-grid--2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                      ? { background: 'var(--panel-2)', color: 'var(--fg-3)', cursor: 'not-allowed' }
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
                    background: 'var(--panel-2)',
                    color: 'var(--fg-3)',
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
                    background: 'var(--panel-2)',
                    color: 'var(--fg-3)',
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
                    background: 'var(--panel-2)',
                    color: 'var(--fg-3)',
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
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)' }}>
                    {t('org.saved')}{' '}
                    {orgSavedAt.toLocaleTimeString(localeTag, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>
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
            background: 'var(--surface-card)',
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
              color: 'var(--fg-3)',
              lineHeight: 1.5,
            }}
          >
            {t('billing.currentPlan')}{' '}
            <strong>{t(`plans.${orgSettings.plan}` as 'plans.trial')}</strong>
            {' · '}
            {t(`planStatus.${orgSettings.plan_status}` as 'planStatus.active')}
            {planBilling?.trialExpired ? (
              <>
                {' · '}
                <span style={{ color: 'var(--crit)' }}>{t('billing.trialExpired')}</span>
              </>
            ) : null}
            {orgSettings.plan === 'trial' &&
            orgSettings.trial_ends_at &&
            !planBilling?.trialExpired ? (
              <>
                {' · '}
                {t('billing.trialRemaining', {
                  days: trialDaysRemaining(orgSettings.trial_ends_at),
                })}
              </>
            ) : null}
            {orgSettings.billing_cycle ? (
              <>
                {' · '}
                {t(`billing.cycle.${orgSettings.billing_cycle}` as 'billing.cycle.monthly')}
              </>
            ) : null}
          </p>
          {orgSettings.renewal_anchor && orgSettings.billing_cycle === 'annual' ? (
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
              {t('billing.renewalAnchor', { date: orgSettings.renewal_anchor })}
            </p>
          ) : null}
          {planBilling?.isFoundingMember ? (
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
              {t('billing.foundingMember')}
            </p>
          ) : null}

          {planBilling?.showDowngradeNotice ? (
            <div
              style={{
                margin: '0 0 16px',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--hairline)',
                background: 'var(--warn-soft)',
                fontSize: 13,
                color: 'var(--fg-1)',
                lineHeight: 1.5,
              }}
            >
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{t('billing.downgradeNoticeTitle')}</p>
              <p style={{ margin: 0 }}>{t('billing.downgradeNoticeBody')}</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {planBilling.overLimit.items.map(item => (
                  <li key={item.resource}>
                    {t(`billing.overLimit.${item.resource}` as 'billing.overLimit.lotes_activos', {
                      current: item.current,
                      limit: item.limit,
                    })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ul
            style={{
              margin: '0 0 20px',
              paddingLeft: 18,
              fontSize: 12,
              color: 'var(--fg-3)',
              lineHeight: 1.6,
            }}
          >
            <li>
              {t('billing.regularLimits', {
                lots: PLAN_LIMITS_CATALOG.regular.lotes_activos,
                labels: PLAN_LIMITS_CATALOG.regular.etiquetas,
                memory: PLAN_LIMITS_CATALOG.regular.memoria_meses,
              })}
            </li>
            <li>{t('billing.proLimits')}</li>
            <li>{t('billing.enterpriseLimits')}</li>
          </ul>

          {(orgSettings.plan === 'regular' ||
            orgSettings.plan === 'trial' ||
            orgSettings.plan_status === 'canceled') && (
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-0)',
                }}
              >
                {t('billing.cycleLabel')}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['monthly', 'annual'] as const).map(cycle => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border:
                        billingCycle === cycle
                          ? '1px solid var(--proof-accent)'
                          : '1px solid var(--hairline)',
                      background: billingCycle === cycle ? 'var(--accent-soft)' : 'var(--surface-card)',
                      fontSize: 13,
                      fontWeight: billingCycle === cycle ? 600 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {t(`billing.cycle.${cycle}` as 'billing.cycle.monthly')}
                  </button>
                ))}
              </div>
              {billingCycle === 'annual' ? (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                  {t('billing.annualHint')}
                </p>
              ) : null}
            </div>
          )}

          {checkoutStatus?.ready === false && !checkoutStatus.devBypass ? (
            <>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                {t('billing.stripeNotConfigured')}
              </p>
              {checkoutStatus.devHint ? (
                <p
                  style={{
                    margin: '0 0 12px',
                    fontSize: 12,
                    color: 'var(--fg-3)',
                    lineHeight: 1.5,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {checkoutStatus.devHint}
                </p>
              ) : null}
            </>
          ) : null}
          {checkoutStatus?.devBypass ? (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
              {t('billing.devBypassHint')}
            </p>
          ) : null}

          {billingNotice && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-1)' }}>{billingNotice}</p>
          )}
          {billingError && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--red)' }}>{billingError}</p>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(orgSettings.plan === 'regular' ||
              orgSettings.plan === 'trial' ||
              orgSettings.plan_status === 'canceled') && (
              <Button
                type="button"
                loading={billingLoading}
                disabled={checkoutStatus?.ready === false && !checkoutStatus?.devBypass}
                onClick={() => void startCheckout()}
              >
                {t('billing.upgrade')}
              </Button>
            )}
            {orgSettings.hasStripeCustomer &&
              orgSettings.plan !== 'regular' &&
              orgSettings.plan !== 'trial' &&
              orgSettings.plan_status !== 'canceled' && (
                <>
                  <button
                    type="button"
                    disabled={billingLoading}
                    onClick={() => void openBillingPortal()}
                    style={{
                      padding: '10px 16px',
                      border: '1px solid var(--hairline)',
                      background: 'var(--surface-card)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: billingLoading ? 'wait' : 'pointer',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {t('billing.manage')}
                  </button>
                  <p style={{ width: '100%', margin: '4px 0 0', fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                    {t('billing.downgradeHint')}
                  </p>
                </>
              )}
          </div>
        </section>
      )}

      <section
        style={{
          border: '1px solid var(--hairline)',
          padding: 24,
          marginBottom: 24,
          background: 'var(--surface-card)',
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
              color: 'var(--fg-3)',
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {t('profiles.legacyNote')}
          </div>

        {allProfiles.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>
            {t('profiles.empty')}
          </p>
        ) : (
          <div
            className="proof-settings-profiles-grid"
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
                      color: isActive ? 'var(--fg-3)' : '#fff',
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
              background: 'var(--surface-card)',
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
                color: 'var(--fg-3)',
                fontWeight: 500,
                marginBottom: 20,
              }}
            >
              {t('activeProfile.hint')}
            </div>

            <div
              className="proof-settings-grid--2col"
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
                    background: 'var(--panel-2)',
                    color: 'var(--fg-3)',
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
                    background: 'var(--panel-2)',
                    color: 'var(--fg-3)',
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
              background: 'var(--surface-card)',
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
                color: 'var(--fg-3)',
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
              <div className="proof-settings-grid--2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
              background: isSuperUser ? 'var(--fg-0)' : 'var(--surface-card)',
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
                    color: 'var(--fg-3)',
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
                  background: isSuperUser ? 'var(--ok-soft)' : 'var(--surface-card)',
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
                  color: 'var(--fg-3)',
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
    </PageFrame>
  )
}
