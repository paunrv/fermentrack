'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'

export type BottomNavItemId = 'inicio' | 'lotes' | 'agenda' | 'conectar' | 'tareas' | 'mas'

export type BottomNavProfile = 'winemaker' | 'bodega'

export const BOTTOM_NAV_ITEMS: Record<
  BottomNavItemId,
  { emoji: string; labelKey: BottomNavItemId; href: string }
> = {
  inicio: { emoji: '🏠', labelKey: 'inicio', href: '/dashboard' },
  lotes: { emoji: '🍷', labelKey: 'lotes', href: '/dashboard/winemaker/lotes' },
  agenda: { emoji: '📅', labelKey: 'agenda', href: '/dashboard/winemaker/agenda' },
  conectar: { emoji: '🔗', labelKey: 'conectar', href: '/dashboard' },
  tareas: { emoji: '✅', labelKey: 'tareas', href: '/bodega' },
  mas: { emoji: '⋯', labelKey: 'mas', href: '/dashboard/settings' },
}

const DEFAULT_SLOTS: Record<BottomNavProfile, BottomNavItemId[]> = {
  winemaker: ['inicio', 'lotes', 'conectar', 'mas'],
  bodega: ['tareas', 'agenda', 'conectar', 'mas'],
}

export type MasMenuItem = {
  emoji: string
  labelKey: keyof typeof MAS_LABEL_KEYS
  href: string
  ownerOnly?: boolean
}

const MAS_LABEL_KEYS = {
  equipo: 'equipo',
  agenda: 'agenda',
  proveedores: 'proveedores',
  documentos: 'documentos',
  gastos: 'gastos',
  ajustes: 'ajustes',
} as const

export const WINEMAKER_MAS_ITEMS: MasMenuItem[] = [
  { emoji: '👥', labelKey: 'equipo', href: '/dashboard/equipo', ownerOnly: true },
  { emoji: '📅', labelKey: 'agenda', href: '/dashboard/winemaker/agenda' },
  { emoji: '🤝', labelKey: 'proveedores', href: '/dashboard/winemaker/proveedores' },
  { emoji: '📄', labelKey: 'documentos', href: '/dashboard/winemaker/documentos' },
  { emoji: '💳', labelKey: 'gastos', href: '/dashboard/winemaker/gastos' },
  { emoji: '⚙️', labelKey: 'ajustes', href: '/dashboard/settings' },
]

export const BODEGA_MAS_ITEMS: MasMenuItem[] = [
  { emoji: '⚙️', labelKey: 'ajustes', href: '/dashboard/settings' },
]

const STORAGE_PREFIX = 'proof_bottom_nav_'

function storageKey(profile: BottomNavProfile) {
  return `${STORAGE_PREFIX}${profile}`
}

function readSlots(profile: BottomNavProfile): BottomNavItemId[] {
  if (typeof window === 'undefined') return DEFAULT_SLOTS[profile]
  try {
    const raw = localStorage.getItem(storageKey(profile))
    if (!raw) return DEFAULT_SLOTS[profile]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length !== 4) return DEFAULT_SLOTS[profile]
    const valid = parsed.every(
      (id): id is BottomNavItemId => typeof id === 'string' && id in BOTTOM_NAV_ITEMS
    )
    if (!valid) return DEFAULT_SLOTS[profile]
    return parsed as BottomNavItemId[]
  } catch {
    return DEFAULT_SLOTS[profile]
  }
}

function writeSlots(profile: BottomNavProfile, slots: BottomNavItemId[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(profile), JSON.stringify(slots))
}

export function useBottomNavSlots(profile: BottomNavProfile) {
  const [slots, setSlotsState] = useState<BottomNavItemId[]>(() => DEFAULT_SLOTS[profile])

  useEffect(() => {
    setSlotsState(readSlots(profile))
  }, [profile])

  const setSlots = useCallback(
    (next: BottomNavItemId[]) => {
      setSlotsState(next)
      writeSlots(profile, next)
    },
    [profile]
  )

  return { slots, setSlots, defaults: DEFAULT_SLOTS[profile] }
}

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function masItemsFor(profile: BottomNavProfile, showEquipo: boolean): MasMenuItem[] {
  const items = profile === 'bodega' ? BODEGA_MAS_ITEMS : WINEMAKER_MAS_ITEMS
  return items.filter(item => !item.ownerOnly || showEquipo)
}

function isMasActive(pathname: string, masItems: MasMenuItem[]) {
  return masItems.some(item => isActivePath(pathname, item.href))
}

export function BottomNav({
  profile,
  captureOpen,
  onCaptureToggle,
  fixed = false,
  showEquipo = false,
}: {
  profile: BottomNavProfile
  captureOpen: boolean
  onCaptureToggle: () => void
  fixed?: boolean
  showEquipo?: boolean
}) {
  const t = useTranslations('dashboard.bottomNav')
  const tItems = useTranslations('dashboard.bottomNav.items')
  const tMas = useTranslations('dashboard.bottomNav.mas')
  const pathname = usePathname()
  const { slots } = useBottomNavSlots(profile)
  const [leftItems, rightItems] = useMemo(() => [slots.slice(0, 2), slots.slice(2, 4)], [slots])
  const [masOpen, setMasOpen] = useState(false)
  const masItems = useMemo(() => masItemsFor(profile, showEquipo), [profile, showEquipo])

  function renderItem(id: BottomNavItemId) {
    const item = BOTTOM_NAV_ITEMS[id]
    const label = tItems(id)
    const active =
      id === 'mas' ? isMasActive(pathname, masItems) : isActivePath(pathname, item.href)
    const isMas = id === 'mas'

    const style: CSSProperties = {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      minHeight: 44,
      minWidth: 44,
      textDecoration: 'none',
      color: active ? 'var(--fg-0)' : 'var(--fg-3)',
      fontSize: 10,
      fontWeight: active ? 600 : 500,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-display)',
    }

    if (isMas) {
      return (
        <button
          key={id}
          type="button"
          aria-label={label}
          aria-expanded={masOpen}
          aria-current={active ? 'page' : undefined}
          onClick={() => setMasOpen(v => !v)}
          style={style}
        >
          <span style={{ fontSize: 18, lineHeight: 1, opacity: active || masOpen ? 1 : 0.72 }}>{item.emoji}</span>
          <span style={{ lineHeight: 1 }}>{label}</span>
        </button>
      )
    }

    return (
      <Link key={id} href={item.href} aria-label={label} aria-current={active ? 'page' : undefined} style={style}>
        <span style={{ fontSize: 16, lineHeight: 1, opacity: active ? 1 : 0.72 }}>{item.emoji}</span>
        <span style={{ lineHeight: 1 }}>{label}</span>
      </Link>
    )
  }

  return (
    <>
    <nav
      aria-label={t('main')}
      className={`proof-bottom-nav-bar proof-mobile-only${fixed ? ' proof-bottom-nav-bar--fixed' : ''}`}
    >
      {leftItems.map(renderItem)}

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 56,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <button
          type="button"
          className="proof-bottom-nav-fab"
          aria-label={captureOpen ? t('closeCapture') : t('capture')}
          aria-expanded={captureOpen}
          onClick={onCaptureToggle}
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            marginTop: -18,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--proof-accent)',
            color: '#fff',
            fontSize: 22,
            fontWeight: 300,
            lineHeight: 1,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(55, 53, 47, 0.20)',
            transform: captureOpen ? 'rotate(45deg)' : 'none',
            transition: 'transform 220ms var(--ease-out)',
          }}
        >
          +
        </button>
      </div>

      {rightItems.map(renderItem)}
    </nav>

    {masOpen && (
      <>
        <button
          type="button"
          aria-label={t('closeMenu')}
          className="proof-mobile-only"
          onClick={() => setMasOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 45,
            background: 'rgba(55, 53, 47, 0.4)',
            border: 'none',
            cursor: 'pointer',
          }}
        />
        <div
          role="dialog"
          aria-label={t('moreSections')}
          className="proof-mobile-only"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 'var(--proof-bottom-nav)',
            zIndex: 46,
            background: 'var(--panel)',
            borderTop: '0.5px solid var(--hairline)',
            borderRadius: '12px 12px 0 0',
            padding: '12px 8px 8px',
            boxShadow: 'var(--shadow-md)',
            maxHeight: 'min(60vh, 360px)',
            overflowY: 'auto',
          }}
        >
          {masItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMasOpen(false)}
              className="proof-bottom-nav-mas-row"
            >
              <span className="proof-bottom-nav-mas-row__emoji" aria-hidden>
                {item.emoji}
              </span>
              <span className="proof-bottom-nav-mas-row__label">{tMas(item.labelKey)}</span>
            </Link>
          ))}
        </div>
      </>
    )}
    </>
  )
}
