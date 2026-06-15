'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'
import {
  type ItemDetectadoRecepcion,
  buildDiscrepanciasFromItems,
} from '@/lib/proof/recepcion-analysis'
import {
  encodeOcRecepcionValue,
  parseOcRecepcionValue,
} from '@/lib/proof/recepcion-oc'
import { createRecepcionFromAnalysisAction } from '@/app/actions/recepciones'
import {
  fetchOrdenesCompraAbiertas,
  fetchOrdenesCompraDistribuidorPendientes,
  rpcConfirmarRecepcion,
  type OrdenCompraDistribuidorWithItems,
  type OrdenCompraRow,
} from '@/lib/supabase'
import { fmtBottles, fmtMoney } from '@/lib/proof/format'

const STEPS = ['Foto', 'PROOF analiza', 'Revisar', 'Discrepancias', 'Confirmar'] as const

export default function RecepcionPage() {
  const router = useRouter()
  const { scope, activeProfile } = useProfile()
  const supabase = useSupabase()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState<string[]>([])
  const [items, setItems] = useState<ItemDetectadoRecepcion[]>([])
  const [productor, setProductor] = useState('')
  const [ocVinculoValue, setOcVinculoValue] = useState('')
  const [ordenesDistribuidor, setOrdenesDistribuidor] = useState<
    OrdenCompraDistribuidorWithItems[]
  >([])
  const [ordenesLegacy, setOrdenesLegacy] = useState<OrdenCompraRow[]>([])
  const [deudaRegistrada, setDeudaRegistrada] = useState(0)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoUrls, setFotoUrls] = useState<string[]>([])
  const [recepcionId, setRecepcionId] = useState<string | null>(null)
  const [codigoConfirmado, setCodigoConfirmado] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!scope) return
    Promise.all([
      fetchOrdenesCompraDistribuidorPendientes(supabase, scope),
      fetchOrdenesCompraAbiertas(supabase, scope),
    ])
      .then(([distribuidor, legacy]) => {
        setOrdenesDistribuidor(distribuidor)
        setOrdenesLegacy(legacy)
      })
      .catch(() => {
        setOrdenesDistribuidor([])
        setOrdenesLegacy([])
      })
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  const ocVinculo = parseOcRecepcionValue(ocVinculoValue)

  useEffect(() => {
    if (!ocVinculo) return
    if (ocVinculo.source === 'distribuidor') {
      const oc = ordenesDistribuidor.find(o => o.id === ocVinculo.id)
      if (oc?.proveedor_nombre && !productor) setProductor(oc.proveedor_nombre)
    } else {
      const oc = ordenesLegacy.find(o => o.id === ocVinculo.id)
      if (oc?.productor_id && !productor) setProductor(oc.productor_id)
    }
  }, [ocVinculo, ordenesDistribuidor, ordenesLegacy, productor])

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !scope) return
    e.target.value = ''

    setError(null)
    setStep(1)
    setAnalyzing(true)
    setProgress([])
    setItems([])

    const reader = new FileReader()
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setFotoPreview(base64)

    const b64 = base64.includes(',') ? base64.split(',')[1]! : base64

    try {
      const res = await fetch('/api/recepciones/analizar-foto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagenBase64: b64,
          mediaType: file.type || 'image/jpeg',
          ordenCompraId: ocVinculo?.id,
          ordenCompraSource: ocVinculo?.source,
          productorId: productor || undefined,
          recepcionId: recepcionId || undefined,
          profile_type_v2: activeProfile?.profile_type_v2 || 'distributor',
        }),
      })

      if (!res.ok || !res.body) throw new Error(await res.text())

      const readerStream = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const collected: ItemDetectadoRecepcion[] = []

      while (true) {
        const { done, value } = await readerStream.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const part of parts) {
          const eventLine = part.split('\n').find(l => l.startsWith('event: '))
          const dataLine = part.split('\n').find(l => l.startsWith('data: '))
          if (!eventLine || !dataLine) continue
          const event = eventLine.replace('event: ', '').trim()
          const data = JSON.parse(dataLine.slice(6))
          if (event === 'progress') {
            setProgress(p => [...p, data.label as string])
          } else if (event === 'item') {
            collected[data.index as number] = data.item as ItemDetectadoRecepcion
            setItems([...collected.filter(Boolean)])
          } else if (event === 'done') {
            if (data.recepcionId) setRecepcionId(String(data.recepcionId))
            if (Array.isArray(data.fotoUrls)) setFotoUrls(data.fotoUrls as string[])
            if (data.productorDetectado) setProductor(String(data.productorDetectado))
            setItems(data.items as ItemDetectadoRecepcion[])
          } else if (event === 'error') {
            throw new Error(data.message as string)
          }
        }
      }

      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar')
      setStep(0)
    } finally {
      setAnalyzing(false)
    }
  }

  function updateItem(idx: number, patch: Partial<ItemDetectadoRecepcion>) {
    setItems(prev => {
      const next = [...prev]
      const cur = next[idx]!
      const merged = { ...cur, ...patch }
      if (patch.cantidadRecibida != null) {
        merged.diferenciaVsOc =
          merged.cantidadEsperada > 0
            ? merged.cantidadRecibida - merged.cantidadEsperada
            : merged.diferenciaVsOc
      }
      next[idx] = merged
      return next
    })
  }

  async function guardarYContinuar() {
    if (!scope || items.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const disc = buildDiscrepanciasFromItems(items)
      const rec = await createRecepcionFromAnalysisAction({
        recepcion_id: recepcionId,
        productor: productor || 'Productor',
        orden_compra_id: ocVinculo?.source === 'legacy' ? ocVinculo.id : null,
        orden_compra_distribuidor_id:
          ocVinculo?.source === 'distribuidor' ? ocVinculo.id : null,
        deuda_registrada: ocVinculo?.source === 'distribuidor' ? 0 : deudaRegistrada,
        foto_urls: fotoUrls.length ? fotoUrls : undefined,
        items: items.map(it => ({
          sku_id: it.skuId,
          cantidad_esperada: it.cantidadEsperada,
          cantidad_recibida: it.cantidadRecibida,
          lote: it.lote,
          condicion: 'ok',
        })),
        discrepancias: disc,
        profile_type_v2: scope.profile_type_v2,
      })
      setRecepcionId(rec.id)
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function confirmarFinal() {
    if (!recepcionId) return
    setSaving(true)
    setError(null)
    try {
      const rec = await rpcConfirmarRecepcion(
        supabase,
        recepcionId,
        !vinculoOcDistribuidor && deudaRegistrada > 0
      )
      setCodigoConfirmado(rec.codigo)
      setStep(4)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al confirmar')
    } finally {
      setSaving(false)
    }
  }

  const totalBotellas = items.reduce((a, i) => a + i.cantidadRecibida, 0)
  const discrepancias = buildDiscrepanciasFromItems(items)
  const ocSeleccionadaDistribuidor =
    ocVinculo?.source === 'distribuidor'
      ? ordenesDistribuidor.find(o => o.id === ocVinculo.id)
      : null
  const ocSeleccionadaLegacy =
    ocVinculo?.source === 'legacy' ? ordenesLegacy.find(o => o.id === ocVinculo.id) : null
  const vinculoOcDistribuidor = ocVinculo?.source === 'distribuidor'

  return (
    <div style={{ padding: '28px 28px 100px', maxWidth: 720, margin: '0 auto' }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: 'var(--fg-0)' }}>
          Entrada foto
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
          Fotografía el pallet, la caja o la factura. PROOF identifica lo que hay.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STEPS.map((label, i) => (
          <span
            key={label}
            className="mono"
            style={{
              fontSize: 10,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: i <= step ? 'var(--gold)' : 'var(--hairline)',
              color: i <= step ? 'var(--gold)' : 'var(--fg-4)',
            }}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            placeholder="Productor (opcional)"
            value={productor}
            onChange={e => setProductor(e.target.value)}
            style={fieldStyle}
          />
          <label style={{ fontSize: 12, color: 'var(--fg-2)' }}>
            ¿Viene de una OC?
            <select
              value={ocVinculoValue}
              onChange={e => setOcVinculoValue(e.target.value)}
              style={{ ...fieldStyle, marginTop: 6 }}
            >
              <option value="">Sin orden de compra</option>
              {ordenesDistribuidor.length > 0 && (
                <optgroup label="OC PROOF (pendientes)">
                  {ordenesDistribuidor.map(oc => (
                    <option
                      key={oc.id}
                      value={encodeOcRecepcionValue('distribuidor', oc.id)}
                    >
                      {oc.numero_orden} · {oc.proveedor_nombre} · {oc.estado}
                      {oc.fecha_estimada ? ` · ${oc.fecha_estimada}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {ordenesLegacy.length > 0 && (
                <optgroup label="OC anteriores">
                  {ordenesLegacy.map(oc => (
                    <option key={oc.id} value={encodeOcRecepcionValue('legacy', oc.id)}>
                      {oc.productor_id || 'OC'} · {oc.estado}
                      {oc.fecha_esperada ? ` · ${oc.fecha_esperada}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          {(ocSeleccionadaDistribuidor || ocSeleccionadaLegacy) && (
            <p className="mono" style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>
              Al analizar, PROOF cruzará cantidades vs ítems de esta OC
              {ocSeleccionadaDistribuidor
                ? ` (${ocSeleccionadaDistribuidor.numero_orden}). Al confirmar, actualiza stock y CxP.`
                : '.'}
            </p>
          )}
          <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.5 }}>
            Las OC nuevas del distribuidor viven en PROOF.{' '}
            <Link href="/dashboard/distribuidor/compras/nuevo" style={{ color: 'var(--gold)' }}>
              Crear orden de compra
            </Link>
            {' · '}
            <Link href="/dashboard" style={{ color: 'var(--gold)' }}>
              Confirmar llegada en canvas
            </Link>
          </p>
          <div
            style={{
              border: '1px dashed var(--line)',
              borderRadius: 'var(--radius-card)',
              padding: 48,
              textAlign: 'center',
              background: 'var(--panel)',
            }}
          >
            <button type="button" onClick={() => fileRef.current?.click()} style={ctaPrimary}>
              Subir foto / PDF
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              style={{ display: 'none' }}
              onChange={onFileSelected}
            />
          </div>
        </section>
      )}

      {step === 1 && (
        <section style={{ padding: 24, background: 'var(--panel)', borderRadius: 'var(--radius-card)' }}>
          <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--gold)' }}>
            {analyzing ? 'PROOF analiza…' : 'Análisis'}
          </div>
          {progress.map((p, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--fg-1)', marginBottom: 8 }}>
              ✓ {p}
            </div>
          ))}
          {items.map((it, i) => (
            <div key={i} className="fade-up" style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 6 }}>
              + {it.nombre} · {fmtBottles(it.cantidadRecibida)} bts
            </div>
          ))}
        </section>
      )}

      {step === 2 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ocVinculo && (
            <p className="mono" style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>
              OC vinculada · diferencias en rojo
            </p>
          )}
          {items.map((it, i) => {
            const preConfirmed = !it.lowConfidence && it.productoEncontradoEnCatalogo
            const diffOc = it.diferenciaVsOc != null && it.diferenciaVsOc !== 0
            return (
              <div
                key={i}
                style={{
                  padding: 16,
                  background: 'var(--panel)',
                  border: '1px solid',
                  borderColor: diffOc ? 'var(--crit)' : 'var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{it.nombre}</div>
                  {preConfirmed && (
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ok)' }}>
                      PRE-CONFIRMADO
                    </span>
                  )}
                  {it.lowConfidence && (
                    <span className="mono" style={{ fontSize: 10, color: 'var(--warn)' }}>
                      REVISAR · {(it.confianza * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 8 }}>
                  {it.productoEncontradoEnCatalogo ? it.skuId?.slice(0, 8) : 'Sin match catálogo'}
                  {it.cantidadEsperada > 0 &&
                    ` · OC esp. ${fmtBottles(it.cantidadEsperada)} / rec. `}
                  {diffOc && (
                    <span style={{ color: 'var(--crit)' }}>
                      {' '}
                      · Δ {it.diferenciaVsOc! > 0 ? '+' : ''}
                      {it.diferenciaVsOc} bts
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 11, color: 'var(--fg-2)' }}>Recibido</label>
                  <input
                    type="number"
                    min={0}
                    value={it.cantidadRecibida}
                    onChange={e =>
                      updateItem(i, { cantidadRecibida: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mono"
                    style={{
                      ...fieldStyle,
                      width: 88,
                      color: diffOc ? 'var(--crit)' : 'var(--fg-0)',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>bts</span>
                </div>
              </div>
            )
          })}
          {fotoUrls.length > 0 && (
            <p className="mono" style={{ margin: 0, fontSize: 10, color: 'var(--ok)' }}>
              {fotoUrls.length} foto{fotoUrls.length === 1 ? '' : 's'} guardada
              {fotoUrls.length === 1 ? '' : 's'} en Storage
            </p>
          )}
          {!vinculoOcDistribuidor && (
          <label style={{ fontSize: 12, color: 'var(--fg-2)' }}>
            Deuda a registrar (opcional)
            <input
              type="number"
              min={0}
              value={deudaRegistrada || ''}
              onChange={e => setDeudaRegistrada(Number(e.target.value) || 0)}
              style={{ ...fieldStyle, marginTop: 6 }}
              className="mono"
            />
          </label>
          )}
          {vinculoOcDistribuidor && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
              Con OC PROOF, la cuenta por pagar se genera al confirmar según costos de la orden.
            </p>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={guardarYContinuar}
            style={{ ...ctaPrimary, width: '100%' }}
          >
            {saving ? 'Guardando…' : 'Continuar a discrepancias'}
          </button>
        </section>
      )}

      {step === 3 && (
        <section>
          {discrepancias.length === 0 ? (
            <p style={{ color: 'var(--fg-2)', marginBottom: 16 }}>Sin discrepancias detectadas.</p>
          ) : (
            discrepancias.map((d, i) => (
              <div
                key={i}
                style={{
                  padding: 14,
                  marginBottom: 10,
                  borderLeft: '2px solid var(--warn)',
                  background: 'var(--warn-soft)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span className="mono" style={{ fontSize: 10, color: 'var(--warn)' }}>
                  {d.tipo.toUpperCase()}
                </span>
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>{d.descripcion}</p>
              </div>
            ))
          )}
          <button
            type="button"
            disabled={saving || !recepcionId}
            onClick={confirmarFinal}
            style={{ ...ctaPrimary, width: '100%' }}
          >
            {saving ? 'Confirmando…' : 'Confirmar recepción (sube stock)'}
          </button>
        </section>
      )}

      {step === 4 && codigoConfirmado && (
        <section
          style={{
            padding: 24,
            background: 'var(--panel)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--hairline)',
          }}
        >
          <div className="mono" style={{ color: 'var(--gold)', marginBottom: 8 }}>
            {codigoConfirmado}
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.6 }}>
            {productor} · {fmtBottles(totalBotellas)} botellas recibidas
            {deudaRegistrada > 0 && !vinculoOcDistribuidor ? ` · Deuda ${fmtMoney(deudaRegistrada)}` : ''}
            {ocVinculo ? ' · OC actualizada' : ''}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => window.location.reload()} style={ctaSecondary}>
              Nueva recepción
            </button>
            <button type="button" onClick={() => router.push('/dashboard/inventario')} style={ctaPrimary}>
              Ver inventario
            </button>
          </div>
        </section>
      )}

      {error && <p style={{ color: 'var(--crit)', marginTop: 16, fontSize: 13 }}>{error}</p>}

      <ConnectedProofAIBar
        pantalla="recepcion"
        vista={STEPS[step]}
        profileType="distributor"
        hints={{
          pantalla: {
            step,
            productor,
            ordenCompraId: ocVinculo?.id ?? null,
            ordenCompraSource: ocVinculo?.source ?? null,
            itemsCount: items.length,
            totalBotellas,
            discrepancias: discrepancias.length,
          },
        }}
        fallback={{
          mensaje: 'Al confirmar, incremento stock_total y registro deuda si aplica.',
          accionLabel: 'Preguntar a PROOF',
        }}
      />
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--panel)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--fg-0)',
  fontSize: 14,
}

const ctaPrimary: React.CSSProperties = {
  padding: '11px 18px',
  background: 'var(--gold)',
  border: '1px solid var(--gold)',
  color: 'var(--ink)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}

const ctaSecondary: React.CSSProperties = {
  padding: '11px 18px',
  background: 'transparent',
  border: '1px solid var(--line)',
  color: 'var(--fg-1)',
  fontSize: 12,
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}
