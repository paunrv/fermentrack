'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/lotes', label: 'Lotes' },
  { href: '/dashboard/muestras', label: 'Muestras' },
  { href: '/dashboard/embotellado', label: 'Embotellado' },
  { href: '/dashboard/costos', label: 'Costos' },
  { href: '/dashboard/bodega', label: 'Bodega' },
  { href: '/dashboard/etiquetas', label: 'Etiquetas' },
  { href: '/dashboard/agente', label: 'Agente IA' },
]

const font = "'Space Grotesk', sans-serif"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { user } = useUser()

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.firstName?.[0] || 'U'

  const displayName =
    user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Productor'

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
        <Link href="/dashboard" style={{ textDecoration: 'none', marginBottom: 32, padding: '0 4px' }}>
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
          {nav.map(({ href, label }) => {
            const active =
              path === href || (href !== '/dashboard' && path.startsWith(href))

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
        </nav>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 16,
            borderTop: '3px solid #fff',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              style={{
                width: 40,
                height: 40,
                border: '3px solid #fff',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid #111',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
                color: '#111',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: '#aaa',
                marginTop: 2,
              }}
            >
              Productor
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', background: '#fff' }}>{children}</main>
    </div>
  )
}
