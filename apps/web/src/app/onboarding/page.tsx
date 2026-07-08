'use client'

export const dynamic = 'force-dynamic'

// Onboarding: winemaker owner → org tenancy. Team invite → winemaker | bodega profile.
// Ver docs/ORG-TENANCY.md

import { useAuth } from '@/hooks/useAuth'
import { getUserEmail, getUserFirstName } from '@/lib/auth/user'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { upsertProfile } from '@/lib/supabase'
import { persistActiveProfileType, useProfile } from '@/context/ProfileContext'
import { useOrganization } from '@/context/OrganizationContext'
import {
  createWinemakerOrganization,
  fetchPendingWinemakerInvite,
  type PendingWinemakerInvite,
} from '@/lib/supabase/organization'
import { useSupabase } from '@/hooks/useSupabase'
import { AuthLocaleBar } from '@/components/auth/AuthLocaleBar'
import { completeTeamOnboarding } from '@/app/actions/team-onboarding'
import { isValidAccessCodeFormat } from '@/lib/proof/team-access-code'

type LegacyProfileType = 'brewer' | 'distiller' | 'distributor'
type TeamProfileType = 'winemaker' | 'bodega'
type ProfileType = TeamProfileType | LegacyProfileType
type ProducerType = 'brewer' | 'winemaker' | 'distiller'
type Step = 1 | 2 | 3

const font = 'var(--font-display)'

const TEAM_PROFILE_TYPES: TeamProfileType[] = ['winemaker', 'bodega']

const PROFILE_EMOJI: Record<TeamProfileType, string> = {
  winemaker: '🍷',
  bodega: '📦',
}

const BEER_STYLES = ['Session IPA', 'IPA', 'Stout', 'Porter', 'Pale Ale', 'Lager', 'Sour', 'Saison']
const WINE_STYLES = ['Chardonnay', 'Sauvignon Blanc', 'Cabernet', 'Merlot', 'Tempranillo', 'Malbec', 'Rosado']
const SPIRIT_STYLES = ['Mezcal', 'Tequila', 'Whisky', 'Ron', 'Vodka', 'Gin', 'Brandy']

const BATCH_TYPE: Record<ProducerType, string> = {
  brewer: 'Cerveza artesanal',
  winemaker: 'Vino',
  distiller: 'Destilados',
}

const DIST_CATEGORY_KEYS = ['cerveza', 'vino', 'destilados'] as const

function isProducer(type: ProfileType | null): type is ProducerType {
  return type === 'brewer' || type === 'winemaker' || type === 'distiller'
}

function OnboardingContent() {
  const t = useTranslations('onboarding')
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isTeamModeParam = searchParams.get('mode') === 'team'
  const { reload: reloadProfiles, switchProfile } = useProfile()
  const { reload: reloadOrganizations, switchOrganization } = useOrganization()
  const supabase = useSupabase()

  const [bootReady, setBootReady] = useState(false)
  const [pendingInvite, setPendingInvite] = useState<PendingWinemakerInvite | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [profileType, setProfileType] = useState<ProfileType | null>(null)
  const [wineryName, setWineryName] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [productName, setProductName] = useState('')
  const [productStyle, setProductStyle] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [categories, setCategories] = useState({ cerveza: false, vino: false, destilados: false })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null)
  const [teamInviteMissing, setTeamInviteMissing] = useState(false)

  const isTeamOnboarding = Boolean(pendingInvite?.platformProfile)
  const progressSteps: Step[] = [2, 3]

  useEffect(() => {
    if (!user) return

    let cancelled = false

    void (async () => {
      try {
        const invite = await fetchPendingWinemakerInvite(supabase, user.id)
        if (cancelled) return

        setPendingInvite(invite)

        if (invite?.platformProfile) {
          setProfileType(invite.platformProfile)
          setUserName(getUserFirstName(user) || '')
          setStep(2)
        } else if (isTeamModeParam) {
          setTeamInviteMissing(true)
          setStep(2)
        } else {
          setProfileType('winemaker')
          setUserName(getUserFirstName(user) || '')
          setStep(2)
        }
      } catch {
        if (!cancelled) {
          setProfileType('winemaker')
          setUserName(getUserFirstName(user) || '')
          setStep(2)
        }
      } finally {
        if (!cancelled) setBootReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, supabase, isTeamModeParam])

  function styleOptions(): string[] {
    if (profileType === 'brewer') return BEER_STYLES
    if (profileType === 'winemaker') return WINE_STYLES
    if (profileType === 'distiller') return SPIRIT_STYLES
    return []
  }

  function productNameLabel(): string {
    if (profileType === 'brewer') return t('step2.productNameBrewer')
    if (profileType === 'winemaker') return t('step2.productNameWinemaker')
    return t('step2.productNameDistiller')
  }

  function productNamePlaceholder(): string {
    if (profileType === 'brewer') return t('step2.productPlaceholderBrewer')
    if (profileType === 'winemaker') return t('step2.productPlaceholderWinemaker')
    return t('step2.productPlaceholderDistiller')
  }

  function canContinueStep2(): boolean {
    if (isTeamOnboarding) {
      return Boolean(
        profileType &&
          wineryName.trim() &&
          isValidAccessCodeFormat(accessCode) &&
          userName.trim() &&
          password.length >= 6
      )
    }
    if (profileType === 'winemaker') {
      return Boolean(wineryName.trim() && userName.trim())
    }
    if (!username.trim()) return false
    if (isProducer(profileType)) {
      return Boolean(productName.trim() && productStyle)
    }
    if (profileType === 'distributor') {
      return Boolean(businessName.trim() && Object.values(categories).some(Boolean))
    }
    return false
  }

  async function requestCamera() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraGranted(true)
    } catch {
      setCameraGranted(false)
    }
  }

  function orgNameLabel(): string {
    if (profileType === 'winemaker') return t('step2.orgNameWinemaker')
    return t('step2.orgNameDefault')
  }

  async function finishWinemakerOrg() {
    if (!user) return
    const orgName = wineryName.trim()
    if (!orgName) throw new Error(t('step2.orgNameWinemaker'))

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: userName.trim() },
    })
    if (authError) throw authError

    const org = await createWinemakerOrganization(supabase, { name: orgName })

    await reloadOrganizations()
    switchOrganization(org.id)
    persistActiveProfileType('winemaker')
    router.push('/dashboard')
  }

  async function finishTeamMember() {
    if (!user || !profileType || (profileType !== 'winemaker' && profileType !== 'bodega')) return

    const { error: authError } = await supabase.auth.updateUser({
      password,
      data: { full_name: userName.trim() },
    })
    if (authError) throw authError

    await completeTeamOnboarding({
      wineryName: wineryName.trim(),
      accessCode: accessCode.trim(),
      userName: userName.trim(),
    })

    await reloadProfiles()
    await reloadOrganizations()
    if (pendingInvite?.organizationId) {
      switchOrganization(pendingInvite.organizationId)
    }
    persistActiveProfileType(profileType)
    router.push('/dashboard')
  }

  function formatOnboardingError(err: unknown): string {
    const code =
      err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? err.message
        : err instanceof Error
          ? err.message
          : t('errors.saveFailed')

    if (code === 'ACCESS_CODE_INVALID') return t('errors.accessCodeInvalid')
    if (code === 'WINERY_NAME_MISMATCH') return t('errors.wineryNameMismatch')
    if (code === 'NO_PENDING_INVITE') return t('errors.noPendingInvite')

    return code.toLowerCase().includes('fetch') || code.toLowerCase().includes('network')
      ? `${code}${t('errors.networkSuffix')}`
      : code
  }

  async function finishLegacyProfile() {
    if (!user || !profileType) return
    const email = getUserEmail(user) || null

    await upsertProfile(supabase, {
      user_id: user.id,
      profile_type_v2: profileType,
      profile_type: profileType,
      username: username.trim() || getUserFirstName(user) || 'Productor',
      onboarding_complete: true,
      email,
    })

    if (isProducer(profileType) && productName.trim() && productStyle) {
      const id = 'FT-' + Date.now().toString().slice(-4)
      await supabase.from('batches').insert({
        id,
        name: productName.trim(),
        type: BATCH_TYPE[profileType],
        volume: 0,
        yeast: null,
        density: null,
        ph: null,
        temp: null,
        day: 1,
        progress: 0,
        status: 'active',
        alert: null,
        user_id: user.id,
        profile_type_v2: profileType,
      })
    }

    await reloadProfiles()
    switchProfile(profileType)
    router.push('/dashboard')
  }

  async function finish() {
    if (!user || !profileType) return
    setSaving(true)
    setSaveError(null)

    try {
      if (isTeamOnboarding) {
        await finishTeamMember()
      } else if (profileType === 'winemaker') {
        await finishWinemakerOrg()
      } else {
        await finishLegacyProfile()
      }
    } catch (err) {
      setSaveError(formatOnboardingError(err))
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full bg-white border border-[rgba(55,53,47,0.09)] focus:border-[#2383E2] rounded-md px-4 py-3 text-sm text-[#37352F] outline-none placeholder:text-[#9B9A97] transition-colors'

  if (!bootReady) {
    return (
      <AuthLocaleBar variant="light">
        <div
          style={{ fontFamily: font }}
          className="min-h-screen bg-white flex items-center justify-center px-4"
        >
          <div className="text-sm text-[#787774]">…</div>
        </div>
      </AuthLocaleBar>
    )
  }

  return (
    <AuthLocaleBar variant="light">
      <div
        style={{ fontFamily: font }}
        className="min-h-screen bg-white flex items-center justify-center px-4"
      >
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="text-2xl font-medium tracking-tight text-[#37352F] mb-1">
              PRO<span className="text-[#787774] font-light">OF</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6">
              {progressSteps.map(s => (
                <div
                  key={s}
                  className={`rounded-full transition-all duration-300 ${
                    s === step
                      ? 'w-6 h-2 bg-[#37352F]'
                      : s < step
                        ? 'w-2 h-2 bg-[#37352F]'
                        : 'w-2 h-2 bg-[#1e3326]'
                  }`}
                />
              ))}
            </div>
          </div>

          {step === 2 && (profileType || teamInviteMissing) && (
            <div>
              <h1 className="text-2xl font-medium text-[#37352F] text-center mb-2">
                {t('step2.title')}
              </h1>
              {teamInviteMissing ? (
                <p className="text-sm text-[#EB5757] text-center mb-8">{t('errors.noPendingInvite')}</p>
              ) : (
                <p className="text-sm text-[#787774] text-center mb-8">
                  {PROFILE_EMOJI[profileType as TeamProfileType] ?? '🍷'}{' '}
                  {profileType ? t(`roles.${profileType}`) : ''}
                  {isTeamOnboarding && pendingInvite ? (
                    <>
                      <br />
                      <span className="text-xs">
                        {t('step2.teamInviteHint', { org: pendingInvite.organizationName })}
                      </span>
                    </>
                  ) : null}
                </p>
              )}
              {!teamInviteMissing && profileType ? (
              <div className="bg-[#F7F6F3] border border-[rgba(55,53,47,0.09)] rounded-lg p-6 space-y-5">
                {isTeamOnboarding ? (
                  <>
                    <div>
                      <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                        {t('step2.orgNameWinemaker')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('step2.orgPlaceholderWinemaker')}
                        value={wineryName}
                        onChange={e => setWineryName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                        {t('step2.accessCode')}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder={t('step2.accessCodePlaceholder')}
                        value={accessCode}
                        onChange={e => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                        {t('step2.userName')}
                      </label>
                      <input
                        type="text"
                        autoComplete="name"
                        placeholder={t('step2.userNamePlaceholder')}
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                        {t('step2.password')}
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        placeholder={t('step2.passwordPlaceholder')}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        minLength={6}
                        className={inputClass}
                      />
                    </div>
                  </>
                ) : profileType === 'winemaker' ? (
                  <>
                    <div>
                      <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                        {t('step2.orgNameWinemaker')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('step2.orgPlaceholderWinemaker')}
                        value={wineryName}
                        onChange={e => setWineryName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                        {t('step2.userName')}
                      </label>
                      <input
                        type="text"
                        autoComplete="name"
                        placeholder={t('step2.userNamePlaceholder')}
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                        {orgNameLabel()}
                      </label>
                      <input
                        type="text"
                        placeholder={getUserFirstName(user) || t('step2.orgNameDefault')}
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    {isProducer(profileType) ? (
                      <>
                        <div>
                          <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                            {productNameLabel()}
                          </label>
                          <input
                            type="text"
                            placeholder={productNamePlaceholder()}
                            value={productName}
                            onChange={e => setProductName(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                            {t('step2.style')}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {styleOptions().map(style => (
                              <button
                                key={style}
                                type="button"
                                onClick={() => setProductStyle(style)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                  productStyle === style
                                    ? 'bg-[#37352F] border-[#1D9E75] text-white'
                                    : 'bg-transparent border-[rgba(55,53,47,0.09)] text-[#787774] hover:border-[rgba(55,53,47,0.24)] hover:text-[#37352F]'
                                }`}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                            {t('step2.businessName')}
                          </label>
                          <input
                            type="text"
                            placeholder={t('step2.businessPlaceholder')}
                            value={businessName}
                            onChange={e => setBusinessName(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                            {t('step2.categories')}
                          </label>
                          <div className="space-y-2">
                            {DIST_CATEGORY_KEYS.map(key => (
                              <label
                                key={key}
                                className={`flex items-center gap-3 px-4 py-3 rounded-md border cursor-pointer transition-all ${
                                  categories[key]
                                    ? 'bg-[#0F6E5620] border-[#0F6E56] text-[#37352F]'
                                    : 'bg-white border-[rgba(55,53,47,0.09)] text-[#787774] hover:border-[rgba(55,53,47,0.24)]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={categories[key]}
                                  onChange={e =>
                                    setCategories(c => ({ ...c, [key]: e.target.checked }))
                                  }
                                  className="w-4 h-4 accent-[#0F6E56]"
                                />
                                <span className="text-sm font-medium">
                                  {t(`step2.categoryLabels.${key}`)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              ) : null}
              {!teamInviteMissing ? (
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canContinueStep2()}
                  className="flex-1 py-3 bg-[#37352F] hover:bg-[#787774] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                >
                  {t('step2.continue')}
                </button>
              </div>
              ) : null}
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-2xl font-medium text-[#37352F] text-center mb-2">
                {t('step3.title')}
              </h1>
              <p className="text-sm text-[#787774] text-center mb-8">{t('step3.subtitle')}</p>
              <div className="bg-[#F7F6F3] border border-[rgba(55,53,47,0.09)] rounded-lg p-8 flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-[#1D9E7520] border border-[#0F6E56] flex items-center justify-center text-4xl">
                  {cameraGranted === null ? '📷' : cameraGranted ? '✅' : '❌'}
                </div>
                {cameraGranted === null && (
                  <>
                    <div className="text-center">
                      <div className="text-sm text-[#37352F] font-medium mb-1">
                        {t('step3.featureTitle')}
                      </div>
                      <div className="text-xs text-[#787774]">{t('step3.featureBody')}</div>
                    </div>
                    <button
                      type="button"
                      onClick={requestCamera}
                      className="w-full py-3 bg-[#37352F] hover:bg-[#787774] text-white text-sm font-medium rounded-md transition-colors"
                    >
                      {t('step3.allowCamera')}
                    </button>
                  </>
                )}
                {cameraGranted === true && (
                  <div className="text-sm text-[#5DCAA5] font-medium">{t('step3.cameraOk')}</div>
                )}
                {cameraGranted === false && (
                  <div className="text-sm text-[#EF9F27] font-medium">{t('step3.cameraDenied')}</div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-3 border border-[rgba(55,53,47,0.09)] text-[#787774] hover:text-[#37352F] text-sm rounded-md transition-colors"
                >
                  {t('step3.back')}
                </button>
                <button
                  type="button"
                  onClick={finish}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#37352F] hover:bg-[#787774] disabled:opacity-40 text-white text-sm font-medium rounded-md transition-colors"
                >
                  {saving ? t('step3.saving') : t('step3.finish')}
                </button>
              </div>
              {saveError ? (
                <p className="mt-3 text-sm text-[#EB5757] font-medium">{saveError}</p>
              ) : null}
              {cameraGranted === null && (
                <button
                  type="button"
                  onClick={finish}
                  disabled={saving}
                  className="w-full mt-3 py-2 text-xs text-[#787774] hover:text-[#37352F] transition-colors"
                >
                  {t('step3.skip')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthLocaleBar>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingContent />
    </Suspense>
  )
}
