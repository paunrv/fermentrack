'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchTeamAccess,
  fetchTeamMembers,
  inviteTeamMember,
  type TeamMemberRow,
} from '@/app/actions/equipo'

const PROFILE_LABEL: Record<string, string> = {
  winemaker: '🍇 Winemaker',
  bodega: '📦 Bodega',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  invited: 'Invitado',
  suspended: 'Suspendido',
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

export default function EquipoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [profileType, setProfileType] = useState<'winemaker' | 'bodega'>('winemaker')

  async function loadMembers() {
    setLoading(true)
    setError(null)
    try {
      const access = await fetchTeamAccess()
      if (!access.isOwner) {
        router.replace('/dashboard')
        return
      }
      const rows = await fetchTeamMembers()
      setMembers(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMembers()
  }, [router])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await inviteTeamMember({ email, name, profileType })
      setEmail('')
      setName('')
      setProfileType('winemaker')
      setShowForm(false)
      await loadMembers()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo enviar la invitación')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '20px 16px 24px', maxWidth: 560, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600 }}>👥 Mi equipo</h1>
        <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.5 }}>
          Invita a tu equipo y asigna acceso de winemaker o bodega.
        </p>
      </header>

      <button
        type="button"
        onClick={() => setShowForm(v => !v)}
        style={{
          width: '100%',
          marginBottom: 20,
          padding: '12px 14px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--hairline)',
          background: 'var(--panel)',
          color: 'var(--fg-0)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
        }}
      >
        + Invitar persona
      </button>

      {showForm && (
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
              Email
            </label>
            <input
              id="equipo-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={input}
              placeholder="persona@bodega.com"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="equipo-name" style={label}>
              Nombre
            </label>
            <input
              id="equipo-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              style={input}
              placeholder="Nombre completo"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="equipo-role" style={label}>
              Rol
            </label>
            <select
              id="equipo-role"
              value={profileType}
              onChange={e => setProfileType(e.target.value as 'winemaker' | 'bodega')}
              style={input}
            >
              <option value="winemaker">🍇 Winemaker</option>
              <option value="bodega">📦 Bodega</option>
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
              {saving ? 'Enviando…' : 'Enviar invitación'}
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
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>Cargando miembros…</p>
      ) : error ? (
        <p style={{ color: 'var(--red)', fontSize: 14 }}>{error}</p>
      ) : members.length === 0 ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>Aún no hay miembros en tu organización.</p>
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
                    {member.fullName || member.email || 'Sin nombre'}
                  </p>
                  {member.email && (
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--fg-2)' }}>{member.email}</p>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>
                    {member.profileType
                      ? PROFILE_LABEL[member.profileType] ?? member.profileType
                      : member.orgRole === 'owner'
                        ? '👑 Owner'
                        : 'Miembro'}
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
                  {STATUS_LABEL[member.status] ?? member.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
