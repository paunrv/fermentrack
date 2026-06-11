'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { type ExtraProfile, type Profile } from '@/lib/supabase'
import {
  distillerBlockedFromPath,
  distributorBlockedFromPath,
  isCanvasStylePath,
  isDestiladorPath,
  isProducerOnlyPath,
  isProducerProfile,
} from '@/lib/proof/dashboard-routes'
import type { DestMembresia } from '@/lib/proof/destilador-types'
import {
  CANVAS_BG,
  getProfileTheme,
  proofAccentCssVars,
} from '@/lib/proof/profile-theme'
import { fetchDestiladorMembresia } from '@/lib/supabase/destilador'

type Role = ExtraProfile | 'producer'

interface NavItem {
  href: string
  label: string
  roles: Role[] | 'all'
  icon: React.ReactNode
}

const PRODUCERS: ExtraProfile[] = ['brewer', 'winemaker', 'distiller']

const MEMBRESIA_LABEL: Record<DestMembresia, string> = {
  basico: 'Básico',
  profesional: 'Profesional',
  premium: 'Premium',
}

const ic = (path: React.ReactNode) => (
  <svg
    width="16"
    height="16"
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
  camera: ic(
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
}

const NAV_OPERACION: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', roles: 'all', icon: ICONS.inicio },
  { href: '/dashboard/inventario', label: 'Inventario', roles: 'all', icon: ICONS.inventario },
  { href: '/dashboard/pedidos', label: 'Pedidos', roles: ['distributor'], icon: ICONS.movimientos },
  { href: '/dashboard/movimientos', label: 'Movimientos', roles: 'all', icon: ICONS.movimientos },
  { href: '/dashboard/productos', label: 'Catálogo', roles: 'all', icon: ICONS.catalogo },
]

const NAV_FINANZAS: NavItem[] = [
  { href: '/dashboard/clientes', label: 'Clientes', roles: ['distributor'], icon: ICONS.clientes },
  { href: '/dashboard/credito', label: 'Crédito', roles: ['distributor'], icon: ICONS.movimientos },
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
  if (path.startsWith('/dashboard/destilador/lotes/')) return 'Detalle lote'
  return 'PROOF'
}

function visibleNav(active: Profile | null): NavItem[] {
  if (!active) return NAV_OPERACION
  if (active.is_super_user) return NAV
  const isProducer = PRODUCERS.includes(active.profile_type_v2)
  const isDistiller = active.profile_type_v2 === 'distiller'
  return NAV.filter(n => {
    if (n.roles === 'all') {
      if (
        isDistiller &&
        (n.href === '/dashboard/inventario' ||
          n.href === '/dashboard/movimientos' ||
          n.href === '/dashboard/productos')
      ) {
        return false
      }
      return true
    }
    return n.roles.some(r =>
      r === 'producer' ? isProducer && !isDistiller : r === active.profile_type_v2
    )
  })
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const supabase = useSupabase()
  const { activeProfile, allProfiles, loading, profilesResolved } = useProfile()
  const [ask, setAsk] = useState('')
  const [membresia, setMembresia] = useState<DestMembresia>('basico')
  const askCameraRef = useRef<HTMLInputElement>(null)
  const isOnAssistant = path.startsWith('/dashboard/agente')
  const isCanvas = path === '/dashboard'
  const isCanvasStyle = isCanvasStylePath(path)
  const isDistributor = activeProfile?.profile_type_v2 === 'distributor'
  const isDistiller = activeProfile?.profile_type_v2 === 'distiller'
  const theme = getProfileTheme(activeProfile?.profile_type_v2)
  const pageTitle = pageTitleFor(path)

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.firstName?.[0] || 'U'

  const navItems = loading ? NAV_OPERACION : visibleNav(activeProfile)

  useEffect(() => {
    if (!isLoaded || loading || !profilesResolved) return
    if (!user) return
    if (allProfiles.length > 0) return
    router.replace('/onboarding')
  }, [isLoaded, loading, profilesResolved, user, allProfiles.length, router])

  useEffect(() => {
    if (loading) return
    if (distributorBlockedFromPath(activeProfile?.profile_type_v2, path)) {
      router.replace('/dashboard')
      return
    }
    if (distillerBlockedFromPath(activeProfile?.profile_type_v2, path)) {
      router.replace('/dashboard')
    }
  }, [loading, activeProfile?.profile_type_v2, path, router])

  useEffect(() => {
    if (!isCanvas || !isDistiller || !activeProfile?.clerk_id) return
    let cancelled = false
    void fetchDestiladorMembresia(supabase, activeProfile.clerk_id).then(m => {
      if (!cancelled) setMembresia(m)
    })
    return () => {
      cancelled = true
    }
  }, [isCanvas, isDistiller, activeProfile?.clerk_id, supabase])

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

  const showInnerHeader =
    !isCanvas &&
    !isCanvasStyle &&
    !isOnAssistant &&
    !(isDistributor && (isProducerOnlyPath(path) || isDestiladorPath(path))) &&
    !(isDistiller && isProducerOnlyPath(path))

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: isCanvas || isCanvasStyle ? CANVAS_BG : 'var(--ink)',
        color: isCanvasStyle ? '#1A1A1A' : 'var(--fg-1)',
        ...proofAccentCssVars(theme),
      }}
    >
      {!isCanvas && (
        <aside
          style={{
            width: 52,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: theme.navGradient,
            padding: '14px 0 12px',
            zIndex: 20,
          }}
        >
          <Link
            href="/dashboard"
            aria-label="PROOF · Inicio"
            style={{
              textDecoration: 'none',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 14,
              width: 36,
              height: 36,
            }}
          >
            <span
              aria-hidden
              className="mono"
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.08em',
                lineHeight: 1.15,
                textAlign: 'center',
                color: '#fff',
              }}
            >
              PR
              <br />
              OF
            </span>
          </Link>

          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              width: '100%',
              padding: '0 8px',
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {navItems.map((item, index) => {
              const active =
                path === item.href ||
                (item.href !== '/dashboard' && path.startsWith(item.href))
              const iconColor = theme.navText[index % theme.navText.length]!
              return (
                <SideRailLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={active}
                  iconColor={iconColor}
                  accent={theme.accent}
                />
              )
            })}
          </nav>

          <div style={{ marginTop: 'auto', width: '100%', padding: '0 8px' }}>
            <SideRailLink
              href="/dashboard/settings"
              label="Configuración"
              icon={ICONS.ajustes}
              active={path.startsWith('/dashboard/settings')}
              iconColor={theme.navText[0]}
              accent={theme.accent}
            />
          </div>
        </aside>
      )}

      <main
        style={{
          flex: 1,
          minWidth: 0,
          background: isCanvas || isCanvasStyle ? CANVAS_BG : 'var(--ink)',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isCanvas && (
          <header
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              height: 56,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px',
              background: CANVAS_BG,
              borderBottom: `2px solid ${theme.accent}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  color: '#1A1A1A',
                }}
              >
                PR<span style={{ color: theme.accent }}>O</span>OF
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  borderRadius: 4,
                  padding: '3px 8px',
                  background: theme.badge.bg,
                  color: theme.badge.color,
                  border: `0.5px solid ${theme.badge.border}`,
                  letterSpacing: '0.06em',
                }}
              >
                {theme.label.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isDistiller && (
                <span
                  style={{
                    fontSize: 10,
                    color: '#BBB',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                >
                  {MEMBRESIA_LABEL[membresia]}
                </span>
              )}
              <AvatarMenu
                initials={initials}
                imageUrl={user?.imageUrl}
                accent={theme.accent}
                canSwitchProfile={allProfiles.length > 1}
                onSwitchProfile={() => router.push('/profile-select')}
                onSignOut={() => signOut({ redirectUrl: '/sign-in' })}
              />
            </div>
          </header>
        )}

        {showInnerHeader && (
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
                style={{ width: 5, height: 5, background: 'var(--proof-accent)' }}
              />
            </div>

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
                e.currentTarget.style.borderColor = 'var(--proof-accent)'
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
                  color: 'var(--proof-accent)',
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
                  e.currentTarget.style.borderColor = 'var(--proof-accent)'
                  e.currentTarget.style.color = 'var(--proof-accent)'
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
                  background: ask.trim() ? 'var(--proof-accent)' : 'var(--canvas)',
                  border: '1px solid',
                  borderColor: ask.trim() ? 'var(--proof-accent)' : 'var(--hairline)',
                  color: ask.trim() ? '#fff' : 'var(--fg-4)',
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <AvatarMenu
                initials={initials}
                imageUrl={user?.imageUrl}
                accent={theme.accent}
                canSwitchProfile={allProfiles.length > 1}
                onSwitchProfile={() => router.push('/profile-select')}
                onSignOut={() => signOut({ redirectUrl: '/sign-in' })}
              />
            </div>
          </header>
        )}

        <input
          ref={askCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraChange}
          style={{ display: 'none' }}
        />

        <div style={{ flex: 1, minHeight: 0, paddingTop: isCanvas ? 56 : 0 }}>{children}</div>
      </main>
    </div>
  )
}

function AvatarMenu({
  initials,
  imageUrl,
  accent,
  canSwitchProfile,
  onSwitchProfile,
  onSignOut,
}: {
  initials: string
  imageUrl?: string | null
  accent: string
  canSwitchProfile: boolean
  onSwitchProfile: () => void
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Menú de cuenta"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          padding: 0,
          border: 'none',
          background: `${accent}18`,
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: accent,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 168,
            background: '#fff',
            border: '0.5px solid #E8E8E4',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            padding: '6px 0',
            zIndex: 50,
          }}
        >
          {canSwitchProfile && (
            <DropdownItem
              label="Cambiar perfil"
              onClick={() => {
                setOpen(false)
                onSwitchProfile()
              }}
            />
          )}
          <DropdownItem
            label="Configuración"
            href="/dashboard/settings"
            onNavigate={() => setOpen(false)}
          />
          <DropdownItem
            label="Cerrar sesión"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
          />
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  label,
  href,
  onClick,
  onNavigate,
}: {
  label: string
  href?: string
  onClick?: () => void
  onNavigate?: () => void
}) {
  const style: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: 13,
    color: '#1A1A1A',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'inherit',
  }

  if (href) {
    return (
      <Link href={href} role="menuitem" style={style} onClick={onNavigate}>
        {label}
      </Link>
    )
  }

  return (
    <button type="button" role="menuitem" style={style} onClick={onClick}>
      {label}
    </button>
  )
}

function SideRailLink({
  href,
  label,
  icon,
  active,
  iconColor,
  accent,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
  iconColor: string
  accent: string
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        width: '100%',
        height: 36,
        textDecoration: 'none',
        color: active ? '#fff' : iconColor,
        background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
        borderRadius: 8,
        transition: 'background 180ms var(--ease-out), color 180ms var(--ease-out)',
      }}
      onMouseEnter={e => {
        if (active) return
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
        e.currentTarget.style.color = '#fff'
      }}
      onMouseLeave={e => {
        if (active) return
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = iconColor
      }}
    >
      {active && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            width: 2,
            height: 20,
            background: accent,
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
    </Link>
  )
}
