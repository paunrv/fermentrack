'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useProfile } from '@/context/ProfileContext'
import { type ExtraProfile, type Profile } from '@/lib/supabase'

type Role = ExtraProfile

interface NavItem {
  href: string
  label: string
  roles: Role[] | 'all'
  icon?: React.ReactNode
}

const PROFILE_META: Record<ExtraProfile, { emoji: string; label: string; color: string }> = {
  brewer: { emoji: '🍺', label: 'Brewer', color: '#FAC775' },
  winemaker: { emoji: '🍷', label: 'Winemaker', color: '#9FE1CB' },
  distiller: { emoji: '🥃', label: 'Distiller', color: '#F5C4B3' },
  distributor: { emoji: '📦', label: 'Distribuidor', color: '#B5D4F4' },
  bar: { emoji: '🍸', label: 'Bar', color: '#F4C0D1' },
}

const GearIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const SwitchIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
)

const PRODUCER_ROLES: Role[] = ['brewer', 'winemaker', 'distiller']

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: 'all' },
  { href: '/dashboard/lotes', label: 'Lotes', roles: PRODUCER_ROLES },
  { href: '/dashboard/muestras', label: 'Muestras', roles: PRODUCER_ROLES },
  { href: '/dashboard/embotellado', label: 'Embotellado', roles: PRODUCER_ROLES },
  { href: '/dashboard/costos', label: 'Costos', roles: PRODUCER_ROLES },
  { href: '/dashboard/bodega', label: 'Bodega', roles: PRODUCER_ROLES },
  { href: '/dashboard/etiquetas', label: 'Etiquetas', roles: PRODUCER_ROLES },
  { href: '/dashboard/productos', label: 'Productos', roles: ['distributor'] },
  { href: '/dashboard/inventario', label: 'Inventario', roles: ['distributor', 'bar'] },
  { href: '/dashboard/movimientos', label: 'Movimientos', roles: ['distributor', 'bar'] },
  { href: '/dashboard/clientes', label: 'Clientes', roles: ['distributor'] },
  { href: '/dashboard/agente', label: 'Agente IA', roles: 'all' },
]

const settingsNav: NavItem = {
  href: '/dashboard/settings',
  label: 'Settings',
  roles: 'all',
  icon: GearIcon,
}

function visibleNav(active: Profile | null): NavItem[] {
  if (!active) return nav.filter(n => n.roles === 'all')
  if (active.is_super_user) return nav

  const allowed = new Set<Role>()
  allowed.add(active.profile_type_v2)

  return nav.filter(item => {
    if (item.roles === 'all') return true
    return item.roles.some(r => allowed.has(r))
  })
}

const font = "'Space Grotesk', sans-serif"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const { activeProfile, allProfiles, loading } = useProfile()

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.firstName?.[0] || 'U'

  const navItems = loading
    ? nav.filter(n => n.roles === 'all')
    : visibleNav(activeProfile)

  const activeMeta = activeProfile ? PROFILE_META[activeProfile.profile_type_v2] : null

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#fff',
        fontFamily: font,
      }}
    >
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#111',
          borderRight: '3px solid #111',
          padding: '24px 16px',
          color: '#fff',
        }}
      >
        <Link
          href="/dashboard"
          style={{ textDecoration: 'none', marginBottom: 24, padding: '0 4px' }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: '#fff',
              textTransform: 'uppercase',
            }}
          >
            Fermen<span style={{ color: '#E24B4A' }}>T</span>rack
          </span>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          {navItems.map(({ href, label }) => {
            const active = path === href || (href !== '/dashboard' && path.startsWith(href))

            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'block',
                  padding: '12px 14px',
                  textDecoration: 'none',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  border: '3px solid #fff',
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#111' : '#fff',
                }}
              >
                {label}
              </Link>
            )
          })}

          <Link
            href={settingsNav.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 'auto',
              padding: '12px 14px',
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              border: '3px solid #fff',
              background: path.startsWith(settingsNav.href) ? '#fff' : 'transparent',
              color: path.startsWith(settingsNav.href) ? '#111' : '#fff',
            }}
          >
            {settingsNav.icon}
            <span>{settingsNav.label}</span>
          </Link>
        </nav>

        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '3px solid #fff',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {activeMeta && activeProfile && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 10,
                background: activeMeta.color,
                border: '3px solid #fff',
                color: '#111',
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  lineHeight: 1,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {activeMeta.emoji}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    color: '#111',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeProfile.username || activeMeta.label}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: '#111',
                    opacity: 0.6,
                    marginTop: 2,
                  }}
                >
                  {activeMeta.label}
                  {activeProfile.is_super_user ? ' · SUPER' : ''}
                </div>
              </div>
            </div>
          )}

          {allProfiles.length > 1 && (
            <button
              type="button"
              onClick={() => router.push('/profile-select')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: 'transparent',
                border: '3px solid #fff',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: font,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {SwitchIcon}
              <span>Cambiar perfil</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid #fff',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid #fff',
                  background: '#111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: '#888',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.primaryEmailAddress?.emailAddress || user?.fullName || 'Usuario'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', background: '#fff' }}>{children}</main>
    </div>
  )
}
