'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export const MOBILE_BOTTOM_NAV_HEIGHT = 56

export type MobileNavItem = {
  href: string
  label: string
  icon: React.ReactNode
}

export function MobileBottomNav({
  primaryItems,
  overflowItems,
  settingsHref = '/dashboard/settings',
  settingsIcon,
}: {
  primaryItems: MobileNavItem[]
  overflowItems: MobileNavItem[]
  settingsHref?: string
  settingsIcon: React.ReactNode
}) {
  const path = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const tabs = primaryItems.slice(0, 4)
  const hasMore = overflowItems.length > 0

  function isActive(href: string) {
    return path === href || (href !== '/dashboard' && path.startsWith(href))
  }

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="proof-mobile-bottom-nav"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          height: MOBILE_BOTTOM_NAV_HEIGHT,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxSizing: 'content-box',
          display: 'flex',
          alignItems: 'stretch',
          background: 'var(--ink)',
          borderTop: '1px solid var(--hairline)',
        }}
      >
        {tabs.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              style={{
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
              }}
            >
              <span style={{ display: 'flex', opacity: active ? 1 : 0.72 }}>{item.icon}</span>
              <span style={{ lineHeight: 1 }}>{item.label}</span>
            </Link>
          )
        })}

        {hasMore ? (
          <button
            type="button"
            aria-label="Más secciones"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(v => !v)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              minHeight: 44,
              minWidth: 44,
              border: 'none',
              background: 'transparent',
              color: sheetOpen ? 'var(--fg-0)' : 'var(--fg-3)',
              fontSize: 10,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
            <span>Más</span>
          </button>
        ) : (
          <Link
            href={settingsHref}
            aria-label="Configuración"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              minHeight: 44,
              minWidth: 44,
              textDecoration: 'none',
              color: isActive(settingsHref) ? 'var(--fg-0)' : 'var(--fg-3)',
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            {settingsIcon}
            <span>Ajustes</span>
          </Link>
        )}
      </nav>

      {sheetOpen && hasMore && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setSheetOpen(false)}
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
            aria-label="Más secciones"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: `calc(${MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
              zIndex: 46,
              background: 'var(--ink)',
              borderTop: '1px solid var(--hairline)',
              borderRadius: '12px 12px 0 0',
              padding: '12px 8px 8px',
              boxShadow: 'var(--shadow-md)',
              maxHeight: 'min(60vh, 360px)',
              overflowY: 'auto',
            }}
          >
            {[...overflowItems, { href: settingsHref, label: 'Configuración', icon: settingsIcon }].map(
              item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    minHeight: 48,
                    textDecoration: 'none',
                    color: 'var(--fg-0)',
                    fontSize: 15,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <span style={{ color: 'var(--fg-2)', display: 'flex' }}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            )}
          </div>
        </>
      )}
    </>
  )
}
