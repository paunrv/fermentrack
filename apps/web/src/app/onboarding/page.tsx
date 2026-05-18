'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'

type ProducerType = 'brewer' | 'winemaker'
type Step = 1 | 2 | 3

const BEER_STYLES = ['Session IPA','IPA','Double IPA','Stout','Porter','Pale Ale','Lager','Wheat','Sour','Saison','Otro']
const WINE_STYLES = ['Chardonnay','Sauvignon Blanc','Pinot Grigio','Cabernet Sauvignon','Merlot','Tempranillo','Malbec','Rosado','Espumoso','Otro']

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [producerType, setProducerType] = useState<ProducerType | null>(null)
  const [username, setUsername] = useState('')
  const [productName, setProductName] = useState('')
  const [productStyle, setProductStyle] = useState('')
  const [saving, setSaving] = useState(false)
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null)

  async function requestCamera() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraGranted(true)
    } catch {
      setCameraGranted(false)
    }
  }

  async function finish() {
    if (!user) return
    setSaving(true)
    const sb = getSupabase()
    await sb.from('profiles').upsert({
      clerk_id: user.id,
      username: username || user.firstName || 'Productor',
      producer_type: producerType,
      onboarding_complete: true,
    }, { onConflict: 'clerk_id' })
    if (productName && productStyle) {
      const id = 'FT-' + Date.now().toString().slice(-4)
      await sb.from('batches').insert({
        id, name: productName,
        type: producerType === 'brewer' ? 'Cerveza artesanal' : 'Vino',
        volume: 0, yeast: null, density: null, ph: null, temp: null,
        day: 1, progress: 0, status: 'active', alert: null,
      })
    }
    setSaving(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        <div className="text-center mb-10">
          <div className="text-2xl font-medium tracking-tight text-[#9FE1CB] mb-1">
            Fermen<span className="text-[#6b8c78] font-light">Track</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1,2,3].map(s => (
              <div key={s} className={`rounded-full transition-all duration-300 ${
                s === step ? 'w-6 h-2 bg-[#1D9E75]' :
                s < step   ? 'w-2 h-2 bg-[#0F6E56]' :
                              'w-2 h-2 bg-[#1e3326]'
              }`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div>
            <h1 className="text-2xl font-medium text-[#e8f0eb] text-center mb-2">I am a...</h1>
            <p className="text-sm text-[#6b8c78] text-center mb-10">Elige tu tipo de producción</p>
            <div className="grid grid-cols-2 gap-4">
              {([
                ['brewer',    '🍺', 'Brewer',     'Cerveza artesanal'],
                ['winemaker', '🍷', 'Winemaker',  'Vino artesanal'],
              ] as const).map(([type, emoji, label, sub]) => (
                <button key={type}
                  onClick={() => { setProducerType(type); setStep(2) }}
                  className="bg-[#16221b] border-2 border-[#1e3326] hover:border-[#1D9E75] rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:bg-[#1a2b21]">
                  <div className="text-5xl">{emoji}</div>
                  <div>
                    <div className="text-base font-medium text-[#e8f0eb] text-center">{label}</div>
                    <div className="text-xs text-[#6b8c78] text-center mt-1">{sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-medium text-[#e8f0eb] text-center mb-2">Tu perfil</h1>
            <p className="text-sm text-[#6b8c78] text-center mb-8">
              {producerType === 'brewer' ? '🍺 Brewer' : '🍷 Winemaker'}
            </p>
            <div className="bg-[#16221b] border border-[#1e3326] rounded-2xl p-6 space-y-5">
              <div>
                <label className="block text-[11px] text-[#6b8c78] uppercase tracking-wider mb-2">Username</label>
                <input type="text"
                  placeholder={user?.firstName || 'Tu nombre de productor'}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-[#111a15] border border-[#1e3326] focus:border-[#0F6E56] rounded-xl px-4 py-3 text-sm text-[#e8f0eb] outline-none placeholder:text-[#3a5a46] transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] text-[#6b8c78] uppercase tracking-wider mb-2">
                  {producerType === 'brewer' ? 'Nombre de tu cerveza' : 'Nombre de tu vino'}
                </label>
                <input type="text"
                  placeholder={producerType === 'brewer' ? 'Ej: Mantis' : 'Ej: El Burro Coyero'}
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className="w-full bg-[#111a15] border border-[#1e3326] focus:border-[#0F6E56] rounded-xl px-4 py-3 text-sm text-[#e8f0eb] outline-none placeholder:text-[#3a5a46] transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] text-[#6b8c78] uppercase tracking-wider mb-2">
                  {producerType === 'brewer' ? 'Estilo' : 'Varietal / tipo'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(producerType === 'brewer' ? BEER_STYLES : WINE_STYLES).map(style => (
                    <button key={style} onClick={() => setProductStyle(style)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        productStyle === style
                          ? 'bg-[#0F6E56] border-[#1D9E75] text-[#e1f5ee]'
                          : 'bg-transparent border-[#1e3326] text-[#6b8c78] hover:border-[#0F6E56] hover:text-[#e8f0eb]'
                      }`}>
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)}
                className="px-4 py-3 border border-[#1e3326] text-[#6b8c78] hover:text-[#e8f0eb] text-sm rounded-xl transition-colors">
                ← Atrás
              </button>
              <button onClick={() => setStep(3)}
                disabled={!username || !productName || !productStyle}
                className="flex-1 py-3 bg-[#0F6E56] hover:bg-[#1D9E75] disabled:opacity-30 disabled:cursor-not-allowed text-[#e1f5ee] text-sm font-medium rounded-xl transition-colors">
                Continuar →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-2xl font-medium text-[#e8f0eb] text-center mb-2">Activa tu cámara</h1>
            <p className="text-sm text-[#6b8c78] text-center mb-8">
              Para analizar muestras con IA necesitamos acceso a tu cámara
            </p>
            <div className="bg-[#16221b] border border-[#1e3326] rounded-2xl p-8 flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#1D9E7520] border border-[#0F6E56] flex items-center justify-center text-4xl">
                {cameraGranted === null ? '📷' : cameraGranted ? '✅' : '❌'}
              </div>
              {cameraGranted === null && (
                <>
                  <div className="text-center">
                    <div className="text-sm text-[#e8f0eb] font-medium mb-1">Análisis visual de fermentación</div>
                    <div className="text-xs text-[#6b8c78]">Sube fotos de tus muestras y la IA detecta turbidez, color y sedimentación</div>
                  </div>
                  <button onClick={requestCamera}
                    className="w-full py-3 bg-[#0F6E56] hover:bg-[#1D9E75] text-[#e1f5ee] text-sm font-medium rounded-xl transition-colors">
                    Permitir acceso a cámara
                  </button>
                </>
              )}
              {cameraGranted === true && (
                <div className="text-sm text-[#5DCAA5] font-medium">¡Cámara activada! ✓</div>
              )}
              {cameraGranted === false && (
                <div className="text-sm text-[#EF9F27] font-medium">Puedes activarla después desde tu navegador</div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)}
                className="px-4 py-3 border border-[#1e3326] text-[#6b8c78] hover:text-[#e8f0eb] text-sm rounded-xl transition-colors">
                ← Atrás
              </button>
              <button onClick={finish} disabled={saving}
                className="flex-1 py-3 bg-[#0F6E56] hover:bg-[#1D9E75] disabled:opacity-40 text-[#e1f5ee] text-sm font-medium rounded-xl transition-colors">
                {saving ? 'Guardando...' : 'Entrar a FermenTrack →'}
              </button>
            </div>
            {cameraGranted === null && (
              <button onClick={finish} disabled={saving}
                className="w-full mt-3 py-2 text-xs text-[#6b8c78] hover:text-[#e8f0eb] transition-colors">
                Omitir por ahora
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}