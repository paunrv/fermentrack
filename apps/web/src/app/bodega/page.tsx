'use client'

import { useState } from 'react'
import { BottomNav } from '@/components/proof/BottomNav'
import { CapturePanel } from '@/components/proof/CapturePanel'
import { CollapsibleSection } from '@/components/proof/CollapsibleSection'
import { getProfileTheme, proofAccentCssVars } from '@/lib/proof/profile-theme'

const PENDIENTES = [
  {
    emoji: '🔸',
    title: 'Preparar salida Pedido #1284',
    meta: 'Urgente · 48 cajas Reserva 2022',
  },
  {
    emoji: '⬜',
    title: 'Conteo inventario pasillo B',
    meta: 'Normal · Antes de las 18:00',
  },
  {
    emoji: '🔸',
    title: 'Etiquetar lote importación',
    meta: 'Urgente · 120 botellas',
  },
]

const COMPLETADAS = [
  { emoji: '✅', title: 'Recepción OC #892', meta: 'Completada · 08:42' },
  { emoji: '✅', title: 'Ubicación pallet #44', meta: 'Completada · 07:15' },
]

const CHAT_PREVIEW = [
  { from: 'María', text: '¿Confirmas las 48 cajas para mañana?', time: '10:23' },
]

function TaskRow({ emoji, title, meta }: { emoji: string; title: string; meta: string }) {
  return (
    <div className="proof-task-row">
      <span style={{ fontSize: 16, lineHeight: 1.2 }} aria-hidden>
        {emoji}
      </span>
      <div style={{ minWidth: 0 }}>
        <p className="proof-task-row__title">{title}</p>
        <p className="proof-task-row__meta">{meta}</p>
      </div>
    </div>
  )
}

export default function BodegaHomePage() {
  const theme = getProfileTheme('bodega')
  const [captureOpen, setCaptureOpen] = useState(false)

  return (
    <div className="proof-mobile-home-shell" style={proofAccentCssVars(theme)}>
      <div className="proof-mobile-home-scroll">
        <header className="proof-mobile-home-header">
          <span
            className="proof-mobile-profile-badge"
            style={{
              background: theme.badge.bg,
              color: theme.badge.color,
              border: `1px solid ${theme.badge.border}`,
            }}
          >
            📦 Bodega
          </span>
          <h1 className="proof-mobile-home-title">Carlos</h1>
          <p className="proof-mobile-home-subtitle">3 pendientes · turno mañana</p>
        </header>

        <CollapsibleSection emoji="⬜" title="Pendientes" defaultOpen>
          {PENDIENTES.map(t => (
            <TaskRow key={t.title} emoji={t.emoji} title={t.title} meta={t.meta} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection emoji="✅" title="Completadas" defaultOpen={false}>
          {COMPLETADAS.map(t => (
            <TaskRow key={t.title} emoji={t.emoji} title={t.title} meta={t.meta} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection emoji="💬" title="Chat con María" defaultOpen={false} badge="1 nuevo">
          {CHAT_PREVIEW.map(msg => (
            <div
              key={msg.time}
              className="proof-task-row"
              style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-0)' }}>{msg.from}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{msg.time}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.45 }}>{msg.text}</p>
            </div>
          ))}
        </CollapsibleSection>
      </div>

      <CapturePanel open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <BottomNav
        profile="bodega"
        captureOpen={captureOpen}
        onCaptureToggle={() => setCaptureOpen(v => !v)}
      />
    </div>
  )
}
