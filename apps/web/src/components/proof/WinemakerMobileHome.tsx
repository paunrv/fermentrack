'use client'

import { useState } from 'react'
import { AlertCard } from '@/components/proof/AlertCard'
import { CollapsibleSection } from '@/components/proof/CollapsibleSection'
import { getProfileTheme, proofAccentCssVars } from '@/lib/proof/profile-theme'
import type { AlertaOperativa } from '@/lib/proof/types'

const MOCK_ALERTAS: AlertaOperativa[] = [
  {
    id: 'a1',
    nivel: 'P1',
    condicion: 'quiebre_inminente',
    titulo: 'Lote #47 sin movimiento 12 días',
    subtexto: 'Cabernet · Tanque T-3 · Última muestra pendiente',
    color: 'rojo',
    acciones: [{ label: 'Ver lote', href: '/dashboard/winemaker/lotes' }],
  },
  {
    id: 'a2',
    nivel: 'P2',
    condicion: 'sku_sin_rotar',
    titulo: 'SO₂ bajo en Reserva 2023',
    subtexto: '35 mg/L · Umbral mínimo 40 mg/L',
    color: 'amarillo',
    acciones: [{ label: 'Programar', href: '/dashboard/winemaker/agenda' }],
  },
]

const MOCK_LOTES = [
  { id: '47', name: 'Cabernet 2024', stage: 'Fermentación · día 8', emoji: '🍷' },
  { id: '44', name: 'Merlot Reserva', stage: 'Barrica · mes 4', emoji: '🛢️' },
  { id: '41', name: 'Blanco Joven', stage: 'Estabilización', emoji: '🥂' },
  { id: '38', name: 'Rosado 2024', stage: 'Embotellado', emoji: '🍾' },
]

const MOCK_CALENDARIO = [
  { time: '09:00', title: 'Muestra SO₂ — Lote #47', emoji: '🧪' },
  { time: '14:30', title: 'Visita proveedor corchos', emoji: '📦' },
]

const MOCK_TAREAS = [
  { title: 'Registrar degüelle Lote #38', meta: 'Hoy · Bodega sur', done: false },
  { title: 'Actualizar bitácora fermentación', meta: 'Mañana', done: false },
  { title: 'Revisar factura corchos', meta: 'Esta semana', done: false },
]

function PlaceholderRow({ emoji, title, meta }: { emoji: string; title: string; meta: string }) {
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

export function WinemakerMobileHome({ displayName }: { displayName: string }) {
  const theme = getProfileTheme('winemaker')
  const alertCount = MOCK_ALERTAS.length

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
            🍇 {theme.label}
          </span>
          <h1 className="proof-mobile-home-title">{displayName}</h1>
          <p className="proof-mobile-home-subtitle">
            {alertCount > 0
              ? `${alertCount} alerta${alertCount === 1 ? '' : 's'} requieren atención`
              : 'Todo en orden hoy'}
          </p>
        </header>

        <CollapsibleSection emoji="🔴" title="Atención ahora" defaultOpen>
          {MOCK_ALERTAS.map(alerta => (
            <AlertCard key={alerta.id} alerta={alerta} fullWidth />
          ))}
        </CollapsibleSection>

        <CollapsibleSection emoji="🍷" title="Lotes activos" defaultOpen={false} badge={4}>
          {MOCK_LOTES.map(lote => (
            <PlaceholderRow key={lote.id} emoji={lote.emoji} title={lote.name} meta={lote.stage} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection emoji="📅" title="Calendario" defaultOpen={false} badge="2 hoy">
          {MOCK_CALENDARIO.map(ev => (
            <PlaceholderRow key={ev.time + ev.title} emoji={ev.emoji} title={ev.title} meta={ev.time} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection emoji="✅" title="Tareas" defaultOpen={false} badge={3}>
          {MOCK_TAREAS.map(t => (
            <PlaceholderRow key={t.title} emoji="⬜" title={t.title} meta={t.meta} />
          ))}
        </CollapsibleSection>
      </div>
    </div>
  )
}
