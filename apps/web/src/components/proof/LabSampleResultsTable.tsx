'use client'

import { useTranslations } from 'next-intl'
import type { LabResult } from '@proof/types'
import {
  formatLabResultValue,
  isCriticalLabParameter,
  labParameterLabel,
} from '@/lib/proof/lab-display'
import { useIsMobile } from '@/hooks/useBreakpoint'

function ResultRow({ result }: { result: LabResult }) {
  const t = useTranslations('winemaker.lab.lotSection')
  const critical = isCriticalLabParameter(result.parameter)

  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '0.5px solid var(--hairline)',
        background: critical ? 'color-mix(in srgb, var(--proof-accent) 6%, transparent)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <span
          style={{
            fontSize: 13,
            color: 'var(--fg-0)',
            fontWeight: critical ? 600 : 400,
            lineHeight: 1.35,
            minWidth: 0,
          }}
        >
          {critical ? (
            <span aria-hidden style={{ color: 'var(--proof-accent)', marginRight: 6 }}>
              ●
            </span>
          ) : null}
          {labParameterLabel(result.parameter)}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: critical ? 600 : 500,
            color: 'var(--fg-0)',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {formatLabResultValue(result)}
        </span>
      </div>
      {result.method ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{result.method}</p>
      ) : null}
    </div>
  )
}

export function LabSampleResultsTable({ results }: { results: LabResult[] }) {
  const isMobile = useIsMobile()

  if (results.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>Sin resultados en esta muestra.</p>
    )
  }

  if (isMobile) {
    return (
      <div style={{ marginTop: 8 }}>
        {results.map(result => (
          <ResultRow key={result.id} result={result} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: '8px 8px 8px 0',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--fg-3)',
                borderBottom: '0.5px solid var(--hairline)',
              }}
            >
              Parámetro
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '8px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--fg-3)',
                borderBottom: '0.5px solid var(--hairline)',
                whiteSpace: 'nowrap',
              }}
            >
              Valor
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '8px 0 8px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--fg-3)',
                borderBottom: '0.5px solid var(--hairline)',
                whiteSpace: 'nowrap',
              }}
            >
              Método
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map(result => {
            const critical = isCriticalLabParameter(result.parameter)
            return (
              <tr
                key={result.id}
                style={{
                  borderBottom: '0.5px solid var(--hairline)',
                  background: critical ? 'color-mix(in srgb, var(--proof-accent) 6%, transparent)' : undefined,
                }}
              >
                <td
                  style={{
                    padding: '10px 8px 10px 0',
                    color: 'var(--fg-0)',
                    fontWeight: critical ? 600 : 400,
                    verticalAlign: 'top',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {critical ? (
                      <span
                        aria-hidden
                        title={t('criticalParam')}
                        style={{ color: 'var(--proof-accent)', fontSize: 12 }}
                      >
                        ●
                      </span>
                    ) : null}
                    {labParameterLabel(result.parameter)}
                  </span>
                </td>
                <td
                  style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    color: 'var(--fg-0)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: critical ? 600 : 500,
                    whiteSpace: 'nowrap',
                    verticalAlign: 'top',
                  }}
                >
                  {formatLabResultValue(result)}
                </td>
                <td
                  style={{
                    padding: '10px 0 10px 8px',
                    textAlign: 'right',
                    color: 'var(--fg-3)',
                    fontSize: 12,
                    verticalAlign: 'top',
                  }}
                >
                  {result.method ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
