'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Badge } from '@fermentrack/ui'
import {
  groupPipelineByEtapa,
  PIPELINE_LOTS_PER_COLUMN_SCROLL,
  shouldCollapsePipelineCards,
  type PipelineColumn,
  type PipelineColumnTone,
  type PipelineLot,
} from '@/lib/proof/pipeline-lot-meta'
import type { LotEtapa } from '@/lib/proof/lot-etapa'

const COLUMN_UNDERLINE: Record<PipelineColumnTone, string> = {
  neutral: 'var(--hairline)',
  accent: 'var(--proof-accent)',
  danger: 'var(--crit)',
}

type PipelineBodegaProps = {
  lots: PipelineLot[]
  etapaLabel: (etapa: LotEtapa) => string
}

function PipelineColumnHeader({
  column,
  etapaLabel,
}: {
  column: PipelineColumn
  etapaLabel: (etapa: LotEtapa) => string
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-0)' }}>
          {etapaLabel(column.etapa)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
          {column.lots.length}
        </span>
      </div>
      <div
        aria-hidden
        style={{
          height: 3,
          borderRadius: 999,
          background: COLUMN_UNDERLINE[column.tone],
          opacity: column.tone === 'neutral' ? 0.6 : 1,
        }}
      />
    </div>
  )
}

function LotPipelineCard({ lot }: { lot: PipelineLot }) {
  const router = useRouter()
  const t = useTranslations('winemaker.home.pipeline')

  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/winemaker/lotes/${lot.id}`)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 10px 9px',
        borderRadius: 10,
        border: lot.needsAttention
          ? '1px solid color-mix(in srgb, var(--crit) 45%, var(--hairline))'
          : '1px solid var(--hairline)',
        background: lot.needsAttention ? 'var(--crit-soft)' : 'var(--panel)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-0)', lineHeight: 1.2 }}>
          {lot.code}
        </span>
        {lot.needsAttention ? (
          <Badge
            variant={
              lot.attentionReasons.includes('temp')
                ? 'error'
                : lot.attentionReasons.includes('bottling')
                  ? 'warning'
                  : 'warning'
            }
          >
            {lot.attentionReasons.includes('temp')
              ? t('alertTemp')
              : lot.attentionReasons.includes('bottling')
                ? t('alertBottling')
                : t('alertStale')}
          </Badge>
        ) : null}
      </div>

      {lot.varietal ? (
        <span style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.3 }}>{lot.varietal}</span>
      ) : null}

      <div style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.4 }}>
        <div>{lot.container ?? t('noContainer')}</div>
        <div>{lot.lastMeasurement ?? t('noMeasurement')}</div>
        <div
          style={{
            color:
              lot.recordTiming.kind === 'past' && lot.daysSinceLastRecord > 5
                ? 'var(--warn, var(--fg-2))'
                : 'var(--fg-3)',
            fontWeight:
              lot.recordTiming.kind === 'past' && lot.daysSinceLastRecord > 5 ? 600 : 400,
          }}
        >
          {lot.recordTiming.kind === 'future'
            ? t('scheduledInDays', { days: lot.recordTiming.days })
            : t('daysSinceRecord', { days: lot.recordTiming.days })}
        </div>
      </div>
    </button>
  )
}

function LotPipelineChip({ lot }: { lot: PipelineLot }) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/winemaker/lotes/${lot.id}`)}
      className="ui-chip"
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: 11,
        borderColor: lot.needsAttention
          ? 'color-mix(in srgb, var(--warn) 50%, var(--hairline))'
          : undefined,
        background: lot.needsAttention ? 'var(--warn-soft, var(--panel-2))' : undefined,
      }}
    >
      {lot.code}
    </button>
  )
}

function PipelineColumnView({
  column,
  etapaLabel,
  collapsed,
}: {
  column: PipelineColumn
  etapaLabel: (etapa: LotEtapa) => string
  collapsed: boolean
}) {
  const t = useTranslations('winemaker.home.pipeline')
  const scrollable = !collapsed && column.lots.length > PIPELINE_LOTS_PER_COLUMN_SCROLL

  return (
    <section
      aria-label={etapaLabel(column.etapa)}
      style={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 220,
      }}
    >
      <PipelineColumnHeader column={column} etapaLabel={etapaLabel} />

      {column.lots.length === 0 ? (
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{t('emptyStage')}</p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            overflowY: scrollable ? 'auto' : 'visible',
            maxHeight: scrollable ? 420 : undefined,
            paddingRight: scrollable ? 4 : 0,
          }}
        >
          {collapsed
            ? column.lots.map(lot => <LotPipelineChip key={lot.id} lot={lot} />)
            : column.lots.map(lot => <LotPipelineCard key={lot.id} lot={lot} />)}
        </div>
      )}
    </section>
  )
}

export function PipelineBodega({ lots, etapaLabel }: PipelineBodegaProps) {
  const columns = groupPipelineByEtapa(lots)
  const collapsed = shouldCollapsePipelineCards(lots.length)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        gap: 12,
        alignItems: 'stretch',
      }}
    >
      {columns.map(column => (
        <PipelineColumnView
          key={column.etapa}
          column={column}
          etapaLabel={etapaLabel}
          collapsed={collapsed}
        />
      ))}
    </div>
  )
}
