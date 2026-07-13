'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useOrganization } from '@/context/OrganizationContext'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerRouteGuard } from '@/hooks/useWinemakerRouteGuard'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { AgendaCaptureSheet } from '@/components/proof/AgendaCaptureSection'
import { dashboardPageShell } from '@/lib/ui/page-shell'
import { fetchDocumentsInRange } from '@/lib/supabase/winemaker'
import { openWinemakerDocumentEvidence } from '@/lib/proof/open-winemaker-document'
import {
  agendaBarToken,
  buildAgendaDayBars,
  buildMonthGrid,
  monthDateRange,
  toIsoDate,
  type AgendaBarKind,
  type AgendaDayEvent,
  type AgendaDaySummary,
} from '@/lib/proof/agenda-day-bars'

export default function WinemakerAgendaPage() {
  const locale = useLocale() as AppLocale
  const t = useTranslations('winemaker.agenda')
  const tCommon = useTranslations('winemaker.common')
  const tEtapa = useTranslations('winemaker.etapa')
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'mobile'
  const { loading: scopeLoading, ok } = useWinemakerRouteGuard()
  const { activeOrg } = useOrganization()
  const supabase = useSupabase()

  const now = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    toIsoDate(now.getFullYear(), now.getMonth(), now.getDate())
  )
  const [dayMap, setDayMap] = useState<Map<string, AgendaDaySummary>>(new Map())
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const todayIso = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate())

  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
        new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      )
    )
  }, [locale])

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
        new Date(viewYear, viewMonth, 1)
      ),
    [locale, viewYear, viewMonth]
  )

  const loadMonth = useCallback(async () => {
    if (!activeOrg?.id) {
      setDayMap(new Map())
      setLoadingDocs(false)
      return
    }
    setLoadingDocs(true)
    setLoadError(null)
    try {
      const { from, to } = monthDateRange(viewYear, viewMonth)
      const docs = await fetchDocumentsInRange(supabase, activeOrg.id, from, to)
      setDayMap(buildAgendaDayBars(docs))
    } catch {
      setLoadError(t('loadError'))
      setDayMap(new Map())
    } finally {
      setLoadingDocs(false)
    }
  }, [activeOrg?.id, supabase, viewYear, viewMonth, t])

  useEffect(() => {
    void loadMonth()
  }, [loadMonth])

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const selectedSummary = selectedDate ? dayMap.get(selectedDate) : undefined
  const selectedEvents = selectedSummary?.events ?? []

  const selectedLabel = useMemo(() => {
    if (!selectedDate) return ''
    const [y, m, d] = selectedDate.split('-').map(Number)
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(y!, m! - 1, d!))
  }, [locale, selectedDate])

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>{tCommon('loading')}</div>
    )
  }

  const backLink = (
    <Link
      href="/dashboard"
      style={{
        fontSize: 13,
        color: 'var(--proof-accent)',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {t('backToProof')}
    </Link>
  )

  const monthNav = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
      }}
    >
      <button type="button" aria-label={t('prevMonth')} onClick={() => shiftMonth(-1)} style={navBtnStyle}>
        ‹
      </button>
      <p
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 600,
          textTransform: 'capitalize',
          textAlign: 'center',
          flex: 1,
        }}
      >
        {monthLabel}
      </p>
      <button type="button" aria-label={t('nextMonth')} onClick={() => shiftMonth(1)} style={navBtnStyle}>
        ›
      </button>
    </div>
  )

  const legend = (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 14,
        fontSize: 11,
        color: 'var(--fg-3)',
      }}
    >
      {(['whiteboard', 'lab', 'bodega'] as AgendaBarKind[]).map(kind => (
        <span key={kind} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden
            style={{
              width: 14,
              height: 4,
              borderRadius: 2,
              background: agendaBarToken(kind),
            }}
          />
          {t(`legend.${kind}`)}
        </span>
      ))}
    </div>
  )

  const calendar: ReactNode = (
    <div className="proof-agenda-calendar">
      {monthNav}
      {legend}

      {loadingDocs ? (
        <p style={{ margin: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--fg-3)' }}>
          {t('loading')}
        </p>
      ) : loadError ? (
        <p role="alert" style={{ margin: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--crit)' }}>
          {loadError}
        </p>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              marginBottom: 4,
            }}
          >
            {weekdays.map(d => (
              <div
                key={d}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--fg-3)',
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
              if (day == null) {
                return <div key={`empty-${i}`} style={{ minHeight: 64, opacity: 0.25 }} aria-hidden />
              }
              const iso = toIsoDate(viewYear, viewMonth, day)
              const summary = dayMap.get(iso)
              const isToday = iso === todayIso
              const isSelected = iso === selectedDate
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(iso)}
                  aria-pressed={isSelected}
                  aria-label={iso}
                  style={{
                    minHeight: 64,
                    padding: 6,
                    borderRadius: 8,
                    border: isSelected
                      ? '1.5px solid var(--proof-accent)'
                      : isToday
                        ? '1px solid color-mix(in srgb, var(--proof-accent) 45%, var(--hairline))'
                        : '1px solid var(--hairline)',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--proof-accent) 6%, var(--surface-card))'
                      : 'var(--panel-2)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 4,
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isToday || isSelected ? 600 : 400,
                      color: isSelected || isToday ? 'var(--proof-accent)' : 'var(--fg-1)',
                    }}
                  >
                    {day}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'auto' }}>
                    {(summary?.bars ?? []).map((kind, bi) => (
                      <span
                        key={`${iso}-${bi}`}
                        aria-hidden
                        style={{
                          height: 3,
                          borderRadius: 2,
                          background: agendaBarToken(kind),
                          width: '100%',
                        }}
                      />
                    ))}
                    {(summary?.overflow ?? 0) > 0 ? (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: 'var(--proof-accent)',
                          alignSelf: 'flex-end',
                          lineHeight: 1,
                        }}
                      >
                        {t('overflow', { count: summary!.overflow })}
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )

  const dayPanel: ReactNode = selectedDate ? (
    <section
      aria-label={t('day.eventsAria', { date: selectedLabel })}
      style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '0.5px solid var(--hairline)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            textTransform: 'capitalize',
            color: 'var(--fg-0)',
          }}
        >
          {selectedLabel}
        </h2>
        <button
          type="button"
          onClick={() => setCaptureOpen(true)}
          style={{
            flexShrink: 0,
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--proof-accent)',
            color: 'var(--ink)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('day.capture')}
        </button>
      </div>

      {selectedEvents.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--fg-2)' }}>
          {t('day.empty')}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {selectedEvents.map(ev => (
            <DayEventRow key={ev.id} event={ev} etapaLabel={ev.etapa ? tEtapa(ev.etapa) : null} />
          ))}
        </ul>
      )}
    </section>
  ) : null

  const body = (
    <>
      {calendar}
      {dayPanel}
      <AgendaCaptureSheet
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onUploaded={() => void loadMonth()}
        documentDate={selectedDate}
      />
    </>
  )

  if (isMobile) {
    return (
      <div style={dashboardPageShell(breakpoint, { withBottomNav: true, maxWidth: 720 })}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600 }}>{t('title')}</h1>
            <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.45 }}>
              {t('subtitle')}
            </p>
          </div>
          {backLink}
        </div>
        {body}
      </div>
    )
  }

  return (
    <VuOpsPage title={t('title')} description={t('subtitle')} actions={backLink} narrow>
      {body}
    </VuOpsPage>
  )
}

function DayEventRow({
  event,
  etapaLabel,
}: {
  event: AgendaDayEvent
  etapaLabel: string | null
}) {
  const t = useTranslations('winemaker.agenda')
  const supabase = useSupabase()
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  async function handleOpen() {
    if (opening) return
    setOpening(true)
    setOpenError(null)
    const result = await openWinemakerDocumentEvidence(supabase, event.storagePath)
    setOpening(false)
    if (result === 'missing') setOpenError(t('day.noFile'))
    if (result === 'error') setOpenError(t('day.openError'))
  }

  return (
    <li style={{ listStyle: 'none' }}>
      <button
        type="button"
        onClick={() => void handleOpen()}
        disabled={opening}
        aria-label={t('day.openAria', { title: event.title })}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '0.5px solid var(--hairline)',
          background: 'var(--panel-2)',
          textAlign: 'left',
          cursor: opening ? 'wait' : 'pointer',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 4,
            alignSelf: 'stretch',
            borderRadius: 2,
            background: agendaBarToken(event.source),
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
            {opening ? t('day.opening') : event.title}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
            {t(`legend.${event.source}`)}
            {etapaLabel ? ` · ${etapaLabel}` : ''}
          </p>
          {openError ? (
            <p role="alert" style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--crit)' }}>
              {openError}
            </p>
          ) : null}
        </div>
      </button>
    </li>
  )
}

const navBtnStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: '0.5px solid var(--hairline)',
  background: 'var(--panel-2)',
  color: 'var(--fg-0)',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
}
