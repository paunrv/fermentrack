'use client'

import { useEffect, useRef, useState } from 'react'
import type { DisplayCards } from '@/lib/proof/agent-response-types'
import { ProofResultCard } from '@/components/proof/ProofResultCard'

function ProofCardSkeleton() {
  return (
    <div
      className="proof-result-skeleton"
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        minHeight: 120,
      }}
    >
      <div
        style={{
          width: '60%',
          height: 14,
          borderRadius: 4,
          background: 'var(--panel-2)',
          marginBottom: 12,
        }}
      />
      <div
        style={{
          width: '40%',
          height: 12,
          borderRadius: 4,
          background: 'var(--panel-2)',
        }}
      />
    </div>
  )
}

function TiChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 10l5 5 5-5H7z" />
    </svg>
  )
}

export function ProofResultsZone({
  displayCards,
  loading,
  wideLayout,
  onAction,
  onDeleteCard,
  resultsAria,
  deleteFailed,
}: {
  displayCards: DisplayCards | null
  loading: boolean
  wideLayout?: boolean
  onAction: (prompt: string) => void
  onDeleteCard?: (itemId: string) => void | Promise<void>
  resultsAria?: string
  deleteFailed?: string
}) {
  const [visibleCards, setVisibleCards] = useState<DisplayCards | null>(null)
  const [contentOpacity, setContentOpacity] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const wasLoadingRef = useRef(false)
  const dismissedIdsRef = useRef(new Set<string>())

  function applyDismissed(cards: DisplayCards): DisplayCards | null {
    const items = cards.items.filter(item => !dismissedIdsRef.current.has(item.id))
    return items.length > 0 ? { ...cards, items } : null
  }

  useEffect(() => {
    if (loading) {
      wasLoadingRef.current = true
      if (visibleCards) {
        setContentOpacity(0)
      }
      return
    }

    if (wasLoadingRef.current && displayCards) {
      const t = window.setTimeout(() => {
        setVisibleCards(applyDismissed(displayCards))
        setContentOpacity(0)
        requestAnimationFrame(() => {
          setContentOpacity(1)
        })
        wasLoadingRef.current = false
      }, visibleCards ? 120 : 0)
      return () => window.clearTimeout(t)
    }

    if (wasLoadingRef.current && !displayCards && !loading) {
      setVisibleCards(null)
      wasLoadingRef.current = false
      return
    }

    if (displayCards && !loading) {
      if (visibleCards && visibleCards.title !== displayCards.title) {
        setContentOpacity(0)
        const t = window.setTimeout(() => {
          setVisibleCards(applyDismissed(displayCards))
          requestAnimationFrame(() => setContentOpacity(1))
        }, 120)
        return () => window.clearTimeout(t)
      }
      setVisibleCards(applyDismissed(displayCards))
      setContentOpacity(1)
    }

    wasLoadingRef.current = false
  }, [loading, displayCards, visibleCards])

  const showLoading = loading
  const showResults = !loading && visibleCards != null && visibleCards.items.length > 0
  const showZone = showLoading || showResults

  async function handleDeleteCard(itemId: string) {
    if (!onDeleteCard || deletingId) return
    setDeletingId(itemId)
    setDeleteError(null)
    try {
      await onDeleteCard(itemId)
      dismissedIdsRef.current.add(itemId)
      setVisibleCards(prev => {
        if (!prev) return null
        const items = prev.items.filter(item => item.id !== itemId)
        return items.length > 0 ? { ...prev, items } : null
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : (deleteFailed ?? 'Could not delete')
      setDeleteError(msg)
    } finally {
      setDeletingId(null)
    }
  }

  if (!showZone) return null

  const skeletonCount = Math.min(displayCards?.items.length ?? 3, 3) || 3

  return (
    <section
      ref={zoneRef}
      aria-live="polite"
      aria-label={resultsAria}
      tabIndex={-1}
      className={`proof-results-zone${wideLayout ? ' proof-results-zone--wide' : ''}`}
      style={{
        flexShrink: 0,
        overflow: 'hidden',
        padding: '0 0 8px',
      }}
    >
      <style>{`
        @keyframes proof-shimmer {
          0% { opacity: 1; }
          50% { opacity: 0.45; }
          100% { opacity: 1; }
        }
        .proof-result-skeleton {
          animation: proof-shimmer 1.4s ease-in-out infinite;
        }
        .proof-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          max-width: 720px;
          margin: 0 auto;
          opacity: var(--proof-results-opacity, 1);
          transform: translateY(var(--proof-results-y, 0));
          transition: opacity 200ms ease-out, transform 200ms ease-out;
        }
        @media (max-width: 479px) {
          .proof-results-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (min-width: 720px) {
          .proof-results-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .proof-results-zone--wide .proof-results-grid {
          max-width: none;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        }
        @media (min-width: 1280px) {
          .proof-results-zone--wide .proof-results-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          }
        }
      `}</style>

      {showLoading ? (
        <div className="proof-results-grid" style={{ '--proof-results-opacity': 1 } as React.CSSProperties}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <ProofCardSkeleton key={i} />
          ))}
        </div>
      ) : showResults && visibleCards ? (
        <>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              maxWidth: wideLayout ? undefined : 720,
              margin: wideLayout ? '0 0 10px' : '0 auto 10px',
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              fontWeight: 400,
              opacity: contentOpacity,
              transition: 'opacity 150ms ease-out',
            }}
          >
            <TiChevronDown />
            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {visibleCards.title}
            </span>
            <span>· Resultado</span>
          </header>
          {deleteError ? (
            <p
              style={{
                maxWidth: wideLayout ? undefined : 720,
                margin: wideLayout ? '0 0 8px' : '0 auto 8px',
                fontSize: 12,
                color: 'var(--color-text-danger)',
              }}
            >
              {deleteError}
            </p>
          ) : null}
          <div
            className="proof-results-grid"
            style={
              {
                '--proof-results-opacity': contentOpacity,
                '--proof-results-y': contentOpacity === 0 ? '8px' : '0',
              } as React.CSSProperties
            }
          >
            {visibleCards.items.map(item => (
              <ProofResultCard
                key={item.id}
                item={item}
                onAction={onAction}
                onDelete={
                  onDeleteCard && item.devDeletable && deletingId !== item.id
                    ? handleDeleteCard
                    : undefined
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

export function focusResultsZone() {
  document.querySelector<HTMLElement>('.proof-results-zone')?.focus()
}
