'use client'

import Link from 'next/link'
import { CollapsibleSection } from '@/components/proof/CollapsibleSection'
import { LabSampleResultsTable } from '@/components/proof/LabSampleResultsTable'
import { fmtDateOnly } from '@/lib/proof/format'
import { labOriginLabel, labProductionStageLabel } from '@/lib/proof/lab-display'
import type { LabReportWithSamples } from '@proof/types'

function secondaryDatesTitle(report: LabReportWithSamples): string | undefined {
  const parts: string[] = []
  if (report.received_at) parts.push(`Recibido: ${fmtDateOnly(report.received_at)}`)
  if (report.analyzed_at) parts.push(`Analizado: ${fmtDateOnly(report.analyzed_at)}`)
  if (report.reported_at) parts.push(`Informado: ${fmtDateOnly(report.reported_at)}`)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

function secondaryDatesLine(report: LabReportWithSamples): string | null {
  const parts: string[] = []
  if (report.received_at) parts.push(`Rec. ${fmtDateOnly(report.received_at)}`)
  if (report.analyzed_at) parts.push(`Anál. ${fmtDateOnly(report.analyzed_at)}`)
  if (report.reported_at) parts.push(`Inf. ${fmtDateOnly(report.reported_at)}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function LabReportCard({ report }: { report: LabReportWithSamples }) {
  const secondaryLine = secondaryDatesLine(report)
  const secondaryTitle = secondaryDatesTitle(report)

  return (
    <article
      style={{
        border: '0.5px solid var(--hairline)',
        borderRadius: 12,
        background: 'var(--panel)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '16px 16px 12px',
          borderBottom: '0.5px solid var(--hairline)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--fg-0)',
                letterSpacing: '-0.01em',
              }}
            >
              {report.laboratory_name}
            </h2>
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  color: 'var(--fg-2)',
                }}
              >
                {report.folio}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--panel-2)',
                  color: 'var(--fg-3)',
                }}
              >
                {labOriginLabel(report.lab_origin)}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Muestreo</p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--proof-accent)',
              }}
            >
              {fmtDateOnly(report.sampled_at)}
            </p>
          </div>
        </div>

        {secondaryLine ? (
          <p
            title={secondaryTitle}
            style={{
              margin: '10px 0 0',
              fontSize: 11,
              color: 'var(--fg-3)',
              lineHeight: 1.4,
            }}
          >
            {secondaryLine}
          </p>
        ) : null}
      </header>

      <div>
        {report.lab_samples.length === 0 ? (
          <p style={{ margin: 0, padding: 16, fontSize: 13, color: 'var(--fg-3)' }}>
            Este informe no tiene muestras registradas.
          </p>
        ) : (
          report.lab_samples.map((sample, index) => {
            const stageLabel = labProductionStageLabel(sample.production_stage)
            return (
              <CollapsibleSection
                key={sample.id}
                emoji="🧪"
                title={sample.sample_code}
                badge={sample.lab_results.length || undefined}
                defaultOpen={index === 0}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stageLabel ? (
                    <span
                      style={{
                        alignSelf: 'flex-start',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'var(--panel-2)',
                        color: 'var(--fg-2)',
                      }}
                    >
                      {stageLabel}
                    </span>
                  ) : null}

                  {sample.lot_id ? (
                    <Link
                      href={`/dashboard/winemaker/lotes/${sample.lot_id}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--proof-accent)',
                        textDecoration: 'none',
                      }}
                    >
                      Ver lote vinculado →
                    </Link>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>
                      Sin lote asignado
                    </p>
                  )}

                  <LabSampleResultsTable results={sample.lab_results} />
                </div>
              </CollapsibleSection>
            )
          })
        )}
      </div>
    </article>
  )
}
