'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchClients, fetchClientEtiquetas, fetchSkus, type Client, type SkuRow } from '@/lib/supabase'
import {
  finalizarTomaPedido,
  type LineaToma,
  type UnidadPedido,
} from '@/lib/proof/toma-pedido-client'
import { PedidoResumenCard } from '@/components/proof/PedidoResumenCard'

const MAX_STACK = 5

type LineaDraft = {
  key: string
  etiqueta: string
  cantidad: string
  unidad: UnidadPedido
}

type PedidoGuardado = {
  key: string
  pedidoId: string
  numero: string
  clienteName: string
  fechaEntrega: string
  anticipo: boolean
  anticipoMonto: number | null
  lineas: LineaToma[]
  estado: string
  itemsGuardados: number
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function newLinea(): LineaDraft {
  return { key: crypto.randomUUID(), etiqueta: '', cantidad: '12', unidad: 'botellas' }
}

function resolveClientByName(clients: Client[], name: string): Client | null {
  const n = name.trim().toLowerCase()
  if (!n) return null
  return clients.find(c => c.name.trim().toLowerCase() === n) ?? null
}

export default function NuevoPedidoPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const listRef = useRef<HTMLDivElement>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [skus, setSkus] = useState<SkuRow[]>([])
  const [etiquetaHints, setEtiquetaHints] = useState<string[]>([])
  const [clienteInput, setClienteInput] = useState('')
  const [lineas, setLineas] = useState<LineaDraft[]>(() => [newLinea()])
  const [fechaEntrega, setFechaEntrega] = useState(todayISO)
  const [anticipo, setAnticipo] = useState(false)
  const [anticipoMonto, setAnticipoMonto] = useState('')
  const [stack, setStack] = useState<PedidoGuardado[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!scope) return
    Promise.all([
      fetchClients(supabase, scope).catch(() => [] as Client[]),
      fetchSkus(supabase, scope).catch(() => [] as SkuRow[]),
    ]).then(([c, s]) => {
      setClients(c)
      setSkus(s)
    })
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  const matchedClient = resolveClientByName(clients, clienteInput)

  useEffect(() => {
    if (!scope || !matchedClient) {
      setEtiquetaHints([])
      return
    }
    fetchClientEtiquetas(supabase, scope, matchedClient.id)
      .then(rows => setEtiquetaHints(rows.map(r => r.nombre)))
      .catch(() => setEtiquetaHints([]))
  }, [matchedClient?.id, scope?.clerk_id, scope?.profile_type_v2, supabase])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  function updateLinea(key: string, patch: Partial<LineaDraft>) {
    setLineas(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)))
  }

  function addLinea() {
    setLineas(prev => [...prev, newLinea()])
  }

  function removeLinea(key: string) {
    setLineas(prev => (prev.length <= 1 ? prev : prev.filter(l => l.key !== key)))
  }

  function resetForm() {
    setClienteInput('')
    setLineas([newLinea()])
    setFechaEntrega(todayISO())
    setAnticipo(false)
    setAnticipoMonto('')
  }

  const anticipoMontoNum = parseFloat(anticipoMonto.replace(/,/g, '')) || 0

  const canSubmit =
    clienteInput.trim().length > 0 &&
    lineas.some(l => l.etiqueta.trim() && (parseInt(l.cantidad, 10) || 0) > 0) &&
    (!anticipo || anticipoMontoNum > 0)

  async function handleFinalizar() {
    if (!scope || !canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const lineasToma: LineaToma[] = lineas
        .filter(l => l.etiqueta.trim())
        .map(l => ({
          etiqueta: l.etiqueta.trim(),
          cantidad: Math.max(1, parseInt(l.cantidad, 10) || 1),
          unidad: l.unidad,
        }))

      const { pedido, lineas: savedLines, itemsGuardados } = await finalizarTomaPedido(
        supabase,
        scope,
        {
          clienteName: clienteInput.trim(),
          lineas: lineasToma,
          fechaEntrega,
          anticipo,
          anticipoMonto: anticipo ? anticipoMontoNum : null,
          skus,
        }
      )

      const entry: PedidoGuardado = {
        key: pedido.id,
        pedidoId: pedido.id,
        numero: pedido.numero,
        clienteName: clienteInput.trim(),
        fechaEntrega,
        anticipo,
        anticipoMonto: anticipo ? anticipoMontoNum : null,
        lineas: savedLines,
        estado: pedido.estado,
        itemsGuardados,
      }

      setStack(prev => [...prev.slice(-(MAX_STACK - 1)), entry])
      if (!clients.some(c => c.name.toLowerCase() === clienteInput.trim().toLowerCase())) {
        void fetchClients(supabase, scope).then(setClients).catch(() => {})
      }
      resetForm()
      scrollToBottom()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar el pedido'
      setError(msg.includes('fetch') ? `${msg} — revisa conexión o recarga la página` : msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 56px)',
        maxHeight: 'calc(100dvh - 56px)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--canvas)',
        }}
      >
        <Link
          href="/dashboard/pedidos"
          style={{ fontSize: 12, color: 'var(--fg-3)', textDecoration: 'none' }}
        >
          ← Pedidos
        </Link>
        <h1 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--fg-0)' }}>
          Toma de pedidos
        </h1>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--fg-2)' }}>
          Cliente, productos con cantidad y unidad, fecha de entrada y anticipo. Al finalizar baja a
          la lista (últimos {MAX_STACK}).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="eyebrow">Cliente</span>
            <input
              type="text"
              list="clientes-datalist"
              value={clienteInput}
              onChange={e => setClienteInput(e.target.value)}
              placeholder="Ej. Vinos Pijoan, Agua Mala…"
              style={inputLarge}
              autoComplete="off"
              autoFocus
            />
            <datalist id="clientes-datalist">
              {clients.map(c => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </label>

          <div>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>
              Etiqueta / producto
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lineas.map((l, idx) => (
                <div
                  key={l.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 72px 100px 36px',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    list={idx === 0 ? 'etiquetas-datalist' : undefined}
                    value={l.etiqueta}
                    onChange={e => updateLinea(l.key, { etiqueta: e.target.value })}
                    placeholder="Silvana, Mantis…"
                    style={inputSmall}
                    autoComplete="off"
                  />
                  <input
                    type="number"
                    min={1}
                    value={l.cantidad}
                    onChange={e => updateLinea(l.key, { cantidad: e.target.value })}
                    style={{ ...inputSmall, textAlign: 'center' }}
                    className="mono"
                  />
                  <select
                    value={l.unidad}
                    onChange={e => updateLinea(l.key, { unidad: e.target.value as UnidadPedido })}
                    style={inputSmall}
                  >
                    <option value="latas">Latas</option>
                    <option value="botellas">Botellas</option>
                    <option value="cajas">Cajas</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeLinea(l.key)}
                    disabled={lineas.length <= 1}
                    style={btnIcon}
                    aria-label="Quitar línea"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <datalist id="etiquetas-datalist">
              {etiquetaHints.map(n => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <button type="button" onClick={addLinea} style={btnLink}>
              + Otra línea de producto
            </button>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="eyebrow">Fecha de entrada del pedido</span>
            <input
              type="date"
              value={fechaEntrega}
              onChange={e => setFechaEntrega(e.target.value)}
              style={inputSmall}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={anticipo}
                onChange={e => {
                  setAnticipo(e.target.checked)
                  if (!e.target.checked) setAnticipoMonto('')
                }}
                style={{ width: 18, height: 18, accentColor: 'var(--gold)' }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>Anticipo</span>
            </label>
            {anticipo && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 28 }}>
                <span className="eyebrow">Monto del anticipo</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 16, color: 'var(--fg-2)' }}>
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={anticipoMonto}
                    onChange={e => setAnticipoMonto(e.target.value)}
                    placeholder="0.00"
                    style={{ ...inputSmall, flex: 1, maxWidth: 200 }}
                    className="mono"
                    autoFocus
                  />
                </div>
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleFinalizar()}
            disabled={submitting || !canSubmit || !scope}
            style={{
              ...btnPrimary,
              opacity: submitting || !canSubmit || !scope ? 0.5 : 1,
            }}
          >
            {submitting ? 'Guardando…' : 'Finalizar pedido'}
          </button>
        </div>

        {error && (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--crit)' }}>{error}</p>
        )}
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px 32px',
          background: 'var(--bg, #f4f2ee)',
        }}
      >
        {stack.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'var(--fg-3)',
              textAlign: 'center',
              paddingTop: 48,
            }}
          >
            Los pedidos finalizados aparecen aquí abajo.
          </p>
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720, margin: '0 auto' }}
          >
            {stack.map(entry => (
              <PedidoResumenCard
                key={entry.key}
                numero={entry.numero}
                clienteName={entry.clienteName}
                fechaEntrega={entry.fechaEntrega}
                anticipo={entry.anticipo}
                anticipoMonto={entry.anticipoMonto}
                lineas={entry.lineas}
                estado={entry.estado}
                itemsGuardados={entry.itemsGuardados}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inputLarge: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  fontWeight: 500,
  border: '2px solid var(--hairline)',
  borderRadius: 10,
  background: '#fff',
  color: 'var(--fg-0)',
  outline: 'none',
}

const inputSmall: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid var(--hairline)',
  borderRadius: 8,
  background: '#fff',
  color: 'var(--fg-0)',
}

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  background: 'var(--gold)',
  border: 'none',
  borderRadius: 10,
  color: 'var(--ink)',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

const btnLink: React.CSSProperties = {
  marginTop: 8,
  padding: 0,
  background: 'none',
  border: 'none',
  color: 'var(--gold)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnIcon: React.CSSProperties = {
  padding: '8px 0',
  background: 'var(--panel)',
  border: '1px solid var(--hairline)',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  color: 'var(--fg-2)',
}
