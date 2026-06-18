'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useMemo } from 'react'
import { useWinemakerScope } from '@/hooks/useWinemakerScope'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default function WinemakerAgendaPage() {
  const { loading: scopeLoading, ok } = useWinemakerScope()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])

  if (scopeLoading || !ok) {
    return <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>Cargando…</div>
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 720 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Agenda</h1>
          <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.5 }}>
            Tiempos de barrica, muestras de laboratorio y embotellado. Los eventos aparecerán aquí
            cuando registres lotes y fechas en PROOF.
          </p>
        </div>
        <Link
          href="/dashboard"
          style={{
            fontSize: 13,
            color: 'var(--proof-accent, #7c5cbf)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          ← PROOF
        </Link>
      </div>

      <div
        style={{
          borderRadius: 12,
          border: '0.5px solid var(--border)',
          background: 'var(--bg-1)',
          padding: 16,
        }}
      >
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 15,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {MONTH_NAMES[month]} {year}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginBottom: 4,
          }}
        >
          {WEEKDAYS.map(d => (
            <div
              key={d}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--fg-2)',
                textAlign: 'center',
                padding: '4px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            const isToday = day === today
            return (
              <div
                key={`${i}-${day ?? 'x'}`}
                style={{
                  minHeight: 52,
                  padding: 6,
                  borderRadius: 8,
                  border: isToday ? '1px solid var(--proof-accent, #7c5cbf)' : '1px solid transparent',
                  background: day ? 'var(--bg-2)' : 'transparent',
                  opacity: day ? 1 : 0.35,
                }}
              >
                {day ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 600 : 400,
                      color: isToday ? 'var(--proof-accent, #7c5cbf)' : 'var(--fg-1)',
                    }}
                  >
                    {day}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 10,
          border: '1px dashed var(--border)',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--fg-2)',
        }}
      >
        Próximo paso: enlazar eventos de{' '}
        <code style={{ fontSize: 12 }}>wm_events</code> (envejecimiento, embotellado, lab) a cada día
        del calendario.
      </div>
    </div>
  )
}
