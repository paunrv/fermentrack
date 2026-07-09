'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CollapsibleSection } from '@/components/proof/CollapsibleSection'
import { LabSampleResultsTable } from '@/components/proof/LabSampleResultsTable'
import { fmtDateOnly } from '@/lib/proof/format'
import { labProductionStageLabel } from '@/lib/proof/lab-display'
import type { LotLabSample } from '@/lib/proof/fetch-lab-reports'

export function LotLabAnalysisSection({ samples }: { samples: LotLabSample[] }) {
  const t = useTranslations('winemaker.lab.lotSection')

  if (samples.length === 0) {
    return null
  }

  return (
    <div
      style={{
        marginTop: 20,
        borderTop: '0.5px solid var(--hairline)',
        paddingTop: 4,
      }}
    >
      <CollapsibleSection
        emoji="🧪"
        title={t('title')}
        badge={samples.length}
        defaultOpen={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {samples.map(sample => {
            const stageLabel = labProductionStageLabel(sample.production_stage)
            const report = sample.lab_report

            return (
              <div
                key={sample.id}
                style={{
                  paddingBottom: 16,
                  borderBottom: '0.5px solid var(--hairline)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--fg-0)',
                      }}
                    >
                      {sample.sample_code}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
                      {report.laboratory_name} · {report.folio}
                    </p>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--proof-accent)',
                    }}
                  >
                    {t('sampledOn', { date: fmtDateOnly(report.sampled_at) })}
                  </p>
                </div>

                {stageLabel ? (
                  <span
                    style={{
                      display: 'inline-block',
                      marginBottom: 8,
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

                <Link
                  href="/dashboard/lab"
                  style={{
                    display: 'inline-block',
                    marginBottom: 8,
                    fontSize: 12,
                    color: 'var(--fg-3)',
                    textDecoration: 'none',
                  }}
                >
                  {t('viewFullReport')}
                </Link>

                <LabSampleResultsTable results={sample.lab_results} />
              </div>
            )
          })}
        </div>
      </CollapsibleSection>
    </div>
  )
}
