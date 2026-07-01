'use client'

export const dynamic = 'force-dynamic'

// Onboarding: winemaker → org tenancy (epic #3). Otros tipos → proof_profiles legacy.
// Ver docs/ORG-TENANCY.md

import { useAuth } from '@/hooks/useAuth'
import { getUserEmail, getUserFirstName } from '@/lib/auth/user'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useTranslations } from 'next-intl'
import { upsertProfile } from '@/lib/supabase'
import { persistActiveProfileType, useProfile } from '@/context/ProfileContext'
import { useOrganization } from '@/context/OrganizationContext'
import {
  createWinemakerOrganization,
  insertFirstWinemakerLot,
} from '@/lib/supabase/organization'
import { useSupabase } from '@/hooks/useSupabase'
import { AuthLocaleBar } from '@/components/auth/AuthLocaleBar'

type ProfileType = 'brewer' | 'winemaker' | 'distiller' | 'distributor'
type ProducerType = 'brewer' | 'winemaker' | 'distiller'
type Step = 1 | 2 | 3

const font = 'var(--font-display)'

const PROFILE_TYPES: ProfileType[] = ['brewer', 'winemaker', 'distiller', 'distributor']
const PROFILE_EMOJI: Record<ProfileType, string> = {
  brewer: '🍺',
  winemaker: '🍷',
  distiller: '🥃',
  distributor: '📦',
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
  const isAddMode = searchParams.get('mode') === 'add'
  const { allProfiles, reload: reloadProfiles, switchProfile } = useProfile()
  const { reload: reloadOrganizations, switchOrganization } = useOrganization()
  const supabase = useSupabase()

  const existingTypes = new Set(allProfiles.map(p => p.profile_type_v2))
  const availableTypes = isAddMode
    ? PROFILE_TYPES.filter(type => {
        if (type === 'winemaker') return true
        return !existingTypes.has(type)
      })
    : PROFILE_TYPES

  const [step, setStep] = useState<Step>(1)
  const [profileType, setProfileType] = useState<ProfileType | null>(null)
  const [username, setUsername] = useState('')
  const [productName, setProductName] = useState('')
  const [productStyle, setProductStyle] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [categories, setCategories] = useState({ cerveza: false, vino: false, destilados: false })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null)

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
    const orgName = username.trim() || getUserFirstName(user) || 'Mi bodega'

    const org = await createWinemakerOrganization(supabase, { name: orgName })

    if (productName.trim() && productStyle) {
      await insertFirstWinemakerLot(supabase, {
        userId: user.id,
        organizationId: org.id,
        productName: productName.trim(),
        varietal: productStyle,
      })
    }

    await reloadOrganizations()
    switchOrganization(org.id)
    persistActiveProfileType('winemaker')
    router.push('/dashboard')
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

    if (isAddMode) {
      router.push('/profile-select')
      return
    }

    switchProfile(profileType)
    router.push('/dashboard')
  }

  async function finish() {
    if (!user || !profileType) return
    setSaving(true)
    setSaveError(null)

    try {
      if (profileType === 'winemaker') {
        await finishWinemakerOrg()
      } else {
        await finishLegacyProfile()
      }
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : err instanceof Error
            ? err.message
            : t('errors.saveFailed')
      setSaveError(
        msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')
          ? `${msg}${t('errors.networkSuffix')}`
          : msg
      )
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full bg-white border border-[rgba(55,53,47,0.09)] focus:border-[#2383E2] rounded-md px-4 py-3 text-sm text-[#37352F] outline-none placeholder:text-[#9B9A97] transition-colors'

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
              {([1, 2, 3] as const).map(s => (
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

          {step === 1 && (
            <div>
              <h1 className="text-2xl font-medium text-[#37352F] text-center mb-2">
                {isAddMode ? t('step1.titleAdd') : t('step1.title')}
              </h1>
              <p className="text-sm text-[#787774] text-center mb-10">
                {isAddMode ? t('step1.subtitleAdd') : t('step1.subtitle')}
              </p>

              {isAddMode && availableTypes.length === 0 ? (
                <div className="bg-[#F7F6F3] border border-[rgba(55,53,47,0.09)] rounded-lg p-8 text-center">
                  <div className="text-3xl mb-4">✨</div>
                  <div className="text-sm text-[#37352F] font-medium mb-2">
                    {t('step1.allProfilesTitle')}
                  </div>
                  <div className="text-xs text-[#787774] mb-6">{t('step1.allProfilesBody')}</div>
                  <button
                    type="button"
                    onClick={() => router.push('/profile-select')}
                    className="w-full py-3 bg-[#37352F] hover:bg-[#787774] text-white text-sm font-medium rounded-md transition-colors"
                  >
                    {t('step1.backToProfiles')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {availableTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setProfileType(type)
                        setStep(2)
                      }}
                      className="bg-[#F7F6F3] border border-[rgba(55,53,47,0.09)] hover:border-[rgba(55,53,47,0.24)] rounded-lg p-6 flex flex-col items-center gap-3 transition-all hover:bg-[#F1F1EF]"
                    >
                      <div className="text-4xl">{PROFILE_EMOJI[type]}</div>
                      <div>
                        <div className="text-sm font-medium text-[#37352F] text-center">
                          {t(`profiles.${type}.label`)}
                        </div>
                        <div className="text-[11px] text-[#787774] text-center mt-1 leading-snug">
                          {t(`profiles.${type}.sub`)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isAddMode && (
                <button
                  type="button"
                  onClick={() => router.push('/profile-select')}
                  className="w-full mt-6 py-2 text-xs text-[#787774] hover:text-[#37352F] transition-colors"
                >
                  {t('step1.cancelAdd')}
                </button>
              )}
            </div>
          )}

          {step === 2 && profileType && (
            <div>
              <h1 className="text-2xl font-medium text-[#37352F] text-center mb-2">
                {t('step2.title')}
              </h1>
              <p className="text-sm text-[#787774] text-center mb-8">
                {PROFILE_EMOJI[profileType]} {t(`roles.${profileType}`)}
              </p>
              <div className="bg-[#F7F6F3] border border-[rgba(55,53,47,0.09)] rounded-lg p-6 space-y-5">
                <div>
                  <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                    {orgNameLabel()}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      profileType === 'winemaker'
                        ? t('step2.orgPlaceholderWinemaker')
                        : getUserFirstName(user) || t('step2.orgNameDefault')
                    }
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
                      <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-3">
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
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 border border-[rgba(55,53,47,0.09)] text-[#787774] hover:text-[#37352F] text-sm rounded-md transition-colors"
                >
                  {t('step2.back')}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canContinueStep2()}
                  className="flex-1 py-3 bg-[#37352F] hover:bg-[#787774] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                >
                  {t('step2.continue')}
                </button>
              </div>
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
                  {saving
                    ? t('step3.saving')
                    : isAddMode
                      ? profileType === 'winemaker'
                        ? t('step3.finishAddWinemaker')
                        : t('step3.finishAddProfile')
                      : t('step3.finish')}
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
