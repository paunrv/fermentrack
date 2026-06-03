'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useProfile } from '@/context/ProfileContext'
import { type ExtraProfile, type Profile } from '@/lib/supabase'
import {
  distillerBlockedFromPath,
  distributorBlockedFromPath,
  isDestiladorPath,
  isProducerOnlyPath,
  isProducerProfile,
} from '@/lib/proof/dashboard-routes'

type Role = ExtraProfile | 'producer'

interface NavItem {
  href: string
  label: string
  roles: Role[] | 'all'
  icon: React.ReactNode
}

const PRODUCERS: ExtraProfile[] = ['brewer', 'winemaker', 'distiller']

const PROFILE_META: Record<ExtraProfile, { label: string }> = {
  brewer: { label: 'Cervecería' },
  winemaker: { label: 'Bodega' },
  distiller: { label: 'Destilería' },
  distributor: { label: 'Distribuidor' },
}

/* ───── Icons (line, calm, no decoration) ────────────────────────── */
const ic = (path: React.ReactNode) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {path}
  </svg>
)

const ICONS = {
  inicio: ic(
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  inventario: ic(
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  movimientos: ic(
    <>
      <path d="M3 12h13" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  catalogo: ic(
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.4" />
    </>
  ),
  clientes: ic(
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </>
  ),
  ajustes: ic(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  switch: ic(
    <>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>
  ),
  camera: ic(
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  arrow: ic(<polyline points="9 18 15 12 9 6" />),
}

const NAV_OPERACION: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', roles: 'all', icon: ICONS.inicio },
  { href: '/dashboard/inventario', label: 'Inventario', roles: 'all', icon: ICONS.inventario },
  { href: '/dashboard/pedidos', label: 'Pedidos', roles: ['distributor'], icon: ICONS.movimientos },
  { href: '/dashboard/movimientos', label: 'Movimientos', roles: 'all', icon: ICONS.movimientos },
  { href: '/dashboard/productos', label: 'Catálogo', roles: 'all', icon: ICONS.catalogo },
]

const NAV_FINANZAS: NavItem[] = [
  { href: '/dashboard/credito', label: 'Crédito', roles: ['distributor'], icon: ICONS.clientes },
  { href: '/dashboard/productores', label: 'Productores', roles: ['distributor'], icon: ICONS.catalogo },
]

const NAV_RECEPCION: NavItem[] = [
  { href: '/dashboard/recepcion', label: 'Entrada', roles: ['distributor'], icon: ICONS.camera },
  { href: '/dashboard/remisiones', label: 'Remisiones', roles: ['distributor'], icon: ICONS.movimientos },
]

const NAV_DESTILADOR: NavItem[] = [
  { href: '/dashboard/destilador/compras', label: 'Compras', roles: ['distiller'], icon: ICONS.movimientos },
  { href: '/dashboard/destilador/lotes', label: 'Lotes', roles: ['distiller'], icon: ICONS.inventario },
  { href: '/dashboard/destilador/produccion', label: 'Producción', roles: ['distiller'], icon: ICONS.catalogo },
  { href: '/dashboard/destilador/bodega', label: 'Bodega', roles: ['distiller'], icon: ICONS.inventario },
  { href: '/dashboard/destilador/ventas', label: 'Ventas', roles: ['distiller'], icon: ICONS.clientes },
]

const NAV_LEGACY: NavItem[] = [
  { href: '/dashboard/clientes', label: 'Clientes', roles: ['producer'], icon: ICONS.clientes },
]

const NAV: NavItem[] = [
  ...NAV_OPERACION,
  ...NAV_FINANZAS,
  ...NAV_RECEPCION,
  ...NAV_DESTILADOR,
  ...NAV_LEGACY,
]

function pageTitleFor(path: string): string {
  if (path === '/dashboard') return 'Inicio'
  if (path.startsWith('/dashboard/inventario')) return 'Inventario'
  if (path.startsWith('/dashboard/pedidos')) return 'Pedidos'
  if (path.startsWith('/dashboard/movimientos')) return 'Movimientos'
  if (path.startsWith('/dashboard/productos')) return 'Catálogo'
  if (path.startsWith('/dashboard/credito')) return 'Crédito'
  if (path.startsWith('/dashboard/productores')) return 'Productores'
  if (path.startsWith('/dashboard/recepcion')) return 'Entrada foto'
  if (path.startsWith('/dashboard/remisiones')) return 'Remisiones'
  if (path.startsWith('/dashboard/etiquetas')) return 'Etiquetas'
  if (path.startsWith('/dashboard/clientes')) return 'Clientes'
  if (path.startsWith('/dashboard/agente')) return 'PROOF'
  if (path.startsWith('/dashboard/bodega')) return 'Almacén'
  if (path.startsWith('/dashboard/lotes')) return 'Lotes'
  if (path.startsWith('/dashboard/embotellado')) return 'Embotellado'
  if (path.startsWith('/dashboard/muestras')) return 'Muestras'
  if (path.startsWith('/dashboard/costos')) return 'Costos'
  if (path.startsWith('/dashboard/settings')) return 'Ajustes'
  if (path.startsWith('/dashboard/destilador/compras')) return 'Compras'
  if (path.startsWith('/dashboard/destilador/lotes')) return 'Lotes'
  if (path.startsWith('/dashboard/destilador/produccion')) return 'Producción'
  if (path.startsWith('/dashboard/destilador/bodega')) return 'Bodega'
  if (path.startsWith('/dashboard/destilador/ventas')) return 'Ventas'
  return 'PROOF'
}

function visibleNav(active: Profile | null): NavItem[] {
  if (!active) return NAV_OPERACION
  if (active.is_super_user) return NAV
  const isProducer = PRODUCERS.includes(active.profile_type_v2)
  const isDistiller = active.profile_type_v2 === 'distiller'
  return NAV.filter(n => {
    if (n.roles === 'all') {
      if (isDistiller && (n.href === '/dashboard/inventario' || n.href === '/dashboard/movimientos' || n.href === '/dashboard/productos')) {
        return false
      }
      return true
    }
    return n.roles.some(r => (r === 'producer' ? isProducer && !isDistiller : r === active.profile_type_v2))
  })
}

function navSections(active: Profile | null): { label: string; items: NavItem[] }[] {
  const items = visibleNav(active)
  const pick = (list: NavItem[]) => list.filter(i => items.some(v => v.href === i.href))
  const sections: { label: string; items: NavItem[] }[] = [
    { label: 'Operación', items: pick(NAV_OPERACION) },
  ]
  const fin = pick(NAV_FINANZAS)
  if (fin.length) sections.push({ label: 'Finanzas', items: fin })
  const rec = pick(NAV_RECEPCION)
  if (rec.length) sections.push({ label: 'Recepción', items: rec })
  const dest = pick(NAV_DESTILADOR)
  if (dest.length) sections.push({ label: 'Destilador', items: dest })
  const leg = pick(NAV_LEGACY)
  if (leg.length) sections.push({ label: 'Red', items: leg })
  return sections.filter(s => s.items.length > 0)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { activeProfile, allProfiles, loading } = useProfile()
  const [ask, setAsk] = useState('')
  const askCameraRef = useRef<HTMLInputElement>(null)
  const isOnAssistant = path.startsWith('/dashboard/agente')
  const isDistributor = activeProfile?.profile_type_v2 === 'distributor'
  const isDistiller = activeProfile?.profile_type_v2 === 'distiller'

  useEffect(() => {
    if (!isLoaded || loading) return
    if (user && allProfiles.length === 0) {
      router.replace('/onboarding')
    }
  }, [isLoaded, loading, user, allProfiles.length, router])

  useEffect(() => {
    if (loading) return
    if (distributorBlockedFromPath(activeProfile?.profile_type_v2, path)) {
      router.replace('/dashboard')
      return
    }
    if (distillerBlockedFromPath(activeProfile?.profile_type_v2, path)) {
      router.replace('/dashboard/destilador/compras')
      return
    }
    if (
      activeProfile?.profile_type_v2 === 'distiller' &&
      path === '/dashboard'
    ) {
      router.replace('/dashboard/destilador/compras')
    }
  }, [loading, activeProfile?.profile_type_v2, path, router])

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.firstName?.[0] || 'U'

  const sections = loading
    ? [{ label: 'Operación', items: NAV_OPERACION }]
    : navSections(activeProfile)
  const activeMeta = activeProfile ? PROFILE_META[activeProfile.profile_type_v2] : null
  const pageTitle = pageTitleFor(path)

  function submitAsk(e: React.FormEvent) {
    e.preventDefault()
    const q = ask.trim()
    if (!q) return
    setAsk('')
    if (isDistributor) {
      router.push('/dashboard/recepcion')
      return
    }
    if (isProducerProfile(activeProfile?.profile_type_v2)) {
      router.push(`/dashboard/agente?q=${encodeURIComponent(q)}`)
    }
  }

  function handleCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.target.value = ''
    if (isDistributor) {
      router.push('/dashboard/recepcion')
      return
    }
    router.push('/dashboard/agente')
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--ink)',
        color: 'var(--fg-1)',
      }}
    >
      {/* ═════════ SIDEBAR · ICON RAIL ═════════ */}
      <aside
        style={{
          width: 84,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'var(--canvas)',
          borderRight: '1px solid var(--hairline)',
          padding: '18px 0 14px',
          zIndex: 20,
        }}
      >
        {/* Brand mark */}
        <Link
          href="/dashboard"
          aria-label="PROOF · Inicio"
          style={{ textDecoration: 'none', display: 'block', marginBottom: 18 }}
        >
          <div
            aria-hidden
            className="mono"
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              lineHeight: 1.1,
              textAlign: 'center',
            }}
          >
            <span style={{ color: 'var(--fg-0)' }}>PRO</span>
            <span style={{ color: 'var(--gold)' }}>OF</span>
          </div>
        </Link>

        {/* Nav */}
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: '100%',
            padding: '0 8px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {sections.map(section => (
            <div key={section.label}>
              <div
                className="eyebrow"
                style={{
                  fontSize: 8,
                  marginBottom: 4,
                  paddingLeft: 4,
                  opacity: 0.7,
                }}
              >
                {section.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.items.map(item => {
                  const active =
                    path === item.href ||
                    (item.href !== '/dashboard' && path.startsWith(item.href))
                  return (
                    <SideRailLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={active}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: '100%',
            padding: '0 10px',
          }}
        >
          <SideRailLink
            href="/dashboard/settings"
            label="Ajustes"
            icon={ICONS.ajustes}
            active={path.startsWith('/dashboard/settings')}
          />
          <button
            type="button"
            onClick={() => allProfiles.length > 1 && router.push('/profile-select')}
            disabled={allProfiles.length <= 1}
            aria-label="Cambiar perfil"
            style={{
              position: 'relative',
              width: '100%',
              padding: 6,
              background: 'transparent',
              border: '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 180ms var(--ease-out)',
            }}
            onMouseEnter={e => {
              if (allProfiles.length > 1) e.currentTarget.style.borderColor = 'var(--hairline)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  objectFit: 'cover',
                  border: '1px solid var(--line)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--fg-1)',
                }}
              >
                {initials}
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ═════════ MAIN STAGE ═════════ */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          background: 'var(--ink)',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ─── TOP BAR · ASK PROOF ALWAYS VISIBLE ─── */}
        {!isOnAssistant &&
          !(isDistributor && (isProducerOnlyPath(path) || isDestiladorPath(path))) &&
          !(isDistiller && isProducerOnlyPath(path)) && (
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 15,
              backdropFilter: 'blur(14px)',
              background: 'rgba(10, 10, 10, 0.88)',
              borderBottom: '1px solid var(--hairline)',
              padding: '14px 28px',
              display: 'grid',
              gridTemplateColumns: 'minmax(140px, 220px) minmax(0, 1fr) minmax(160px, auto)',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Page name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: '-0.015em',
                  color: 'var(--fg-0)',
                }}
              >
                {pageTitle}
              </span>
              <span
                aria-hidden
                className="status-dot ok live"
                style={{ width: 5, height: 5 }}
              />
            </div>

            {/* PROOF command bar — primary */}
            <form
              onSubmit={submitAsk}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--panel)',
                border: '1px solid var(--hairline)',
                padding: '6px 6px 6px 12px',
                transition: 'border-color 200ms var(--ease-out), background 200ms var(--ease-out)',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--copper-soft)'
                e.currentTarget.style.background = 'var(--panel-2)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--hairline)'
                e.currentTarget.style.background = 'var(--panel)'
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 22,
                  height: 22,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--copper)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                ✦
              </span>
              <input
                type="text"
                value={ask}
                onChange={e => setAsk(e.target.value)}
                placeholder="Pregúntale a PROOF — stock, productos, entregas…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13.5,
                  color: 'var(--fg-0)',
                  letterSpacing: '-0.005em',
                  fontFamily: 'var(--font-display)',
                }}
              />
              <button
                type="button"
                onClick={() => askCameraRef.current?.click()}
                aria-label="Subir foto a PROOF"
                style={{
                  width: 30,
                  height: 30,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--canvas)',
                  border: '1px solid var(--hairline)',
                  color: 'var(--fg-2)',
                  flexShrink: 0,
                  transition: 'color 180ms var(--ease-out), border-color 180ms var(--ease-out)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--copper-soft)'
                  e.currentTarget.style.color = 'var(--copper)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--hairline)'
                  e.currentTarget.style.color = 'var(--fg-2)'
                }}
              >
                {ICONS.camera}
              </button>
              <button
                type="submit"
                disabled={!ask.trim()}
                style={{
                  padding: '7px 12px',
                  background: ask.trim() ? 'var(--copper)' : 'var(--canvas)',
                  border: '1px solid',
                  borderColor: ask.trim() ? 'var(--copper)' : 'var(--hairline)',
                  color: ask.trim() ? 'var(--ink)' : 'var(--fg-4)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  transition: 'background 180ms var(--ease-out), color 180ms var(--ease-out)',
                }}
              >
                Preguntar
              </button>
            </form>

            {/* Right: profile chip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => allProfiles.length > 1 && router.push('/profile-select')}
                disabled={allProfiles.length <= 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  border: '1px solid var(--hairline)',
                  background: 'var(--panel)',
                  color: 'var(--fg-1)',
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  cursor: allProfiles.length > 1 ? 'pointer' : 'default',
                  transition: 'border-color 180ms var(--ease-out)',
                }}
                onMouseEnter={e => {
                  if (allProfiles.length > 1) e.currentTarget.style.borderColor = 'var(--line)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--hairline)'
                }}
              >
                <span
                  aria-hidden
                  style={{ color: 'var(--copper)' }}
                >
                  ●
                </span>
                <span>{activeMeta?.label || 'Perfil'}</span>
                {allProfiles.length > 1 && (
                  <span style={{ color: 'var(--fg-4)', display: 'inline-flex' }}>
                    {ICONS.switch}
                  </span>
                )}
              </button>
            </div>
          </header>
        )}

        {/* Hidden camera input — top bar shortcut */}
        <input
          ref={askCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraChange}
          style={{ display: 'none' }}
        />

        {children}
      </main>
    </div>
  )
}

/* =========================================================================
   SIDE RAIL LINK · icon + label
   ========================================================================= */

function SideRailLink({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 4px 8px',
        textDecoration: 'none',
        color: active ? 'var(--fg-0)' : 'var(--fg-2)',
        background: active ? 'var(--panel)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'var(--line)' : 'transparent',
        transition: 'background 180ms var(--ease-out), color 180ms var(--ease-out), border-color 180ms var(--ease-out)',
      }}
      onMouseEnter={e => {
        if (active) return
        e.currentTarget.style.background = 'var(--panel)'
        e.currentTarget.style.color = 'var(--fg-0)'
      }}
      onMouseLeave={e => {
        if (active) return
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--fg-2)'
      }}
    >
      {active && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: -10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 2,
            height: 16,
            background: 'var(--copper)',
          }}
        />
      )}
      <span style={{ color: active ? 'var(--copper)' : 'inherit' }}>{icon}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.01em',
          color: 'inherit',
        }}
      >
        {label}
      </span>
    </Link>
  )
}
