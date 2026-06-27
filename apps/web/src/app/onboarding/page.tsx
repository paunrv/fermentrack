'use client'

export const dynamic = 'force-dynamic'

import { useAuth } from '@/hooks/useAuth'
import { getUserEmail, getUserFirstName } from '@/lib/auth/user'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { upsertProfile } from '@/lib/supabase'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'

type ProfileType = 'brewer' | 'winemaker' | 'distiller' | 'distributor'
type ProducerType = 'brewer' | 'winemaker' | 'distiller'
type Step = 1 | 2 | 3

const font = "var(--font-display)"

const PROFILE_OPTIONS: {
  type: ProfileType
  emoji: string
  label: string
  sub: string
}[] = [
  { type: 'brewer', emoji: '🍺', label: 'Brewer', sub: 'Cerveza artesanal' },
  { type: 'winemaker', emoji: '🍷', label: 'Winemaker', sub: 'Vino artesanal' },
  { type: 'distiller', emoji: '🥃', label: 'Distiller', sub: 'Destilados' },
  { type: 'distributor', emoji: '📦', label: 'Distribuidor', sub: 'Inventario y pedidos' },
]

const PROFILE_LABELS: Record<ProfileType, { emoji: string; role: string }> = {
  brewer: { emoji: '🍺', role: 'Brewer' },
  winemaker: { emoji: '🍷', role: 'Winemaker' },
  distiller: { emoji: '🥃', role: 'Distiller' },
  distributor: { emoji: '📦', role: 'Distribuidor' },
}

const BEER_STYLES = ['Session IPA', 'IPA', 'Stout', 'Porter', 'Pale Ale', 'Lager', 'Sour', 'Saison']
const WINE_STYLES = ['Chardonnay', 'Sauvignon Blanc', 'Cabernet', 'Merlot', 'Tempranillo', 'Malbec', 'Rosado']
const SPIRIT_STYLES = ['Mezcal', 'Tequila', 'Whisky', 'Ron', 'Vodka', 'Gin', 'Brandy']

const BATCH_TYPE: Record<ProducerType, string> = {
  brewer: 'Cerveza artesanal',
  winemaker: 'Vino',
  distiller: 'Destilados',
}

const DIST_CATEGORIES = [
  { key: 'cerveza' as const, label: 'Cerveza' },
  { key: 'vino' as const, label: 'Vino' },
  { key: 'destilados' as const, label: 'Destilados' },
]

function isProducer(type: ProfileType | null): type is ProducerType {
  return type === 'brewer' || type === 'winemaker' || type === 'distiller'
}

function OnboardingContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAddMode = searchParams.get('mode') === 'add'
  const { allProfiles, reload: reloadProfiles, switchProfile } = useProfile()
  const supabase = useSupabase()

  const existingTypes = new Set(allProfiles.map(p => p.profile_type_v2))
  const availableOptions = isAddMode
    ? PROFILE_OPTIONS.filter(opt => !existingTypes.has(opt.type))
    : PROFILE_OPTIONS

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
    if (profileType === 'brewer') return 'Nombre de tu cerveza'
    if (profileType === 'winemaker') return 'Nombre de tu vino'
    return 'Nombre de tu destilado'
  }

  function productNamePlaceholder(): string {
    if (profileType === 'brewer') return 'Ej: Mantis'
    if (profileType === 'winemaker') return 'Ej: El Burro Coyero'
    return 'Ej: London Dry'
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

  async function finish() {
    if (!user || !profileType) return
    setSaving(true)
    setSaveError(null)
    const email = getUserEmail(user) || null

    try {
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
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo guardar el perfil'
      setSaveError(
        msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')
          ? `${msg} — revisa tu conexión e intenta de nuevo`
          : msg
      )
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full bg-white border border-[rgba(55,53,47,0.09)] focus:border-[#2383E2] rounded-md px-4 py-3 text-sm text-[#37352F] outline-none placeholder:text-[#9B9A97] transition-colors'

  return (
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
              {isAddMode ? 'Nuevo perfil' : 'I am a...'}
            </h1>
            <p className="text-sm text-[#787774] text-center mb-10">
              {isAddMode
                ? 'Elige el tipo de perfil que quieres agregar'
                : 'Elige tu tipo de perfil'}
            </p>

            {isAddMode && availableOptions.length === 0 ? (
              <div className="bg-[#F7F6F3] border border-[rgba(55,53,47,0.09)] rounded-lg p-8 text-center">
                <div className="text-3xl mb-4">✨</div>
                <div className="text-sm text-[#37352F] font-medium mb-2">
                  Ya tienes todos los tipos de perfil
                </div>
                <div className="text-xs text-[#787774] mb-6">
                  No quedan tipos disponibles para agregar.
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/profile-select')}
                  className="w-full py-3 bg-[#37352F] hover:bg-[#787774] text-white text-sm font-medium rounded-md transition-colors"
                >
                  Volver a mis perfiles
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {availableOptions.map(({ type, emoji, label, sub }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setProfileType(type)
                      setStep(2)
                    }}
                    className="bg-[#F7F6F3] border border-[rgba(55,53,47,0.09)] hover:border-[rgba(55,53,47,0.24)] rounded-lg p-6 flex flex-col items-center gap-3 transition-all hover:bg-[#F1F1EF]"
                  >
                    <div className="text-4xl">{emoji}</div>
                    <div>
                      <div className="text-sm font-medium text-[#37352F] text-center">{label}</div>
                      <div className="text-[11px] text-[#787774] text-center mt-1 leading-snug">
                        {sub}
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
                ← Cancelar y volver a mis perfiles
              </button>
            )}
          </div>
        )}

        {step === 2 && profileType && (
          <div>
            <h1 className="text-2xl font-medium text-[#37352F] text-center mb-2">Tu perfil</h1>
            <p className="text-sm text-[#787774] text-center mb-8">
              {PROFILE_LABELS[profileType].emoji} {PROFILE_LABELS[profileType].role}
            </p>
            <div className="bg-[#F7F6F3] border border-[rgba(55,53,47,0.09)] rounded-lg p-6 space-y-5">
              <div>
                <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  placeholder={getUserFirstName(user) || 'Tu nombre'}
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
                      Estilo
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
                      Nombre de tu negocio
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Distribuciones Norte"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#787774] uppercase tracking-wider mb-3">
                      Categorías que manejas
                    </label>
                    <div className="space-y-2">
                      {DIST_CATEGORIES.map(({ key, label }) => (
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
                          <span className="text-sm font-medium">{label}</span>
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
                ← Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canContinueStep2()}
                className="flex-1 py-3 bg-[#37352F] hover:bg-[#787774] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-2xl font-medium text-[#37352F] text-center mb-2">Activa tu cámara</h1>
            <p className="text-sm text-[#787774] text-center mb-8">
              Para analizar muestras con IA necesitamos acceso a tu cámara
            </p>
            <div className="bg-[#F7F6F3] border border-[rgba(55,53,47,0.09)] rounded-lg p-8 flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#1D9E7520] border border-[#0F6E56] flex items-center justify-center text-4xl">
                {cameraGranted === null ? '📷' : cameraGranted ? '✅' : '❌'}
              </div>
              {cameraGranted === null && (
                <>
                  <div className="text-center">
                    <div className="text-sm text-[#37352F] font-medium mb-1">
                      Análisis visual de fermentación
                    </div>
                    <div className="text-xs text-[#787774]">
                      Sube fotos de tus muestras y la IA detecta turbidez, color y sedimentación
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestCamera}
                    className="w-full py-3 bg-[#37352F] hover:bg-[#787774] text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Permitir acceso a cámara
                  </button>
                </>
              )}
              {cameraGranted === true && (
                <div className="text-sm text-[#5DCAA5] font-medium">¡Cámara activada! ✓</div>
              )}
              {cameraGranted === false && (
                <div className="text-sm text-[#EF9F27] font-medium">
                  Puedes activarla después desde tu navegador
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-3 border border-[rgba(55,53,47,0.09)] text-[#787774] hover:text-[#37352F] text-sm rounded-md transition-colors"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="flex-1 py-3 bg-[#37352F] hover:bg-[#787774] disabled:opacity-40 text-white text-sm font-medium rounded-md transition-colors"
              >
                {saving
                  ? 'Guardando...'
                  : isAddMode
                    ? 'Crear perfil →'
                    : 'Entrar a PROOF →'}
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
                Omitir por ahora
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingContent />
    </Suspense>
  )
}
