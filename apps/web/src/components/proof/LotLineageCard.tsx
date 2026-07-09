'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { CollapsibleSection } from '@/components/proof/CollapsibleSection'
import type { AppLocale } from '@/i18n/routing'
import { fmtDateOnly, fmtLitros } from '@/lib/proof/format'
import type { LotLineageEvent, LotLineageViewModel } from '@/lib/proof/fetch-lot-lineage'

function formatEventDate(iso: string): string {
  return fmtDateOnly(iso.slice(0, 10))
}

function formatEventLine(
  event: LotLineageEvent,
  t: (key: string, values?: Record<string, string | number>) => string,
  locale: AppLocale
): string {
  const date = formatEventDate(event.occurredAt)
  switch (event.eventType) {
    case 'BLEND_COMPLETED':
      return t('blendCompleted', { date })
    case 'WINEMAKER_NOTE': {
      const text = event.payload.text
      return typeof text === 'string' && text.trim()
        ? text.trim()
        : t('winemakerNoteFallback', { date })
    }
    case 'BOTTLED': {
      const caseCount = event.payload.case_count
      const totalBottles = event.payload.total_bottles
      const cases =
        typeof caseCount === 'number'
          ? t('cases', { count: caseCount.toLocaleString(locale) })
          : t('casesDash')
      const bottles =
        typeof totalBottles === 'number'
          ? t('bottles', { count: totalBottles.toLocaleString(locale) })
          : t('bottlesDash')
      return t('bottledSummary', { cases, bottles })
    }
    default:
      return date
  }
}

function BlendCompositionRow({
  parentLotId,
  parentLotCode,
  varietal,
  volumeLitersContributed,
  totalVolumeLiters,
  proportionPct,
  ofTotalLabel,
}: LotLineageViewModel['blendParents'][number] & { ofTotalLabel: string }) {
  return (
    <Link
      href={`/dashboard/winemaker/lotes/${parentLotId}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        padding: '14px 0',
        borderBottom: '0.5px solid var(--hairline)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--fg-0)',
              letterSpacing: '-0.01em',
            }}
          >
            {parentLotCode}
          </p>
          {varietal ? (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{varietal}</p>
          ) : null}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--proof-accent)',
              lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {proportionPct.toFixed(1)}%
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>{ofTotalLabel}</p>
        </div>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: 'var(--panel-2)',
          overflow: 'hidden',
          border: '0.5px solid var(--hairline)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, proportionPct))}%`,
            borderRadius: 999,
            background:
              'linear-gradient(90deg, var(--proof-accent) 0%, color-mix(in srgb, var(--proof-accent) 55%, var(--info)) 100%)',
            boxShadow: '0 0 0 1px color-mix(in srgb, var(--proof-accent) 12%, transparent)',
            transition: 'width 320ms var(--ease-out)',
          }}
        />
      </div>
    </Link>
  )
}

export function LotLineageCard({ lineage }: { lineage: LotLineageViewModel }) {
  const t = useTranslations('winemaker.lotDetail.lineage')
  const locale = useLocale() as AppLocale
  const { blendParents, events, finishedProduct } = lineage
  const isBlend = blendParents.length > 0
  const hasEvents = events.length > 0
  const hasFinishedProduct =
    finishedProduct != null &&
    (finishedProduct.label_cases.length > 0 || finishedProduct.name.length > 0)

  if (!isBlend && !hasEvents && !hasFinishedProduct) {
    return null
  }

  const totalVolume =
    blendParents.length > 0 ? blendParents[0]?.totalVolumeLiters ?? null : null

  return (
    <div
      style={{
        marginTop: 20,
        borderTop: '0.5px solid var(--hairline)',
        paddingTop: 4,
      }}
    >
      {isBlend ? (
        <CollapsibleSection emoji="🍷" title={t('blendComposition')} defaultOpen>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {blendParents.map(parent => (
              <BlendCompositionRow
                key={parent.parentLotId}
                {...parent}
                ofTotalLabel={t('ofTotal', {
                  contributed: fmtLitros(parent.volumeLitersContributed),
                  total: fmtLitros(parent.totalVolumeLiters),
                })}
              />
            ))}
          </div>
          {totalVolume != null ? (
            <p
              style={{
                margin: '12px 0 0',
                paddingTop: 12,
                borderTop: '0.5px solid var(--hairline)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--fg-0)',
              }}
            >
              {t('totalLiters', { liters: fmtLitros(totalVolume) })}
            </p>
          ) : null}
        </CollapsibleSection>
      ) : null}

      {hasEvents ? (
        <CollapsibleSection
          emoji="📋"
          title={t('events')}
          badge={events.length}
          defaultOpen={false}
        >
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {events.map(event => (
              <li
                key={event.id}
                style={{
                  paddingBottom: 12,
                  borderBottom: '0.5px solid var(--hairline)',
                }}
              >
                <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>
                  {formatEventDate(event.occurredAt)}
                </p>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 13,
                    color: 'var(--fg-0)',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {formatEventLine(event, t, locale)}
                </p>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}

      {hasFinishedProduct && finishedProduct ? (
        <CollapsibleSection emoji="📦" title={t('finishedProduct')} defaultOpen>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>
                {finishedProduct.name}
                {finishedProduct.vintage_year != null ? ` ${finishedProduct.vintage_year}` : ''}
              </p>
            </div>
            {finishedProduct.label_cases.map(labelCase => (
              <div
                key={labelCase.id}
                style={{
                  padding: '12px 0',
                  borderTop: '0.5px solid var(--hairline)',
                }}
              >
                {labelCase.case_count != null && labelCase.total_bottles != null ? (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-0)' }}>
                    {t('caseLine', {
                      cases: labelCase.case_count.toLocaleString(locale),
                      perCase: labelCase.bottles_per_case,
                      bottles: labelCase.total_bottles.toLocaleString(locale),
                    })}
                  </p>
                ) : null}
                {labelCase.bottled_at ? (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
                    {t('bottledOn', { date: fmtDateOnly(labelCase.bottled_at) })}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}
    </div>
  )
}
