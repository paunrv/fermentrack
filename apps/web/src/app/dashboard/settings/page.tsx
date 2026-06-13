'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  upsertProfile,
  deleteProfile,
  SUPER_USER_EMAIL,
  type ExtraProfile,
  type Profile,
} from '@/lib/supabase'



const PROFILE_META: Record<
  ExtraProfile,
  { emoji: string; label: string; color: string }
> = {
  brewer: { emoji: '🍺', label: 'Brewer', color: '#FAC775' },
  winemaker: { emoji: '🍷', label: 'Winemaker', color: '#9FE1CB' },
  distiller: { emoji: '🥃', label: 'Distiller', color: '#F5C4B3' },
  distributor: { emoji: '📦', label: 'Distribuidor', color: '#B5D4F4' },
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
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { allProfiles, activeProfile, reload, loading } = useProfile()
  const supabase = useSupabase()

  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [deletingType, setDeletingType] = useState<ExtraProfile | null>(null)

  const [username, setUsername] = useState('')
  const [isSuperUser, setIsSuperUser] = useState(false)

  const email = user?.primaryEmailAddress?.emailAddress || ''
  const isSuperEmail = email.toLowerCase() === SUPER_USER_EMAIL.toLowerCase()

  useEffect(() => {
    if (!activeProfile) {
      setUsername(user?.firstName || '')
      setIsSuperUser(isSuperEmail)
      return
    }
    setUsername(activeProfile.username || '')
    setIsSuperUser(activeProfile.is_super_user || isSuperEmail)
  }, [activeProfile, user, isSuperEmail])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !activeProfile) return

    setSaving(true)
    try {
      await upsertProfile(supabase, {
        clerk_id: user.id,
        profile_type_v2: activeProfile.profile_type_v2,
        profile_type: activeProfile.profile_type,
        username: username.trim() || user.firstName || 'Productor',
        is_super_user: isSuperUser,
        extra_profiles: activeProfile.extra_profiles || [],
        email,
        onboarding_complete: activeProfile.onboarding_complete,
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
      alert('No puedes eliminar el perfil activo. Cambia de perfil primero.')
      return
    }
    const meta = PROFILE_META[profile.profile_type_v2]
    if (!confirm(`¿Eliminar el perfil "${meta.label}"? Esta acción no se puede deshacer.`)) {
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
        <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
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
            Settings
          </h1>
          <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
            Configuración del perfil activo y gestión de todos tus perfiles
          </p>
        </div>
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
          Cambiar perfil
        </button>
      </div>

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
          Mis perfiles ({allProfiles.length}/5)
        </div>

        {allProfiles.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>
            No tienes perfiles aún. Crea el primero desde el onboarding.
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
                        {p.username || meta.label}
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
                        {meta.label}
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
                        Activo
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
                        Super
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
                      ? 'Eliminando...'
                      : isActive
                        ? 'Perfil activo'
                        : 'Eliminar perfil'}
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
              Perfil activo · {PROFILE_META[activeProfile.profile_type_v2].label}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#888',
                fontWeight: 500,
                marginBottom: 20,
              }}
            >
              Editando datos del perfil activo. Para editar otro, cámbialo primero.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <div>
                <label style={label}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={input}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div>
                <label style={label}>Correo (Clerk)</label>
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
                <label style={label}>Tipo de perfil</label>
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
                  {PROFILE_META[activeProfile.profile_type_v2].label}
                </div>
              </div>
              <div>
                <label style={label}>Identificador</label>
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
                  Super usuario
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: isSuperUser ? '#aaa' : '#888',
                    lineHeight: 1.4,
                  }}
                >
                  {isSuperEmail
                    ? 'Tu correo coincide con el super-usuario maestro: este modo siempre se activará al guardar.'
                    : 'Activa este modo para que este perfil vea todos los módulos del sidebar.'}
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
                aria-label="Toggle super usuario"
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
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '14px 24px',
                background: 'var(--fg-0)',
                color: '#fff',
                border: '1px solid var(--hairline)',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.5 : 1,
                fontFamily: 'var(--font-display)',
              }}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
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
                Guardado{' '}
                {savedAt.toLocaleTimeString('es-MX', {
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
