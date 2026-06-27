'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { refreshRecepcionFotoUrlsAction } from '@/app/actions/recepciones'
import { fetchRecepcionRemisionDetalle, type RecepcionRemisionDetalle } from '@/lib/supabase'
import { fmtBottles } from '@/lib/proof/format'

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function RemisionDetallePage() {
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
              setFotoError(e instanceof Error ? e.message : 'No se pudieron cargar fotos')
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

  return (
    <div style={{ padding: '28px 28px 100px', maxWidth: 800, margin: '0 auto' }}>
      <Link
        href="/dashboard/remisiones"
        style={{ fontSize: 12, color: 'var(--fg-3)', textDecoration: 'none' }}
      >
        ← Remisiones
      </Link>

      {loading ? (
        <p style={{ marginTop: 24, color: 'var(--fg-3)', fontSize: 13 }}>Cargando…</p>
      ) : !rec ? (
        <p style={{ marginTop: 24, color: 'var(--crit)', fontSize: 13 }}>Recepción no encontrada.</p>
      ) : (
        <>
          <header style={{ margin: '16px 0 24px' }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 6 }}>
              {rec.codigo}
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: 'var(--fg-0)' }}>
              {rec.productor}
            </h1>
            <p className="mono" style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>
              {fmtDateTime(rec.fecha_recepcion)} · {fmtBottles(totalBts)} botellas · {rec.estado}
            </p>
          </header>

          {fotos.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 className="eyebrow" style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 10 }}>
                Evidencia fotográfica
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
                      alt={`Evidencia ${i + 1}`}
                      style={{ width: '100%', maxHeight: 360, objectFit: 'contain', background: '#000' }}
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          <Block title="Ítems recibidos">
            {rec.items_recepcion?.length ? (
              rec.items_recepcion.map(it => (
                <Line
                  key={it.id}
                  left={it.skus?.nombre || 'SKU'}
                  right={`${fmtBottles(it.cantidad_recibida)} bts${it.lote ? ` · lote ${it.lote}` : ''}`}
                />
              ))
            ) : (
              <Empty>Sin ítems registrados.</Empty>
            )}
          </Block>

          <Block title="Discrepancias">
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
              <Empty>Sin discrepancias documentadas.</Empty>
            )}
          </Block>
        </>
      )}
    </div>
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
      <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 11 }}>{right}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, padding: 16, fontSize: 13, color: 'var(--fg-3)' }}>{children}</p>
}
