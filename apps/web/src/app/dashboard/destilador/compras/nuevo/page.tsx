'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { requireClerkSupabaseToken } from '@/hooks/useSupabase'
import { createSupabaseBrowserClientWithToken } from '@/utils/supabase/browser'
import { useAuth } from '@clerk/nextjs'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import { fmtMoney } from '@/lib/proof/format'
import type { DestViajeEstado, NuevoProductoViajeInput } from '@/lib/proof/destilador-types'
import { createViajeDestilador } from '@/lib/supabase/destilador'

const AGAVES = ['Espadín', 'Tobalá', 'Mexicano', 'Tepeztate', 'Madrecuixe', 'Arroqueño', 'Otro']

const field: React.CSSProperties = {
  width: '100%',
  background: 'var(--panel)',
  border: '0.5px solid var(--hairline)',
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--fg-0)',
  outline: 'none',
}

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--fg-3)',
  marginBottom: 6,
}

function emptyProducto(): NuevoProductoViajeInput {
  return {
    tipo_agave: 'Espadín',
    litros_acordados: 0,
    precio_por_litro: 0,
    anticipo_pagado: 0,
  }
}

type ViajeSubmitPayload = {
  fecha: string
  region: string
  comunidad: string
  palenquero_nombre: string
  palenquero_contacto: string
  costo_flete: number
  estado: DestViajeEstado
  productos: {
    tipo_agave: string
    litros_acordados: number
    precio_por_litro: number
    anticipo_pagado: number
  }[]
}

function isPostgrestError(err: unknown): err is {
  code?: string
  message?: string
  details?: string
  hint?: string
  status?: number
} {
  return typeof err === 'object' && err !== null && 'message' in err && 'code' in err
}

/** Diagnóstico en consola del navegador (F12 → Console). */
function logViajeSaveError(err: unknown, context: { clerkId: string; payload: ViajeSubmitPayload }) {
  if (err instanceof Error && err.message.includes('Revisa litros')) {
    console.error('[viaje/nuevo] validación del formulario (antes de Supabase)', {
      message: err.message,
      payload: context.payload,
    })
    return
  }

  if (isPostgrestError(err)) {
    const step =
      err.code === 'PGRST205' || err.message?.includes('does not exist')
        ? 'tabla inexistente o schema no aplicado'
        : err.code?.startsWith('23')
          ? 'constraint / NOT NULL / FK en Postgres'
          : err.code === '42501' || err.message?.includes('policy')
            ? 'RLS — política rechazó el insert'
            : 'insert directo en viajes o productos_viaje (no es RPC)'

    console.error('[viaje/nuevo] error Supabase', {
      step,
      code: err.code,
      message: err.message,
      details: err.details,
      hint: err.hint,
      status: err.status,
      clerkId: context.clerkId,
      payload: context.payload,
      raw: err,
    })
    return
  }

  console.error('[viaje/nuevo] error desconocido al guardar viaje', {
    err,
    clerkId: context.clerkId,
    payload: context.payload,
    type: typeof err,
    stack: err instanceof Error ? err.stack : undefined,
  })
}

function messageFromSaveError(err: unknown): string {
  if (err instanceof Error && err.message.includes('Revisa litros')) {
    return err.message
  }
  if (isPostgrestError(err)) {
    const parts = [err.message, err.code && `[${err.code}]`, err.details, err.hint].filter(
      Boolean
    )
    return parts.join(' — ') || 'No se pudo guardar el viaje'
  }
  if (err instanceof Error && err.message) return err.message
  return 'No se pudo guardar el viaje'
}

export default function NuevoViajePage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { loading, ok, clerkId } = useDestiladorScope()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [region, setRegion] = useState('')
  const [comunidad, setComunidad] = useState('')
  const [palenqueroNombre, setPalenqueroNombre] = useState('')
  const [palenqueroContacto, setPalenqueroContacto] = useState('')
  const [costoFlete, setCostoFlete] = useState('')
  const [estado, setEstado] = useState<DestViajeEstado>('en_transito')
  const [productos, setProductos] = useState<NuevoProductoViajeInput[]>([emptyProducto()])

  const totales = useMemo(() => {
    let litros = 0
    let total = 0
    let anticipo = 0
    for (const p of productos) {
      const l = Number(p.litros_acordados) || 0
      const pr = Number(p.precio_por_litro) || 0
      const ant = Number(p.anticipo_pagado) || 0
      litros += l
      total += l * pr
      anticipo += ant
    }
    return { litros, total, anticipo, saldo: Math.max(total - anticipo, 0) }
  }, [productos])

  function updateProducto(i: number, patch: Partial<NuevoProductoViajeInput>) {
    setProductos(prev => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  function addProducto() {
    setProductos(prev => [...prev, emptyProducto()])
  }

  function removeProducto(i: number) {
    setProductos(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clerkId) {
      console.error('[viaje/nuevo] submit sin clerkId — perfil destilador no listo')
      setError('Sesión destilador no disponible. Recarga la página.')
      return
    }
    setError(null)
    setSaving(true)

    const parsed = productos.map(p => ({
      tipo_agave: p.tipo_agave === 'Otro' ? p.tipo_agave : p.tipo_agave,
      litros_acordados: Number(p.litros_acordados),
      precio_por_litro: Number(p.precio_por_litro),
      anticipo_pagado: Number(p.anticipo_pagado) || 0,
    }))

    const payload: ViajeSubmitPayload = {
      fecha,
      region: region.trim(),
      comunidad: comunidad.trim(),
      palenquero_nombre: palenqueroNombre.trim(),
      palenquero_contacto: palenqueroContacto.trim(),
      costo_flete: Number(costoFlete) || 0,
      estado,
      productos: parsed,
    }

    try {
      for (const p of parsed) {
        if (!p.tipo_agave.trim() || p.litros_acordados <= 0 || p.precio_por_litro < 0) {
          throw new Error('Revisa litros y precio de cada agave')
        }
      }

      const jwt = await requireClerkSupabaseToken(getToken)
      const supabaseAuthed = createSupabaseBrowserClientWithToken(jwt)

      console.info('[viaje/nuevo] guardando viaje (insert viajes + productos_viaje)', {
        clerkId,
        jwtPresent: true,
        payload,
      })

      const { viajeId } = await createViajeDestilador(supabaseAuthed, clerkId, payload)

      console.info('[viaje/nuevo] viaje creado', { viajeId })
      router.push(`/dashboard/destilador/compras/${viajeId}`)
    } catch (err: unknown) {
      logViajeSaveError(err, { clerkId, payload })
      setError(messageFromSaveError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !ok) {
    return (
      <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>
        <DestiladorSkeleton />
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 720, margin: '0 auto' }}>
      <Link href="/dashboard/destilador/compras" style={{ color: 'var(--fg-3)', fontSize: 12 }}>
        ← Compras
      </Link>
      <h1 style={{ margin: '16px 0 24px', fontSize: 24, color: 'var(--fg-0)' }}>Nuevo viaje</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={label}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={field} required />
          </div>
          <div>
            <label style={label}>Estado inicial</label>
            <select value={estado} onChange={e => setEstado(e.target.value as DestViajeEstado)} style={field}>
              <option value="en_negociacion">En negociación</option>
              <option value="confirmado">Confirmado</option>
              <option value="en_transito">En tránsito</option>
            </select>
          </div>
        </div>

        <div>
          <label style={label}>Región</label>
          <input value={region} onChange={e => setRegion(e.target.value)} style={field} placeholder="Ej. Oaxaca · Miahuatlán" />
        </div>
        <div>
          <label style={label}>Comunidad</label>
          <input value={comunidad} onChange={e => setComunidad(e.target.value)} style={field} />
        </div>
        <div>
          <label style={label}>Palenquero</label>
          <input value={palenqueroNombre} onChange={e => setPalenqueroNombre(e.target.value)} style={field} required />
        </div>
        <div>
          <label style={label}>Contacto</label>
          <input value={palenqueroContacto} onChange={e => setPalenqueroContacto(e.target.value)} style={field} />
        </div>
        <div>
          <label style={label}>Costo flete (total viaje)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={costoFlete}
            onChange={e => setCostoFlete(e.target.value)}
            style={field}
            className="mono"
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Productos</span>
            <button
              type="button"
              onClick={addProducto}
              style={{
                padding: '6px 10px',
                border: '0.5px solid var(--hairline)',
                background: 'transparent',
                color: 'var(--gold)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              + Agave
            </button>
          </div>

          {productos.map((p, i) => {
            const sub = (Number(p.litros_acordados) || 0) * (Number(p.precio_por_litro) || 0)
            return (
              <div
                key={i}
                style={{
                  padding: 14,
                  marginBottom: 10,
                  border: '0.5px solid var(--hairline)',
                  background: 'var(--panel)',
                }}
              >
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <label style={label}>Tipo agave</label>
                    <select
                      value={p.tipo_agave}
                      onChange={e => updateProducto(i, { tipo_agave: e.target.value })}
                      style={field}
                    >
                      {AGAVES.map(a => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={label}>Litros acordados</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={p.litros_acordados || ''}
                        onChange={e =>
                          updateProducto(i, { litros_acordados: parseFloat(e.target.value) || 0 })
                        }
                        style={field}
                        className="mono"
                        required
                      />
                    </div>
                    <div>
                      <label style={label}>Precio / litro</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.precio_por_litro || ''}
                        onChange={e =>
                          updateProducto(i, { precio_por_litro: parseFloat(e.target.value) || 0 })
                        }
                        style={field}
                        className="mono"
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={label}>Anticipo</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.anticipo_pagado || ''}
                        onChange={e =>
                          updateProducto(i, { anticipo_pagado: parseFloat(e.target.value) || 0 })
                        }
                        style={field}
                        className="mono"
                      />
                    </div>
                    <div style={{ alignSelf: 'end' }}>
                      <span className="mono" style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                        Subtotal {fmtMoney(sub)}
                      </span>
                    </div>
                  </div>
                </div>
                {productos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProducto(i)}
                    style={{
                      marginTop: 10,
                      fontSize: 11,
                      color: 'var(--crit)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Quitar
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div
          className="mono"
          style={{
            padding: 14,
            border: '0.5px solid var(--hairline)',
            fontSize: 12,
            color: 'var(--fg-1)',
          }}
        >
          <div>Litros acordados (no se mezclan en KPI): {totales.litros.toLocaleString('es-MX')} L</div>
          <div>Total compra: {fmtMoney(totales.total)}</div>
          <div>Anticipos: {fmtMoney(totales.anticipo)}</div>
          <div style={{ color: 'var(--warn)' }}>Saldo palenquero: {fmtMoney(totales.saldo)}</div>
        </div>

        {error && <p style={{ color: 'var(--crit)', fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '12px 16px',
            background: 'var(--gold)',
            color: 'var(--ink)',
            border: 'none',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Guardando…' : 'Crear viaje'}
        </button>
      </form>
    </div>
  )
}
