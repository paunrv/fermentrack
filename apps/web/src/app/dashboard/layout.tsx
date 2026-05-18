'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard',          icon: '⬡', label: 'Dashboard'  },
  { href: '/dashboard/lotes',    icon: '⚗', label: 'Lotes'      },
  { href: '/dashboard/muestras', icon: '◎', label: 'Muestras'   },
  { href: '/dashboard/agente',   icon: '✦', label: 'Agente IA'  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  return (
    <div className="flex min-h-screen bg-[#0a0f0d] text-[#e8f0eb] font-sans">
      {/* Sidebar */}
      <aside className="w-56 border-r border-[#1e3326] flex flex-col py-6 px-4 gap-1 shrink-0">
        <div className="mb-8 px-2">
          <span className="text-[#9FE1CB] font-medium text-lg tracking-tight">
            Fermen<span className="text-[#6b8c78] font-light">Track</span>
          </span>
        </div>
        {nav.map(({ href, icon, label }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[#16221b] text-[#9FE1CB] border border-[#1e3326]'
                  : 'text-[#6b8c78] hover:text-[#e8f0eb] hover:bg-[#111a15]'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
        <div className="mt-auto px-2 pt-6 border-t border-[#1e3326]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1D9E7533] border border-[#0F6E56] flex items-center justify-center text-[10px] font-medium text-[#5DCAA5]">
              JR
            </div>
            <div>
              <div className="text-xs font-medium">Juan Ramos</div>
              <div className="text-[10px] text-[#6b8c78]">Productor</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
