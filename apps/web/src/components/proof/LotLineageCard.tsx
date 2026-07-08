'use client'

import Link from 'next/link'
import { CollapsibleSection } from '@/components/proof/CollapsibleSection'
import { fmtDateOnly, fmtLitros } from '@/lib/proof/format'
import type { LotLineageEvent, LotLineageViewModel } from '@/lib/proof/fetch-lot-lineage'

function formatEventDate(iso: string): string {
  return fmtDateOnly(iso.slice(0, 10))
}

function formatEventLine(event: LotLineageEvent): string {
  const date = formatEventDate(event.occurredAt)
  switch (event.eventType) {
    case 'BLEND_COMPLETED':
      return `Blend realizado · ${date}`
    case 'WINEMAKER_NOTE': {
      const text = event.payload.text
      return typeof text === 'string' && text.trim() ? text.trim() : `Nota del enólogo · ${date}`
    }
    case 'BOTTLED': {
      const caseCount = event.payload.case_count
      const totalBottles = event.payload.total_bottles
      const cases =
        typeof caseCount === 'number' ? `${caseCount.toLocaleString('es-MX')} cajas` : '— cajas'
      const bottles =
        typeof totalBottles === 'number'
          ? `${totalBottles.toLocaleString('es-MX')} botellas`
          : '— botellas'
      return `Embotellado · ${cases} · ${bottles}`
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
}: LotLineageViewModel['blendParents'][number]) {
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
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
            {fmtLitros(volumeLitersContributed)} de {fmtLitros(totalVolumeLiters)}
          </p>
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
            background: 'linear-gradient(90deg, var(--proof-accent) 0%, #8B5FCF 100%)',
            boxShadow: '0 0 0 1px rgba(105, 64, 165, 0.12)',
            transition: 'width 320ms var(--ease-out)',
          }}
        />
      </div>
    </Link>
  )
}

export function LotLineageCard({ lineage }: { lineage: LotLineageViewModel }) {
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
        <CollapsibleSection emoji="🍷" title="Composición del blend" defaultOpen>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {blendParents.map(parent => (
              <BlendCompositionRow key={parent.parentLotId} {...parent} />
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
              {fmtLitros(totalVolume)} totales
            </p>
          ) : null}
        </CollapsibleSection>
      ) : null}

      {hasEvents ? (
        <CollapsibleSection
          emoji="📋"
          title="Decisiones y eventos"
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
                  {formatEventLine(event)}
                </p>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}

      {hasFinishedProduct && finishedProduct ? (
        <CollapsibleSection emoji="📦" title="Producto terminado" defaultOpen>
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
                    {labelCase.case_count.toLocaleString('es-MX')} cajas ×{' '}
                    {labelCase.bottles_per_case} ={' '}
                    {labelCase.total_bottles.toLocaleString('es-MX')} botellas
                  </p>
                ) : null}
                {labelCase.bottled_at ? (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
                    Embotellado {fmtDateOnly(labelCase.bottled_at)}
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
