'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { refreshRecepcionFotoUrlsAction } from '@/app/actions/recepciones'
import { fetchRecepcionRemisionDetalle, type RecepcionRemisionDetalle } from '@/lib/supabase'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { fmtBottles } from '@/lib/proof/format'
import { formatDate } from '@/lib/i18n/format'

export default function RemisionDetallePage() {
  const t = useTranslations('distributor.remisionesDetail')
  const tCommon = useTranslations('distributor.common')
  const locale = useLocale() as AppLocale
  const params = useParams()
  const id = String(params.id ?? '')
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [rec, setRec] = useState<RecepcionRemisionDetalle | null>(null)
  const [fotos, setFotos] = useState<string[]>([])
  const [fotoError, setFotoError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    fetchRecepcionRemisionDetalle(supabase, id)
      .then(async data => {
        if (cancelled) return
        setRec(data)
        if (data?.foto_urls?.length) {
          try {
            const signed = await refreshRecepcionFotoUrlsAction(id)
            if (!cancelled) setFotos(signed)
          } catch (e) {
            if (!cancelled) {
              setFotoError(e instanceof Error ? e.message : t('photoError'))
              setFotos(data.foto_urls)
            }
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, supabase, scope?.user_id])

  const totalBts =
    rec?.items_recepcion?.reduce((a, it) => a + (it.cantidad_recibida || 0), 0) ?? 0

  function fmtDateTime(iso: string): string {
    return formatDate(new Date(iso), locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const backLink = (
    <Link
      href="/dashboard/remisiones"
      style={{ fontSize: 12, color: 'var(--fg-3)', textDecoration: 'none' }}
    >
      {t('back')}
    </Link>
  )

  if (loading) {
    return (
      <VuOpsPage title={tCommon('loading')} actions={backLink}>
        <p style={{ margin: 0, color: 'var(--fg-3)', fontSize: 13 }}>{tCommon('loading')}</p>
      </VuOpsPage>
    )
  }

  if (!rec) {
    return (
      <VuOpsPage title={t('notFound')} actions={backLink}>
        <p style={{ margin: 0, color: 'var(--crit)', fontSize: 13 }}>{t('notFound')}</p>
      </VuOpsPage>
    )
  }

  return (
    <VuOpsPage
      title={rec.productor}
      description={
        <>
          <span className="mono" style={{ fontSize: 12, color: 'var(--gold)', display: 'block', marginBottom: 6 }}>
            {rec.codigo}
          </span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
            {fmtDateTime(rec.fecha_recepcion)} · {t('bottlesReceived', { count: fmtBottles(totalBts) })} ·{' '}
            {rec.estado}
          </span>
        </>
      }
      actions={backLink}
    >
      {fotos.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 className="eyebrow" style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 10 }}>
            {t('photoEvidence')}
          </h2>
          {fotoError && (
            <p style={{ fontSize: 11, color: 'var(--warn)', marginBottom: 8 }}>{fotoError}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fotos.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={t('photoAlt', { index: i + 1 })}
                  style={{ width: '100%', maxHeight: 360, objectFit: 'contain', background: 'var(--ink)' }}
                />
              </a>
            ))}
          </div>
        </section>
      )}

      <Block title={t('itemsReceived')}>
        {rec.items_recepcion?.length ? (
          rec.items_recepcion.map(it => (
            <Line
              key={it.id}
              left={it.skus?.nombre || t('skuFallback')}
              right={
                t('itemLine', {
                  qty: fmtBottles(it.cantidad_recibida),
                  lot: it.lote ? t('lotSuffix', { lot: it.lote }) : '',
                })
              }
            />
          ))
        ) : (
          <Empty>{t('emptyItems')}</Empty>
        )}
      </Block>

      <Block title={t('discrepancies')}>
        {rec.discrepancias?.length ? (
          rec.discrepancias.map(d => (
            <div
              key={d.id}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--hairline)',
                borderLeft: '2px solid var(--warn)',
              }}
            >
              <span className="mono" style={{ fontSize: 10, color: 'var(--warn)' }}>
                {d.tipo.toUpperCase()}
              </span>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg-1)' }}>{d.descripcion}</p>
            </div>
          ))
        ) : (
          <Empty>{t('emptyDiscrepancies')}</Empty>
        )}
      </Block>
    </VuOpsPage>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 className="eyebrow" style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 10 }}>
        {title}
      </h2>
      <div
        style={{
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function Line({ left, right }: { left: string; right: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--hairline)',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--fg-0)' }}>{left}</span>
      <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 11 }}>
        {right}
      </span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, padding: 16, fontSize: 13, color: 'var(--fg-3)' }}>{children}</p>
}
