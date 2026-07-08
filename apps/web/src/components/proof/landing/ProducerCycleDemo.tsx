'use client'

import { useState } from 'react'
import type { ProducerCycleDemoContent } from '@/lib/proof/landing-copy'
import { LANDING } from './landing-theme'

type StageStatus = 'done' | 'active' | 'pending'

function stageStatus(index: number, activeIndex: number): StageStatus {
  if (index < activeIndex) return 'done'
  if (index === activeIndex) return 'active'
  return 'pending'
}

export function ProducerCycleDemo({
  demo,
  accent,
  ariaLabel,
}: {
  demo: ProducerCycleDemoContent
  accent: string
  ariaLabel: string
}) {
  const defaultActive = Math.min(
    Math.max(0, demo.defaultActiveIndex ?? 2),
    demo.stages.length - 1
  )
  const [activeIndex, setActiveIndex] = useState(defaultActive)

  const activeHint =
    demo.stageHints[activeIndex] ??
    demo.hint ??
    demo.stageHints[0] ??
    ''

  return (
    <div
      style={{
        border: `1px solid ${LANDING.border}`,
        borderRadius: 'var(--radius-card)',
        background: LANDING.bg,
        boxShadow: '0 8px 32px rgba(15, 15, 15, 0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          padding: '16px 18px',
          borderBottom: `1px solid ${LANDING.border}`,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: LANDING.text,
            letterSpacing: '0.02em',
          }}
        >
          {demo.lotCode}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: LANDING.textSecondary }}>{demo.varietal}</span>
      </div>

      <div style={{ padding: '20px 16px 18px' }}>
        <div
          style={{
            margin: '0 -4px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}
        >
          <div
            role="group"
            aria-label={ariaLabel}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${demo.stages.length}, minmax(100px, 1fr))`,
              minWidth: demo.stages.length * 100,
              gap: 4,
              padding: '0 4px 4px',
            }}
          >
            {demo.stages.map((label, index) => {
              const status = stageStatus(index, activeIndex)
              const isLast = index === demo.stages.length - 1

              return (
                <div
                  key={`${label}-${index}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      height: 20,
                    }}
                  >
                    {index > 0 ? (
                      <div
                        aria-hidden
                        style={{
                          flex: 1,
                          height: 2,
                          marginRight: 4,
                          borderRadius: 999,
                          background:
                            index <= activeIndex
                              ? accent
                              : `color-mix(in srgb, ${LANDING.border} 80%, transparent)`,
                          transition: 'background 220ms var(--ease-out)',
                        }}
                      />
                    ) : (
                      <div style={{ flex: 1 }} aria-hidden />
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      aria-pressed={status === 'active'}
                      aria-label={label}
                      style={{
                        flexShrink: 0,
                        width: status === 'active' ? 14 : 10,
                        height: status === 'active' ? 14 : 10,
                        borderRadius: '50%',
                        padding: 0,
                        border:
                          status === 'pending'
                            ? `2px solid ${LANDING.border}`
                            : status === 'active'
                              ? `2px solid ${accent}`
                              : 'none',
                        background:
                          status === 'done'
                            ? accent
                            : status === 'active'
                              ? accent
                              : 'transparent',
                        cursor: 'pointer',
                        boxShadow:
                          status === 'active'
                            ? `0 0 0 4px color-mix(in srgb, ${accent} 18%, transparent)`
                            : 'none',
                        transition:
                          'width 180ms var(--ease-out), height 180ms var(--ease-out), box-shadow 180ms var(--ease-out), background 180ms var(--ease-out)',
                      }}
                    />

                    {isLast ? (
                      <div style={{ flex: 1 }} aria-hidden />
                    ) : (
                      <div
                        aria-hidden
                        style={{
                          flex: 1,
                          height: 2,
                          marginLeft: 4,
                          borderRadius: 999,
                          background:
                            index < activeIndex
                              ? accent
                              : `color-mix(in srgb, ${LANDING.border} 80%, transparent)`,
                          transition: 'background 220ms var(--ease-out)',
                        }}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    style={{
                      marginTop: 10,
                      width: '100%',
                      padding: '2px 4px 0',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      lineHeight: 1.35,
                      fontWeight: status === 'active' ? 600 : 400,
                      color:
                        status === 'active'
                          ? accent
                          : status === 'done'
                            ? LANDING.text
                            : LANDING.textSecondary,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      hyphens: 'auto',
                      transition: 'color 180ms var(--ease-out)',
                    }}
                  >
                    {label}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <p
          key={activeIndex}
          className="fade-up"
          style={{
            margin: '20px 0 0',
            minHeight: 40,
            fontSize: 13,
            color: LANDING.text,
            lineHeight: 1.5,
          }}
        >
          {activeHint}
        </p>
      </div>
    </div>
  )
}
